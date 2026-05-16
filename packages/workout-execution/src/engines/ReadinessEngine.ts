import type { ReadinessScore, WorkoutExecutionInput } from '../domain/execution.types';

/** Deterministic daily readiness model: 100 = fully ready, lower = reduce stress. */
export class ReadinessEngine {
  evaluate(input: WorkoutExecutionInput): ReadinessScore {
    const modifiers: Record<string, number> = {};
    modifiers.sleep = clamp((input.sleepQuality - 7) * 4, -20, 12);
    modifiers.soreness = -Math.max(0, input.soreness - 4) * 4;
    modifiers.subjectiveFatigue = -Math.max(0, input.fatigueLevel - 4) * 5;
    modifiers.adherence = (input.adherenceScore - 0.85) * 14;

    const rhr = input.userRecoveryMetrics.restingHeartRateDelta;
    if (rhr != null) modifiers.restingHeartRate = rhr > 0 ? -Math.min(18, rhr * 1.8) : 4;

    const hrv = input.userRecoveryMetrics.hrvDeltaPct;
    if (hrv != null) modifiers.hrv = hrv < 0 ? Math.max(-18, hrv * 0.6) : Math.min(8, hrv * 0.25);

    const stress = input.userRecoveryMetrics.stressLevel;
    if (stress != null) modifiers.stress = -Math.max(0, stress - 5) * 3;

    const appetite = input.userRecoveryMetrics.appetiteScore;
    if (appetite != null && appetite <= 2) modifiers.appetite = -8;

    if (input.bodyWeightTrend.direction === 'down' && input.bodyWeightTrend.weeklyChangePct > 1.25) {
      modifiers.bodyWeightCut = -8;
    }

    const score = clamp(
      78 + Object.values(modifiers).reduce((a, v) => a + v, 0),
      0,
      100,
    );

    return {
      score,
      band: score >= 78 ? 'green' : score >= 62 ? 'yellow' : score >= 45 ? 'orange' : 'red',
      modifiers,
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10));
}
