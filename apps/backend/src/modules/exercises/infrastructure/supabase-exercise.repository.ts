import { Injectable, Logger } from '@nestjs/common';
import type { ExerciseRepository } from '@schede/exercise-selection';
import type { ExerciseCatalogEntry, ExerciseCatalogMetadata } from '@shared/exerciseClassification';
import { PgUnitOfWork } from '../../../core/supabase/pg-unit-of-work';

interface ExerciseRow {
  id: string;
  slug: string;
  equipment: ExerciseCatalogEntry['equipment'];
  pattern: ExerciseCatalogEntry['movement_pattern'];
  is_unilateral: boolean;
  name: string;
  metadata: ExerciseCatalogMetadata;
}

@Injectable()
export class SupabaseExerciseRepository implements ExerciseRepository {
  private readonly log = new Logger(SupabaseExerciseRepository.name);
  private cache: readonly ExerciseCatalogEntry[] | undefined;

  constructor(private readonly uow: PgUnitOfWork) {}

  async loadCatalog(): Promise<readonly ExerciseCatalogEntry[]> {
    if (this.cache) {
      this.log.log(`[SupabaseExerciseRepository] catalog cache hit size=${this.cache.length}`);
      return this.cache;
    }
    this.log.log('[SupabaseExerciseRepository] catalog load start (DB)');
    const t0 = Date.now();
    const rows = await this.uow.execute(async (tx) => {
      const result = await tx.query<ExerciseRow>(
        `select e.id, e.slug, e.equipment, e.pattern, e.is_unilateral,
                coalesce(et.name, e.slug) as name,
                e.metadata
           from public.exercises e
           left join public.exercise_translations et
             on et.exercise_id = e.id and et.locale = 'it-IT'
          where e.is_custom = false
          order by e.slug asc`,
      );
      return result.rows;
    });
    const ms = Date.now() - t0;
    this.log.log(`[SupabaseExerciseRepository] catalog load end rows=${rows.length} elapsedMs=${ms}`);
    this.cache = rows.map(mapExerciseRow);
    return this.cache;
  }

  async findBySlug(slug: string): Promise<ExerciseCatalogEntry | undefined> {
    const catalog = await this.loadCatalog();
    return catalog.find((e) => e.slug === slug);
  }
}

function mapExerciseRow(row: ExerciseRow): ExerciseCatalogEntry {
  const b = row.metadata.biomechanics;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    primary_muscle: row.metadata.primary_muscle_code,
    secondary_muscles: row.metadata.secondary_muscle_codes,
    movement_pattern: row.pattern,
    equipment: row.equipment,
    difficulty: b.difficulty,
    fatigue_score: b.fatigue_score,
    stimulus_to_fatigue_ratio: b.stimulus_to_fatigue_ratio,
    unilateral: row.is_unilateral,
    bilateral: !row.is_unilateral,
    stability_requirement: b.stability_requirement,
    skill_requirement: b.skill_requirement,
    force_curve: b.force_curve,
    exercise_type: b.exercise_type,
    body_region: row.metadata.body_region,
    tags: row.metadata.tags,
    compatible_goals: row.metadata.compatible_goals,
    injury_risk: b.injury_risk,
    estimated_setup_time_sec: b.estimated_setup_time_sec,
    estimated_session_cost: b.estimated_session_cost,
    tempo_compatibility: b.tempo_compatibility,
  };
}
