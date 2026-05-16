import { Injectable, Logger } from '@nestjs/common';
import type { GeneratedWorkoutPlan, PlannedExercise } from '@schede/workout-generation';
import type { DbExecutor } from '../../../core/supabase/pg-unit-of-work';

export interface ActivePlanDaySummary {
  readonly workoutDayId: string;
  readonly dayIndex: number;
  readonly dayLabel: string;
  readonly exerciseCount: number;
  readonly estimatedDurationMin: number;
}

export interface ActivePlanWeekSummary {
  readonly weekNumber: number;
  readonly name: string;
  readonly isDeload: boolean;
  readonly days: ActivePlanDaySummary[];
}

export interface ActivePlanFull {
  readonly planId: string;
  readonly versionId: string;
  readonly name: string;
  readonly weeks: ActivePlanWeekSummary[];
}

@Injectable()
export class PlanRepository {
  private readonly log = new Logger(PlanRepository.name);

  /**
   * `workout_plans.owner_user_id` references `public.profiles`. Auth users created before
   * the `handle_new_user` trigger may lack a profile row — ensure one exists before insert.
   */
  async ensureProfile(
    tx: DbExecutor,
    userId: string,
    hints?: { displayName?: string | null; avatarUrl?: string | null },
  ): Promise<void> {
    const displayName = hints?.displayName?.trim() || 'Athlete';
    await tx.query(
      `insert into public.profiles (id, display_name, avatar_url)
       values ($1, $2, $3)
       on conflict (id) do nothing`,
      [userId, displayName, hints?.avatarUrl ?? null],
    );
  }

  async saveGeneratedPlan(
    tx: DbExecutor,
    userId: string,
    plan: GeneratedWorkoutPlan,
  ): Promise<{ planId: string; versionId: string }> {
    this.log.log('[PlanRepository] insert plan start');
    const planId = await insertReturningId(
      tx,
      `insert into public.workout_plans
        (owner_user_id, name, description, status, source, metadata)
       values ($1, $2, $3, 'active', 'manual', $4::jsonb)
       returning id`,
      [
        userId,
        `${plan.trainingGoal} ${plan.split}`,
        `Generated ${plan.trainingGoal} plan`,
        JSON.stringify({ engineVersion: plan.version, fatigueReport: plan.fatigueReport, recoveryReport: plan.recoveryReport }),
      ],
    );
    this.log.log(`[PlanRepository] insert plan end id=${planId}`);

    this.log.log('[PlanRepository] insert version start');
    const versionId = await insertReturningId(
      tx,
      `insert into public.workout_plan_versions
        (plan_id, version_number, status, is_current, changelog, metadata, published_at)
       values ($1, 1, 'active', true, $2, $3::jsonb, timezone('utc', now()))
       returning id`,
      [planId, 'Initial deterministic generation', JSON.stringify({ progression: plan.progression })],
    );
    this.log.log(`[PlanRepository] insert version end id=${versionId}`);

    for (const week of plan.weeks) {
      this.log.log(`[PlanRepository] insert week start index=${week.weekIndex}`);
      const weekId = await insertReturningId(
        tx,
        `insert into public.workout_weeks (version_id, week_index, name, metadata)
         values ($1, $2, $3, $4::jsonb) returning id`,
        [versionId, week.weekIndex, `Week ${week.weekIndex}`, JSON.stringify({ isDeload: week.isDeload, deload: week.deload })],
      );
      this.log.log(`[PlanRepository] insert week end id=${weekId}`);

      for (const day of week.days) {
        this.log.log(`[PlanRepository] insert day start week=${week.weekIndex} day=${day.dayIndex}`);
        const dayId = await insertReturningId(
          tx,
          `insert into public.workout_days (week_id, day_index, name, metadata)
           values ($1, $2, $3, $4::jsonb) returning id`,
          [weekId, day.dayIndex + 1, day.label, JSON.stringify({ focusMuscleGroups: day.focusMuscleGroups })],
        );
        this.log.log(`[PlanRepository] insert day end id=${dayId}`);

        for (const exercise of day.exercises) {
          this.log.log(`[PlanRepository] insert exercises+sets start day=${dayId} slug=${exercise.slug}`);
          await this.insertExercise(tx, dayId, exercise);
          this.log.log(`[PlanRepository] insert exercises+sets end slug=${exercise.slug}`);
        }
      }
    }

    this.log.log(`[PlanRepository] saveGeneratedPlan complete weeks=${plan.weeks.length}`);
    return { planId, versionId };
  }

  async findActivePlanForUser(
    tx: DbExecutor,
    userId: string,
  ): Promise<{ planId: string; versionId: string } | null> {
    const r = await tx.query<{ plan_id: string; version_id: string }>(
      `select p.id as plan_id, v.id as version_id
         from public.workout_plans p
         join public.workout_plan_versions v on v.plan_id = p.id and v.is_current = true
        where p.owner_user_id = $1 and p.status = 'active'
        limit 1`,
      [userId],
    );
    const row = r.rows[0];
    return row ? { planId: row.plan_id, versionId: row.version_id } : null;
  }

  async loadActivePlanFull(tx: DbExecutor, userId: string): Promise<ActivePlanFull | null> {
    const active = await this.findActivePlanForUser(tx, userId);
    if (!active) return null;

    const planRow = await tx.query<{ name: string }>(
      `select name from public.workout_plans where id = $1 and owner_user_id = $2`,
      [active.planId, userId],
    );
    const planName = planRow.rows[0]?.name ?? 'Programma';

    const rows = await tx.query<{
      week_index: number;
      week_name: string;
      week_metadata: { isDeload?: boolean } | null;
      workout_day_id: string;
      day_index: number;
      day_label: string;
      exercise_count: string;
    }>(
      `select wk.week_index,
              wk.name as week_name,
              wk.metadata as week_metadata,
              d.id as workout_day_id,
              d.day_index,
              d.name as day_label,
              (select count(*)::text from public.workout_exercises we where we.day_id = d.id) as exercise_count
         from public.workout_weeks wk
         join public.workout_days d on d.week_id = wk.id
        where wk.version_id = $1
        order by wk.week_index asc, d.day_index asc`,
      [active.versionId],
    );

    const weeksMap = new Map<
      number,
      { weekNumber: number; name: string; isDeload: boolean; days: ActivePlanDaySummary[] }
    >();
    for (const row of rows.rows) {
      const exerciseCount = Number(row.exercise_count ?? 0);
      const estimatedDurationMin = Math.max(25, Math.min(120, exerciseCount * 7));
      const day: ActivePlanDaySummary = {
        workoutDayId: row.workout_day_id,
        dayIndex: row.day_index,
        dayLabel: row.day_label,
        exerciseCount,
        estimatedDurationMin,
      };

      const existing = weeksMap.get(row.week_index);
      if (existing) {
        existing.days.push(day);
        continue;
      }

      weeksMap.set(row.week_index, {
        weekNumber: row.week_index,
        name: row.week_name,
        isDeload: Boolean(row.week_metadata?.isDeload),
        days: [day],
      });
    }

    return {
      planId: active.planId,
      versionId: active.versionId,
      name: planName,
      weeks: [...weeksMap.values()],
    };
  }

  private async insertExercise(tx: DbExecutor, dayId: string, exercise: PlannedExercise): Promise<void> {
    const exerciseId = await lookupExerciseId(tx, exercise.slug);
    const workoutExerciseId = await insertReturningId(
      tx,
      `insert into public.workout_exercises
        (day_id, exercise_id, position, prescription, coach_notes)
       values ($1, $2, $3, $4::jsonb, $5)
       returning id`,
      [
        dayId,
        exerciseId,
        exercise.order,
        JSON.stringify({
          slotRole: exercise.slotRole,
          movementPattern: exercise.movementPattern,
          primaryMuscle: exercise.primaryMuscle,
          progressionHint: exercise.progressionHint,
        }),
        exercise.progressionHint,
      ],
    );

    for (const set of exercise.sets) {
      await tx.query(
        `insert into public.workout_sets
          (workout_exercise_id, set_index, target_reps_min, target_reps_max, target_rpe, rest_seconds, metadata)
         values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        [
          workoutExerciseId,
          set.setIndex,
          set.repsMin,
          set.repsMax,
          set.intensity.kind === 'rpe' ? set.intensity.target : null,
          set.restSeconds,
          JSON.stringify({ intensity: set.intensity }),
        ],
      );
    }
  }
}

async function insertReturningId(tx: DbExecutor, sql: string, params: readonly unknown[]): Promise<string> {
  const result = await tx.query<{ id: string }>(sql, params);
  return result.rows[0]!.id;
}

async function lookupExerciseId(tx: DbExecutor, slug: string): Promise<string> {
  const result = await tx.query<{ id: string }>('select id from public.exercises where slug = $1', [slug]);
  if (!result.rows[0]) throw new Error(`Exercise not found: ${slug}`);
  return result.rows[0].id;
}
