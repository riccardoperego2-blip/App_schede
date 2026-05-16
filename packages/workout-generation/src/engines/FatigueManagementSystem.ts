import type { ExperienceLevel, FatigueManagementReport, TrainingHistorySummary } from '../domain/generation.types';
import type { WorkoutSelectionResult } from '@schede/exercise-selection';

export interface FatigueManagementInput {
  readonly experienceLevel: ExperienceLevel;
  readonly trainingHistory?: TrainingHistorySummary;
  readonly projectedSessions: readonly Pick<WorkoutSelectionResult, 'totalSystemicFatigue'>[];
}

/**
 * Aggregates systemic fatigue estimates across the microcycle projection
 * and compares to experience-tier budgets (selection engine caps are per-session;
 * this layer approximates weekly accumulation).
 */
export function fatigueManagementSystem(input: FatigueManagementInput): FatigueManagementReport {
  const weeklyBudget = weeklySystemicBudget(input.experienceLevel);
  const projected = input.projectedSessions.reduce((a, s) => a + s.totalSystemicFatigue, 0);
  let historyAdjustmentFactor = 1;
  if (input.trainingHistory) {
    if (input.trainingHistory.sessionsLast7Days >= 6) historyAdjustmentFactor *= 0.93;
    if ((input.trainingHistory.averageSessionRpe ?? 0) >= 8.5) historyAdjustmentFactor *= 0.9;
  }
  const axialSessionCap =
    input.experienceLevel === 'beginner' ? 2 : input.experienceLevel === 'intermediate' ? 3 : 4;
  return {
    weeklySystemicBudget: weeklyBudget,
    projectedWeeklyFatigue: projected * historyAdjustmentFactor,
    historyAdjustmentFactor,
    axialSessionCap,
  };
}

function weeklySystemicBudget(exp: ExperienceLevel): number {
  switch (exp) {
    case 'beginner':
      return 95;
    case 'intermediate':
      return 130;
    case 'advanced':
      return 165;
    case 'elite':
      return 195;
    default:
      return 130;
  }
}
