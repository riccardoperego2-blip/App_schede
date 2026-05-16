import type {
  MuscleVolumeGroup,
  RecoveryCapacityScore,
  TrainingGoal,
  TrainingHistorySummary,
  VolumeLandmarks,
} from '../domain/generation.types';
import { MUSCLE_VOLUME_GROUPS } from '../domain/generation.types';

export interface VolumeDistributionContext {
  readonly landmarks: Readonly<Record<MuscleVolumeGroup, VolumeLandmarks>>;
  readonly recoveryCapacity: RecoveryCapacityScore;
  readonly trainingGoal: TrainingGoal;
  readonly weakMuscleGroups: readonly MuscleVolumeGroup[];
  readonly priorityMuscleGroups: readonly MuscleVolumeGroup[];
  readonly trainingHistory?: TrainingHistorySummary;
  /** 1.0 = normal week; deload week < 1 */
  readonly volumeMultiplier: number;
}

/**
 * Converts volume landmarks + recovery into **weekly hard-set targets** per muscle group.
 * Deterministic; respects MRV caps and biases weak/priority groups without exceeding MRV.
 */
export function distributeWeeklyVolume(
  ctx: VolumeDistributionContext,
): Readonly<Record<MuscleVolumeGroup, number>> {
  const out = {} as Record<MuscleVolumeGroup, number>;
  const weak = new Set(ctx.weakMuscleGroups);
  const pri = new Set(ctx.priorityMuscleGroups);

  let histScalar = 1;
  if (ctx.trainingHistory) {
    if (ctx.trainingHistory.sessionsLast7Days >= 6) histScalar *= 0.9;
    if ((ctx.trainingHistory.averageSessionRpe ?? 0) >= 8.5) histScalar *= 0.94;
    if (ctx.trainingHistory.consecutiveTrainingWeeks >= 8) histScalar *= 0.96;
  }

  for (const g of MUSCLE_VOLUME_GROUPS) {
    const lm = ctx.landmarks[g];
    const anchor = anchorFromGoal(ctx.trainingGoal, lm);
    const t = (ctx.recoveryCapacity - 1) / 4;
    let sets = Math.round(lm.mev + t * (anchor - lm.mev));
    sets = Math.min(lm.mrv, Math.max(lm.mev, sets));
    if (weak.has(g)) sets = Math.round(sets * 1.1);
    if (pri.has(g)) sets = Math.round(sets * 1.15);
    sets = Math.min(lm.mrv, sets);
    sets = Math.round(sets * histScalar * ctx.volumeMultiplier);
    sets = Math.max(lm.mev > 0 ? lm.mev : 0, sets);
    out[g] = sets;
  }
  return out;
}

function anchorFromGoal(goal: TrainingGoal, lm: VolumeLandmarks): number {
  if (goal === 'strength') return lm.mavLow + (lm.mavHigh - lm.mavLow) * 0.25;
  if (goal === 'fat_loss') return lm.mavLow + (lm.mavHigh - lm.mavLow) * 0.45;
  if (goal === 'rehab') return lm.mavLow;
  if (goal === 'general') return lm.mavLow + (lm.mavHigh - lm.mavLow) * 0.55;
  return lm.mavLow + (lm.mavHigh - lm.mavLow) * 0.72;
}
