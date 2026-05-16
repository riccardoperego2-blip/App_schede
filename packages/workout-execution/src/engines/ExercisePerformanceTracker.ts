import type {
  CompletedSetLog,
  ExerciseLog,
  ExercisePerformanceSummary,
  PerformanceComparison,
  PlannedExerciseWithGroup,
  WorkoutExecutionInput,
} from '../domain/execution.types';
import type { PlannedSet } from '@schede/workout-generation';

export class ExercisePerformanceTracker {
  compareTargetVsPerformance(input: WorkoutExecutionInput): PerformanceComparison {
    const summaries = input.plannedWorkout.exercises.map((planned: PlannedExerciseWithGroup) =>
      this.summarizeExercise(planned, input.exerciseLogs.find((l) => l.exerciseSlug === planned.slug)),
    );

    const targetExerciseCount = input.plannedWorkout.exercises.length || 1;
    const sessionCompletionRatio =
      summaries.reduce((a: number, s: ExercisePerformanceSummary) => a + s.completedSets / Math.max(1, s.targetSets), 0) /
      targetExerciseCount;

    const loadProgressionSignal = inferLoadTrend(summaries);
    const volumeProgressionSignal = inferVolumeTrend(summaries);
    const regressionDetected =
      sessionCompletionRatio < 0.85 ||
      summaries.some((s) => s.undershotByTwoOrMoreReps || s.painMax >= 6);

    return {
      exerciseSummaries: summaries,
      sessionCompletionRatio,
      loadProgressionSignal,
      volumeProgressionSignal,
      regressionDetected,
    };
  }

  private summarizeExercise(
    planned: PlannedExerciseWithGroup,
    log: ExerciseLog | undefined,
  ): ExercisePerformanceSummary {
    const plannedSets = planned.sets;
    const loggedSets = log?.sets ?? [];
    const targetSets = plannedSets.length;
    const completedSets = loggedSets.filter((s: CompletedSetLog) => s.completed).length;
    const prescribedRepTotal = plannedSets.reduce((a: number, s: PlannedSet) => a + s.repsMin, 0);
    const completedRepTotal = loggedSets.reduce((a: number, s: CompletedSetLog) => a + s.completedReps, 0);
    const loaded = loggedSets.filter((s: CompletedSetLog) => s.loadKg != null);
    const averageLoadKg = loaded.length
      ? round(loaded.reduce((a: number, s: CompletedSetLog) => a + (s.loadKg ?? 0), 0) / loaded.length)
      : undefined;
    const volumeKg = round(loggedSets.reduce((a: number, s: CompletedSetLog) => a + s.completedReps * (s.loadKg ?? 0), 0));
    const averageRpe = averageDefined(loggedSets.map((s) => s.actualRpe));
    const averageRir = averageDefined(loggedSets.map((s) => s.actualRir));
    const estimated1RmKg = estimateBest1Rm(loggedSets);
    const painMax = Math.max(0, ...loggedSets.map((s) => s.painScore ?? 0));
    const allTopRange =
      loggedSets.length >= targetSets &&
      loggedSets.every((s) => s.completed && s.completedReps >= s.targetRepsMax);
    const undershot =
      loggedSets.length > 0 &&
      loggedSets.some((s) => s.completedReps <= Math.max(0, s.targetRepsMin - 2));

    return {
      exerciseSlug: planned.slug,
      targetSets,
      completedSets,
      prescribedRepTotal,
      completedRepTotal,
      repCompletionRatio: completedRepTotal / Math.max(1, prescribedRepTotal),
      averageLoadKg,
      estimated1RmKg,
      volumeKg,
      averageRpe,
      averageRir,
      painMax,
      hitTopOfRepRange: allTopRange,
      undershotByTwoOrMoreReps: undershot,
    };
  }
}

function inferLoadTrend(summaries: readonly ExercisePerformanceSummary[]) {
  const strong = summaries.filter((s) => s.hitTopOfRepRange && (s.averageRpe ?? 8) <= 8.5).length;
  const weak = summaries.filter((s) => s.undershotByTwoOrMoreReps || (s.averageRpe ?? 0) >= 9.5).length;
  if (strong >= Math.max(1, Math.ceil(summaries.length * 0.45))) return 'up' as const;
  if (weak >= Math.max(1, Math.ceil(summaries.length * 0.35))) return 'down' as const;
  return 'flat' as const;
}

function inferVolumeTrend(summaries: readonly ExercisePerformanceSummary[]) {
  const completion = summaries.reduce((a, s) => a + s.completedSets / Math.max(1, s.targetSets), 0) /
    Math.max(1, summaries.length);
  if (completion >= 0.96) return 'up' as const;
  if (completion < 0.85) return 'down' as const;
  return 'flat' as const;
}

function estimateBest1Rm(sets: readonly { loadKg?: number; completedReps: number }[]): number | undefined {
  const estimates = sets
    .filter((s) => s.loadKg != null && s.completedReps > 0)
    .map((s) => (s.loadKg ?? 0) * (1 + s.completedReps / 30));
  return estimates.length ? round(Math.max(...estimates)) : undefined;
}

function averageDefined(values: readonly (number | undefined)[]): number | undefined {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? round(nums.reduce((a, v) => a + v, 0) / nums.length) : undefined;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
