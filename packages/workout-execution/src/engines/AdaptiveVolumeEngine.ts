import type {
  AdaptiveVolumeDecision,
  PerformanceComparison,
  ReadinessScore,
  RecoveryAnalysis,
  StallDecision,
  WorkoutExecutionInput,
} from '../domain/execution.types';
import type { MuscleVolumeGroup, PlannedExercise } from '@schede/workout-generation';

export class AdaptiveVolumeEngine {
  adapt(
    input: WorkoutExecutionInput,
    comparison: PerformanceComparison,
    readiness: ReadinessScore,
    recovery: RecoveryAnalysis,
    stall: StallDecision,
  ): readonly AdaptiveVolumeDecision[] {
    const groups = new Set<MuscleVolumeGroup>();
    for (const ex of input.plannedWorkout.exercises) {
      if (isVolumeGroup(ex.primaryMuscle)) groups.add(ex.primaryMuscle);
    }

    return [...groups].sort().map((g) => {
      const summaries = comparison.exerciseSummaries.filter((s) => {
        const planned = input.plannedWorkout.exercises.find((e: PlannedExercise) => e.slug === s.exerciseSlug);
        return planned?.primaryMuscle === g;
      });

      const completion =
        summaries.reduce((a, s) => a + s.completedSets / Math.max(1, s.targetSets), 0) /
        Math.max(1, summaries.length);
      const pain = summaries.some((s) => s.painMax >= 6);

      if (pain || stall.affectedMuscles.includes(g)) {
        return {
          muscleGroup: g,
          setDelta: -2,
          frequencyDelta: 0,
          rationale: 'Pain/stall in this tissue bucket: reduce local hard sets.',
        };
      }

      if (readiness.band === 'red' || recovery.limitingFactors.length >= 3) {
        return {
          muscleGroup: g,
          setDelta: -1,
          frequencyDelta: 0,
          rationale: 'Systemic recovery is poor: reduce volume without changing exercise skill exposure yet.',
        };
      }

      if (completion >= 0.98 && comparison.volumeProgressionSignal === 'up' && readiness.band === 'green') {
        return {
          muscleGroup: g,
          setDelta: 1,
          frequencyDelta: 0,
          rationale: 'High completion and green readiness: add one hard set for adaptive overload.',
        };
      }

      if (completion < 0.8) {
        return {
          muscleGroup: g,
          setDelta: -1,
          frequencyDelta: 0,
          rationale: 'Low set completion: volume exceeds current execution capacity.',
        };
      }

      return {
        muscleGroup: g,
        setDelta: 0,
        frequencyDelta: 0,
        rationale: 'Volume is appropriate; hold dose.',
      };
    });
  }
}

function isVolumeGroup(x: string): x is MuscleVolumeGroup {
  return [
    'chest',
    'upper_back',
    'lower_back',
    'quads',
    'hamstrings',
    'glutes',
    'delts_anterior',
    'delts_lateral',
    'delts_posterior',
    'biceps',
    'triceps',
    'forearms',
    'calves',
    'core',
  ].includes(x);
}
