import type {
  PerformanceComparison,
  ProgressionRecommendation,
  ReadinessScore,
  StallDecision,
  WorkoutExecutionInput,
  ExercisePerformanceSummary,
} from '../domain/execution.types';
import type { PlannedExercise } from '@schede/workout-generation';

export class ProgressionEngine {
  calculate(
    input: WorkoutExecutionInput,
    comparison: PerformanceComparison,
    readiness: ReadinessScore,
    stall: StallDecision,
  ): readonly ProgressionRecommendation[] {
    return comparison.exerciseSummaries.map((s: ExercisePerformanceSummary) => {
      const planned = input.plannedWorkout.exercises.find((e: PlannedExercise) => e.slug === s.exerciseSlug);
      const firstSet = planned?.sets[0];
      const top = firstSet?.repsMax ?? 10;
      const low = firstSet?.repsMin ?? 6;
      const loadStep = this.loadStepPct(input);

      if (stall.type === 'pain_limited' && stall.affectedExercises.includes(s.exerciseSlug)) {
        return {
          exerciseSlug: s.exerciseSlug,
          nextLoadKg: s.averageLoadKg != null ? roundToIncrement(s.averageLoadKg * 0.9) : undefined,
          nextRepsMin: undefined,
          nextRepsMax: undefined,
          nextRpeTarget: undefined,
          nextRirTarget: undefined,
          setDelta: -1,
          action: 'replace_exercise',
          rationale: 'Pain-limited performance: substitute or regress before overload.',
        };
      }

      if (readiness.band === 'red') {
        return {
          exerciseSlug: s.exerciseSlug,
          nextLoadKg: s.averageLoadKg,
          nextRepsMin: undefined,
          nextRepsMax: undefined,
          nextRpeTarget: undefined,
          nextRirTarget: undefined,
          setDelta: -1,
          action: 'reduce_volume',
          rationale: 'Red readiness: reduce stress exposure and preserve movement practice.',
        };
      }

      if (s.undershotByTwoOrMoreReps || (s.averageRpe ?? 0) >= 9.7) {
        return {
          exerciseSlug: s.exerciseSlug,
          nextLoadKg: s.averageLoadKg != null ? roundToIncrement(s.averageLoadKg * 0.975) : undefined,
          nextRepsMin: low,
          nextRepsMax: top,
          nextRpeTarget: targetRpe(firstSet),
          nextRirTarget: targetRir(firstSet),
          setDelta: stall.type === 'volume_stall' ? -1 : 0,
          action: stall.type === 'volume_stall' ? 'reduce_volume' : 'hold',
          rationale: 'Missed target reps or excessive effort: hold or slightly reduce before progressing.',
        };
      }

      if (input.progressionModel === 'double_progression_reps_then_load') {
        if (s.hitTopOfRepRange && effortAllowsProgression(s)) {
          return {
            exerciseSlug: s.exerciseSlug,
            nextLoadKg: s.averageLoadKg != null ? roundToIncrement(s.averageLoadKg * (1 + loadStep)) : undefined,
            nextRepsMin: low,
            nextRepsMax: top,
            nextRpeTarget: targetRpe(firstSet),
            nextRirTarget: targetRir(firstSet),
            setDelta: 0,
            action: 'increase_load',
            rationale: 'All sets reached top of rep range with acceptable effort: add smallest load jump.',
          };
        }
        return {
          exerciseSlug: s.exerciseSlug,
          nextLoadKg: undefined,
          nextRepsMin: Math.min(top, low + 1),
          nextRepsMax: top,
          nextRpeTarget: undefined,
          nextRirTarget: undefined,
          setDelta: 0,
          action: 'increase_reps',
          rationale: 'Rep target not fully capped: progress reps before load.',
        };
      }

      if (input.progressionModel === 'linear_load_addition' && s.repCompletionRatio >= 0.95 && effortAllowsProgression(s)) {
        return {
          exerciseSlug: s.exerciseSlug,
          nextLoadKg: s.averageLoadKg != null ? roundToIncrement(s.averageLoadKg * (1 + loadStep)) : undefined,
          nextRepsMin: undefined,
          nextRepsMax: undefined,
          nextRpeTarget: undefined,
          nextRirTarget: undefined,
          setDelta: 0,
          action: 'increase_load',
          rationale: 'Linear progression condition met: reps completed at acceptable effort.',
        };
      }

      if (input.progressionModel === 'top_set_rpe_autoregulation') {
        const delta = autoregulatedLoadDelta(s.averageRpe, targetRpe(firstSet));
        return {
          exerciseSlug: s.exerciseSlug,
          nextLoadKg: s.averageLoadKg != null ? roundToIncrement(s.averageLoadKg * (1 + delta)) : undefined,
          nextRepsMin: undefined,
          nextRepsMax: undefined,
          nextRpeTarget: undefined,
          nextRirTarget: undefined,
          setDelta: 0,
          action: delta > 0 ? 'increase_load' : delta < 0 ? 'reduce_load' : 'hold',
          rationale: 'Top-set RPE autoregulation adjusts load from actual vs target effort.',
        };
      }

      return {
        exerciseSlug: s.exerciseSlug,
        nextLoadKg: s.averageLoadKg,
        nextRepsMin: undefined,
        nextRepsMax: undefined,
        nextRpeTarget: undefined,
        nextRirTarget: undefined,
        setDelta: 0,
        action: 'hold',
        rationale: 'No deterministic progression trigger met; hold target and collect another exposure.',
      };
    });
  }

  private loadStepPct(input: WorkoutExecutionInput): number {
    if (input.trainingGoal === 'strength') {
      return input.experienceLevel === 'beginner' ? 0.025 : input.experienceLevel === 'intermediate' ? 0.015 : 0.0075;
    }
    if (input.trainingGoal === 'hypertrophy') return input.experienceLevel === 'beginner' ? 0.02 : 0.01;
    return 0.005;
  }
}

function effortAllowsProgression(s: Pick<ExercisePerformanceSummary, 'averageRpe' | 'averageRir'>): boolean {
  if (s.averageRpe != null && s.averageRpe > 9) return false;
  if (s.averageRir != null && s.averageRir < 0.5) return false;
  return true;
}

function targetRpe(set: { intensity?: { kind: 'rpe' | 'rir'; target: number } } | undefined): number | undefined {
  return set?.intensity?.kind === 'rpe' ? set.intensity.target : undefined;
}

function targetRir(set: { intensity?: { kind: 'rpe' | 'rir'; target: number } } | undefined): number | undefined {
  return set?.intensity?.kind === 'rir' ? set.intensity.target : undefined;
}

function autoregulatedLoadDelta(actualRpe: number | undefined, plannedRpe: number | undefined): number {
  if (actualRpe == null || plannedRpe == null) return 0;
  const diff = actualRpe - plannedRpe;
  if (diff <= -1) return 0.015;
  if (diff <= -0.5) return 0.0075;
  if (diff >= 1) return -0.02;
  if (diff >= 0.5) return -0.01;
  return 0;
}

function roundToIncrement(kg: number, increment = 2.5): number {
  return Math.round(kg / increment) * increment;
}
