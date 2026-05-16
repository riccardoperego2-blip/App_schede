import type { ExerciseCatalogEntry, MovementPattern } from '../../../../shared/exerciseClassification';
import type {
  SelectionEngineConfig,
  SelectionInput,
  SelectedExerciseSlot,
  SelectionTraceEntry,
  SlotRole,
  WorkoutSelectionResult,
} from '../domain/selection.types';
import { FatigueCalculator } from './FatigueCalculator';
import { MovementPatternBalancer } from './MovementPatternBalancer';
import { OverlapDetectionSystem } from './OverlapDetectionSystem';
import { ExerciseScoringEngine } from './ExerciseScoringEngine';

/**
 * Greedy **constraint solver**: fills ordered slots under time + systemic fatigue caps.
 * Non-random: strictly sorted by `ExerciseScoringEngine.compareDeterministic`.
 */
export class SessionConstraintSolver {
  constructor(
    private readonly config: SelectionEngineConfig,
    private readonly fatigue: FatigueCalculator,
    private readonly overlap: OverlapDetectionSystem,
    private readonly patterns: MovementPatternBalancer,
    private readonly scoring: ExerciseScoringEngine,
  ) {}

  solve(
    input: SelectionInput,
    catalog: readonly ExerciseCatalogEntry[],
  ): WorkoutSelectionResult {
    const trace: SelectionTraceEntry[] = [];
    const axialTag = this.config.overlap.axialLoadTag;
    const cap = this.config.fatigue.systemicFatigueCapByExperience[input.experienceLevel];

    const workBudget =
      Math.max(
        12,
        input.sessionDurationMinutes -
          this.config.warmupReserveMinutes -
          this.config.defaultWorkBlockMinutes * 0.25,
      );

    const estMinutes = (ex: ExerciseCatalogEntry) =>
      this.config.defaultWorkBlockMinutes + ex.estimated_setup_time_sec / 60;

    const maxSlots = Math.max(
      3,
      Math.floor(workBudget / (this.config.defaultWorkBlockMinutes * 0.85)),
    );

    const slotsPlan = this.buildSlotPlan(maxSlots);

    const selected: ExerciseCatalogEntry[] = [];
    const resultSlots: SelectedExerciseSlot[] = [];
    let patternHistogram: Partial<Record<MovementPattern, number>> = {};

    for (const { role } of slotsPlan) {
      const pool = catalog.filter((ex) => this.roleFilter(ex, role));
      const scored = pool
        .map((ex) =>
          this.scoring.score(ex, {
            input,
            role,
            selectedSoFar: selected,
            patternHistogram,
          }),
        )
        .filter((s) => s.totalScore > -1e8)
        .sort((a, b) => this.scoring.compareDeterministic(a, b));

      let picked: (typeof scored)[0] | undefined;
      for (const s of scored) {
        if (this.overlap.hasHardConflict(s.exercise, { selected })) continue;
        if (this.fatigue.wouldExceedCap(selected, s.exercise, cap, axialTag)) continue;
        picked = s;
        break;
      }

      if (!picked) {
        trace.push({
          phase: `slot_unfilled_${role}`,
          slug: '',
          reason: 'no_feasible_candidate_under_fatigue_overlap_filters',
          score: 0,
        });
        continue;
      }

      selected.push(picked.exercise);
      patternHistogram = this.patterns.mergeHistogram(
        patternHistogram,
        picked.exercise.movement_pattern,
      );
      resultSlots.push({
        role,
        exercise: picked.exercise,
        score: picked,
        estimatedMinutes: estMinutes(picked.exercise),
      });
      trace.push({
        phase: `pick_${role}`,
        slug: picked.exercise.slug,
        reason: 'highest_feasible_score',
        score: picked.totalScore,
      });
    }

    const fatigueReport = this.fatigue.buildReport(selected, axialTag);

    return {
      slots: resultSlots,
      totalSystemicFatigue: fatigueReport.systemicEstimate,
      patternHistogram: this.patterns.fromExercises(selected),
      fatigueReport,
      trace,
    };
  }

  private buildSlotPlan(n: number): { role: SlotRole }[] {
    const plan: { role: SlotRole }[] = [];
    const { primary, complementary } = this.config.slotMix;
    const pCount = Math.max(1, Math.round(n * primary));
    const cCount = Math.max(1, Math.round(n * complementary));
    const iCount = Math.max(1, n - pCount - cCount);
    for (let i = 0; i < pCount; i++) plan.push({ role: 'primary' });
    for (let i = 0; i < cCount; i++) plan.push({ role: 'complementary' });
    for (let i = 0; i < iCount; i++) plan.push({ role: 'isolation' });
    return plan.slice(0, n);
  }

  private roleFilter(ex: ExerciseCatalogEntry, role: SlotRole): boolean {
    const bigPatterns = new Set([
      'squat',
      'hinge',
      'horizontal_push',
      'vertical_push',
      'horizontal_pull',
      'vertical_pull',
    ]);
    if (role === 'primary') {
      return ex.exercise_type === 'compound' && bigPatterns.has(ex.movement_pattern);
    }
    if (role === 'complementary') {
      if (ex.exercise_type === 'compound' && bigPatterns.has(ex.movement_pattern)) return true;
      if (ex.exercise_type === 'carry') return true;
      if (ex.exercise_type === 'plyometric' && ex.body_region === 'lower') return true;
      return false;
    }
    return (
      ex.exercise_type === 'isolation' ||
      ex.exercise_type === 'isometric' ||
      ex.exercise_type === 'conditioning'
    );
  }
}
