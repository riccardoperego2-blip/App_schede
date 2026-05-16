import type {
  DeloadDecisionExecution,
  FatigueAccumulation,
  PerformanceComparison,
  ReadinessScore,
  StallDecision,
  WorkoutExecutionInput,
} from '../domain/execution.types';

export class DeloadDecisionEngine {
  decide(
    input: WorkoutExecutionInput,
    readiness: ReadinessScore,
    fatigue: FatigueAccumulation,
    comparison: PerformanceComparison,
    stall: StallDecision,
  ): DeloadDecisionExecution {
    if (stall.type === 'pain_limited') {
      return {
        shouldDeload: true,
        trigger: 'pain',
        volumeMultiplier: 0.55,
        intensityMultiplier: 0.85,
        durationDays: 7,
      };
    }

    if (readiness.band === 'red') {
      return {
        shouldDeload: true,
        trigger: 'readiness_red',
        volumeMultiplier: 0.55,
        intensityMultiplier: input.trainingGoal === 'strength' ? 0.88 : 0.9,
        durationDays: 5,
      };
    }

    if (fatigue.overreachingRisk === 'red' || fatigue.strain >= 850) {
      return {
        shouldDeload: true,
        trigger: 'overreaching_risk',
        volumeMultiplier: 0.5,
        intensityMultiplier: 0.88,
        durationDays: 7,
      };
    }

    const recentBad = input.workoutHistory.recentSessions.slice(-3).filter((s) => (s.sessionRpe ?? 0) >= 9).length;
    if (comparison.regressionDetected && recentBad >= 2) {
      return {
        shouldDeload: true,
        trigger: 'multi_session_regression',
        volumeMultiplier: 0.65,
        intensityMultiplier: 0.92,
        durationDays: 5,
      };
    }

    if (stall.type === 'load_stall' || stall.type === 'volume_stall') {
      return {
        shouldDeload: input.experienceLevel !== 'beginner',
        trigger: input.experienceLevel !== 'beginner' ? 'planned_stall_break' : 'none',
        volumeMultiplier: input.experienceLevel !== 'beginner' ? 0.7 : 1,
        intensityMultiplier: input.experienceLevel !== 'beginner' ? 0.94 : 1,
        durationDays: input.experienceLevel !== 'beginner' ? 5 : 0,
      };
    }

    return {
      shouldDeload: false,
      trigger: 'none',
      volumeMultiplier: 1,
      intensityMultiplier: 1,
      durationDays: 0,
    };
  }
}
