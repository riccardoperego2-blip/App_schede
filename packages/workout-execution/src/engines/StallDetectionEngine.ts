import type {
  FatigueAccumulation,
  PerformanceComparison,
  ReadinessScore,
  StallDecision,
  WorkoutExecutionInput,
} from '../domain/execution.types';
import type { MuscleVolumeGroup, PlannedExercise } from '@schede/workout-generation';

export class StallDetectionEngine {
  detect(
    input: WorkoutExecutionInput,
    comparison: PerformanceComparison,
    readiness: ReadinessScore,
    fatigue: FatigueAccumulation,
  ): StallDecision {
    const painful = comparison.exerciseSummaries.filter((s) => s.painMax >= 6);
    if (painful.length) {
      return {
        type: 'pain_limited',
        affectedExercises: painful.map((s) => s.exerciseSlug),
        affectedMuscles: uniqueMuscles(input, painful.map((s) => s.exerciseSlug)),
        severity: 'major',
        rationale: 'Pain score >= 6: replace or regress exercise before loading progression.',
      };
    }

    if (readiness.band === 'red' || fatigue.overreachingRisk === 'red') {
      return {
        type: 'systemic_fatigue_limited',
        affectedExercises: comparison.exerciseSummaries.map((s) => s.exerciseSlug),
        affectedMuscles: uniqueMuscles(input, comparison.exerciseSummaries.map((s) => s.exerciseSlug)),
        severity: 'major',
        rationale: 'Readiness or fatigue accumulation indicates high overreaching risk.',
      };
    }

    const failed = comparison.exerciseSummaries.filter((s) => s.undershotByTwoOrMoreReps);
    const recentRegression = input.workoutHistory.recentSessions.slice(-3).filter((s) => (s.sessionRpe ?? 0) >= 9).length >= 2;
    if (failed.length >= 2 && recentRegression) {
      return {
        type: 'volume_stall',
        affectedExercises: failed.map((s) => s.exerciseSlug),
        affectedMuscles: uniqueMuscles(input, failed.map((s) => s.exerciseSlug)),
        severity: 'moderate',
        rationale: 'Repeated high-RPE sessions plus missed reps suggest local volume exceeds recoverability.',
      };
    }

    const loadFlat = comparison.loadProgressionSignal === 'flat';
    const oldFlat = input.workoutHistory.exerciseHistory.slice(-4).every((h) => h.failedSets > 0 || (h.averageRpe ?? 0) >= 9);
    if (loadFlat && oldFlat) {
      return {
        type: 'load_stall',
        affectedExercises: comparison.exerciseSummaries.map((s) => s.exerciseSlug),
        affectedMuscles: uniqueMuscles(input, comparison.exerciseSummaries.map((s) => s.exerciseSlug)),
        severity: 'moderate',
        rationale: 'Load has not moved with persistent high effort markers.',
      };
    }

    if (comparison.regressionDetected) {
      return {
        type: 'single_session_miss',
        affectedExercises: failed.map((s) => s.exerciseSlug),
        affectedMuscles: uniqueMuscles(input, failed.map((s) => s.exerciseSlug)),
        severity: 'minor',
        rationale: 'One-session miss: hold targets unless recovery markers are poor.',
      };
    }

    return {
      type: 'none',
      affectedExercises: [],
      affectedMuscles: [],
      severity: 'info',
      rationale: 'No material stall detected.',
    };
  }
}

function uniqueMuscles(input: WorkoutExecutionInput, slugs: readonly string[]) {
  const set = new Set(slugs);
  const muscles = input.plannedWorkout.exercises
    .filter((e: PlannedExercise) => set.has(e.slug))
    .map((e: PlannedExercise) => e.primaryMuscle)
    .filter((m: string): m is MuscleVolumeGroup =>
      (input.plannedWorkout.focusMuscleGroups as readonly string[]).includes(m),
    );
  return [...new Set(muscles)];
}
