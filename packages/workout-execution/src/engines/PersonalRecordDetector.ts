import type { PersonalRecord, WorkoutExecutionInput } from '../domain/execution.types';

export class PersonalRecordDetector {
  detect(input: WorkoutExecutionInput): readonly PersonalRecord[] {
    const prs: PersonalRecord[] = [];
    for (const log of input.exerciseLogs) {
      const history = input.workoutHistory.exerciseHistory.filter((h) => h.exerciseSlug === log.exerciseSlug);
      const previous1Rm = maxDefined(history.map((h) => h.bestEstimated1RmKg));
      const previousLoad = maxDefined(history.map((h) => h.bestLoadKg));
      const previousVolume = history.length ? Math.max(...history.map((h) => h.totalVolumeKg)) : undefined;

      const estimated1Rm = bestEstimated1Rm(log.sets);
      if (estimated1Rm != null && (previous1Rm == null || estimated1Rm > previous1Rm * 1.005)) {
        prs.push({
          exerciseSlug: log.exerciseSlug,
          type: 'estimated_1rm',
          value: round(estimated1Rm),
          previousValue: previous1Rm,
          unit: 'kg',
        });
      }

      const bestLoad = maxDefined(log.sets.map((s) => s.loadKg));
      if (bestLoad != null && (previousLoad == null || bestLoad > previousLoad)) {
        prs.push({
          exerciseSlug: log.exerciseSlug,
          type: 'max_weight_single',
          value: bestLoad,
          previousValue: previousLoad,
          unit: 'kg',
        });
      }

      const volume = log.sets.reduce((a, s) => a + s.completedReps * (s.loadKg ?? 0), 0);
      if (volume > 0 && (previousVolume == null || volume > previousVolume * 1.02)) {
        prs.push({
          exerciseSlug: log.exerciseSlug,
          type: 'session_volume',
          value: round(volume),
          previousValue: previousVolume,
          unit: 'kg_volume',
        });
      }
    }
    return prs.sort((a, b) => a.exerciseSlug.localeCompare(b.exerciseSlug) || a.type.localeCompare(b.type));
  }
}

function bestEstimated1Rm(sets: readonly { loadKg?: number; completedReps: number }[]): number | undefined {
  return maxDefined(sets.filter((s) => s.loadKg != null).map((s) => (s.loadKg ?? 0) * (1 + s.completedReps / 30)));
}

function maxDefined(values: readonly (number | undefined)[]): number | undefined {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? Math.max(...nums) : undefined;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
