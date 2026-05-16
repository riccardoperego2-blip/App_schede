import type { DeloadDecision, DeloadStrategy, TrainingGoal } from '../domain/generation.types';

export interface DeloadContext {
  readonly weekIndex: number;
  readonly mesocycleWeeks: number;
  readonly trainingGoal: TrainingGoal;
  readonly consecutiveHardWeeks: number;
}

/**
 * Deload policy: final mesocycle week OR forced if consecutive hard weeks high.
 * Deterministic volume/intensity multipliers.
 */
export class DeloadEngine {
  decide(ctx: DeloadContext): DeloadDecision {
    const isScheduledDeload = ctx.weekIndex === ctx.mesocycleWeeks;
    const forcedEarly =
      ctx.consecutiveHardWeeks >= 12 && ctx.weekIndex === ctx.mesocycleWeeks - 1 && ctx.mesocycleWeeks > 3;

    if (!isScheduledDeload && !forcedEarly) {
      return {
        strategy: 'none',
        volumeMultiplier: 1,
        intensityMultiplier: 1,
        frequencyPreserved: true,
      };
    }

    const strategy: DeloadStrategy =
      ctx.trainingGoal === 'strength'
        ? 'frequency_preserved_intensity_drop'
        : ctx.trainingGoal === 'hypertrophy'
          ? 'volume_reduction_50'
          : 'volume_reduction_40';

    if (strategy === 'frequency_preserved_intensity_drop') {
      return {
        strategy,
        volumeMultiplier: 0.55,
        intensityMultiplier: 0.88,
        frequencyPreserved: true,
      };
    }
    if (strategy === 'volume_reduction_50') {
      return {
        strategy,
        volumeMultiplier: 0.5,
        intensityMultiplier: 0.92,
        frequencyPreserved: true,
      };
    }
    return {
      strategy: 'volume_reduction_40',
      volumeMultiplier: 0.6,
      intensityMultiplier: 0.9,
      frequencyPreserved: true,
    };
  }

  applyVolumeMultiplier(
    weekly: Readonly<Record<string, number>>,
    mult: number,
  ): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(weekly)) {
      out[k] = Math.max(0, Math.round(v * mult));
    }
    return out;
  }
}
