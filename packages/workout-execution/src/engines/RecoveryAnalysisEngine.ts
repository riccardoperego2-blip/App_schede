import type { ReadinessScore, RecoveryAnalysis, WorkoutExecutionInput } from '../domain/execution.types';

export class RecoveryAnalysisEngine {
  analyze(input: WorkoutExecutionInput, readiness: ReadinessScore): RecoveryAnalysis {
    const limitingFactors: string[] = [];
    if (input.sleepQuality < 6) limitingFactors.push('sleep_quality');
    if (input.soreness >= 7) limitingFactors.push('high_soreness');
    if (input.fatigueLevel >= 7) limitingFactors.push('subjective_fatigue');
    if ((input.userRecoveryMetrics.hrvDeltaPct ?? 0) <= -12) limitingFactors.push('hrv_suppressed');
    if ((input.userRecoveryMetrics.restingHeartRateDelta ?? 0) >= 7) limitingFactors.push('rhr_elevated');
    if (input.adherenceScore < 0.75) limitingFactors.push('low_adherence');

    let bodyWeightNote: string | undefined;
    if (input.bodyWeightTrend.direction === 'down' && input.bodyWeightTrend.weeklyChangePct > 1) {
      bodyWeightNote = 'Rapid weight loss: cap volume and avoid aggressive progression.';
      limitingFactors.push('rapid_weight_loss');
    }
    if (input.trainingGoal === 'fat_loss' && input.bodyWeightTrend.direction === 'up') {
      bodyWeightNote = 'Fat-loss phase with rising body weight: keep performance targets but review nutrition.';
    }

    return {
      recoveryScore: readiness.score,
      limitingFactors,
      bodyWeightNote,
    };
  }
}
