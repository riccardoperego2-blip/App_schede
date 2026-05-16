import type { FitnessGoalCode } from '../../../shared/exerciseClassification';
import type { ExperienceLevel, SelectionEngineConfig, WorkoutGoal } from './domain/selection.types';

const skillRank: Record<string, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  very_high: 3,
};

export function skillRankOf(level: string): number {
  return skillRank[level] ?? 0;
}

export const DEFAULT_SELECTION_CONFIG: SelectionEngineConfig = {
  warmupReserveMinutes: 8,
  defaultWorkBlockMinutes: 9,
  slotMix: { primary: 0.4, complementary: 0.35, isolation: 0.25 },
  fatigue: {
    systemicFatigueCapByExperience: {
      beginner: 28,
      intermediate: 36,
      advanced: 44,
      elite: 52,
    },
    sessionCostWeight: { low: 0.9, medium: 1.0, high: 1.15, very_high: 1.35 },
    axialLoadCompoundPenalty: 4,
  },
  scoring: {
    goalWeights: {
      strength: { compound_bias: 12, low_rep_skill_ok: 4, sfr_boost: 2 },
      hypertrophy: { compound_bias: 6, isolation_bias: 8, sfr_boost: 3 },
      fat_loss: { conditioning_bias: 6, low_setup: 4, sfr_boost: 2 },
      general: { balance_bias: 8, sfr_boost: 2 },
      sport_performance: { unilateral_bias: 6, power_bias: 6, sfr_boost: 2 },
      rehab: { low_injury: 15, isolation_bias: 10, skill_penalty_strict: 8 },
    },
    preferredExerciseBoost: 25,
    patternUnderrepresentationBonus: 6,
    sfrWeight: 18,
    fatiguePenaltyWeight: 2.2,
  },
  overlap: {
    primaryMuscleCompoundOverlapPenalty: 22,
    primaryMuscleIsolationOverlapPenalty: 10,
    duplicatePatternSoftCap: 2,
    duplicatePatternPenaltyPerExtra: 7,
    axialLoadTag: 'axial_load',
    kneeDominantTag: 'knee_dominant',
  },
  patterns: {
    splitPatternTargets: {
      full_body: {
        squat: 1,
        hinge: 1,
        horizontal_push: 1,
        vertical_push: 0.6,
        horizontal_pull: 1,
        vertical_pull: 0.8,
        carry: 0.2,
        core_anti_extension: 0.4,
        core_anti_rotation: 0.2,
        other: 0.2,
      },
      upper_lower: {
        squat: 0.3,
        hinge: 0.4,
        horizontal_push: 1.2,
        vertical_push: 0.9,
        horizontal_pull: 1.2,
        vertical_pull: 1,
        carry: 0.3,
        core_anti_extension: 0.5,
        core_anti_rotation: 0.3,
        other: 0.2,
      },
      push_pull_legs: {
        squat: 1.2,
        hinge: 1.2,
        horizontal_push: 1,
        vertical_push: 0.8,
        horizontal_pull: 1,
        vertical_pull: 1,
        carry: 0.2,
        core_anti_extension: 0.3,
        core_anti_rotation: 0.2,
        other: 0.2,
      },
      bro_split: {
        squat: 0.4,
        hinge: 0.4,
        horizontal_push: 1.4,
        vertical_push: 1,
        horizontal_pull: 1.2,
        vertical_pull: 0.9,
        carry: 0.2,
        core_anti_extension: 0.4,
        core_anti_rotation: 0.2,
        other: 0.3,
      },
      powerlifting_focus: {
        squat: 1.4,
        hinge: 1.4,
        horizontal_push: 0.9,
        vertical_push: 0.5,
        horizontal_pull: 1,
        vertical_pull: 0.6,
        carry: 0.4,
        core_anti_extension: 0.5,
        core_anti_rotation: 0.2,
        other: 0.2,
      },
      athlete_hybrid: {
        squat: 1,
        hinge: 1,
        horizontal_push: 0.8,
        vertical_push: 0.7,
        horizontal_pull: 0.9,
        vertical_pull: 0.8,
        carry: 0.8,
        core_anti_extension: 0.6,
        core_anti_rotation: 0.5,
        other: 0.5,
      },
    },
    imbalancePenaltyScale: 5,
  },
};

export function mapWorkoutGoalToFitnessCodes(goal: WorkoutGoal): readonly FitnessGoalCode[] {
  switch (goal) {
    case 'strength':
      return ['strength'];
    case 'hypertrophy':
      return ['muscle_gain', 'strength'];
    case 'fat_loss':
      return ['fat_loss', 'general_fitness', 'endurance'];
    case 'general':
      return ['general_fitness', 'muscle_gain', 'strength'];
    case 'sport_performance':
      return ['sport_specific', 'strength', 'general_fitness'];
    case 'rehab':
      return ['rehab', 'general_fitness'];
    default:
      return ['general_fitness'];
  }
}

export function maxSkillRankForExperience(level: ExperienceLevel): number {
  switch (level) {
    case 'beginner':
      return 1;
    case 'intermediate':
      return 2;
    case 'advanced':
      return 3;
    case 'elite':
      return 3;
    default:
      return 2;
  }
}

export function maxStabilityRankForExperience(level: ExperienceLevel): number {
  switch (level) {
    case 'beginner':
      return 1;
    case 'intermediate':
      return 2;
    case 'advanced':
      return 3;
    case 'elite':
      return 3;
    default:
      return 2;
  }
}
