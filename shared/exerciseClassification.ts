/**
 * Exercise classification + catalog types (schede_biomech_v1)
 * Auto-generated enums mirror scripts/gen_exercise_catalog.py — edit script + re-run to extend.
 */

export const EXERCISE_CLASSIFICATION_VERSION = 'schede_biomech_v1' as const;

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'carry'
  | 'core_anti_extension'
  | 'core_anti_rotation'
  | 'other';

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'band'
  | 'bodyweight'
  | 'smith_machine'
  | 'other';

/** 1–10: global fatigue / systemic cost proxy (CNS + local + cardio stress) */
export type FatigueScore = number;

/**
 * Higher = more hypertrophy/strength stimulus per unit fatigue.
 * Heuristic scale ~0.5–1.5; tune in analytics, not enforced in DB.
 */
export type StimulusToFatigueRatio = number;

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export type StabilityRequirement = 'low' | 'moderate' | 'high' | 'very_high';

export type SkillRequirement = 'low' | 'moderate' | 'high' | 'very_high';

/** Length–tension & external loading shape */
export type ForceCurve = 'descending' | 'flat' | 'ascending' | 'bell_shaped';

export type ExerciseType =
  | 'compound'
  | 'isolation'
  | 'isometric'
  | 'plyometric'
  | 'carry'
  | 'conditioning';

export type BodyRegion = 'upper' | 'lower' | 'core' | 'full';

export type InjuryRiskLevel = 'low' | 'moderate' | 'high';

/** Time to set up equipment / station (seconds) */
export type EstimatedSetupTimeSec = number;

/** Session cost: metabolic + systemic fatigue density */
export type SessionCostLevel = 'low' | 'medium' | 'high' | 'very_high';

/** How well tempo prescriptions (e.g. 3-0-1-0) apply without ruining technique */
export type TempoCompatibility = 'low' | 'medium' | 'high';

export type FitnessGoalCode =
  | 'strength'
  | 'muscle_gain'
  | 'fat_loss'
  | 'endurance'
  | 'general_fitness'
  | 'sport_specific'
  | 'rehab';

/** Normalized muscle codes (matches muscle_tags.code) */
export type MuscleCode =
  | 'chest'
  | 'front_delts'
  | 'side_delts'
  | 'rear_delts'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'traps'
  | 'lats'
  | 'upper_back'
  | 'lower_back'
  | 'abs'
  | 'obliques'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'adductors'
  | 'calves'
  | 'hip_flexors'
  | 'tibialis_anterior';

export interface ExerciseBiomechanics {
  difficulty: DifficultyLevel;
  fatigue_score: FatigueScore;
  stimulus_to_fatigue_ratio: StimulusToFatigueRatio;
  stability_requirement: StabilityRequirement;
  skill_requirement: SkillRequirement;
  force_curve: ForceCurve;
  exercise_type: ExerciseType;
  injury_risk: InjuryRiskLevel;
  estimated_setup_time_sec: EstimatedSetupTimeSec;
  estimated_session_cost: SessionCostLevel;
  tempo_compatibility: TempoCompatibility;
}

/** Stored in public.exercises.metadata + flat row in JSON catalog */
export interface ExerciseCatalogMetadata {
  catalog_version: string;
  classification: typeof EXERCISE_CLASSIFICATION_VERSION;
  primary_muscle_code: MuscleCode;
  secondary_muscle_codes: MuscleCode[];
  biomechanics: ExerciseBiomechanics;
  body_region: BodyRegion;
  tags: string[];
  compatible_goals: FitnessGoalCode[];
}

export interface ExerciseCatalogEntry {
  id: string;
  slug: string;
  name: string;
  primary_muscle: MuscleCode;
  secondary_muscles: MuscleCode[];
  movement_pattern: MovementPattern;
  equipment: EquipmentType;
  difficulty: DifficultyLevel;
  fatigue_score: FatigueScore;
  stimulus_to_fatigue_ratio: StimulusToFatigueRatio;
  unilateral: boolean;
  bilateral: boolean;
  stability_requirement: StabilityRequirement;
  skill_requirement: SkillRequirement;
  force_curve: ForceCurve;
  exercise_type: ExerciseType;
  body_region: BodyRegion;
  tags: string[];
  compatible_goals: FitnessGoalCode[];
  injury_risk: InjuryRiskLevel;
  estimated_setup_time_sec: EstimatedSetupTimeSec;
  estimated_session_cost: SessionCostLevel;
  tempo_compatibility: TempoCompatibility;
}

/**
 * Tag vocabulary (open set). Grouped for UX filters / AI program generation.
 * New exercises may introduce new strings; validate in app layer if you need a closed set.
 */
export const BIOMECHANICAL_TAG_CATEGORIES = {
  kinematics: [
    'knee_dominant',
    'hip_dominant',
    'vertical_pulling',
    'horizontal_pull',
    'pressing',
    'unilateral',
    'axial_load',
    'overhead_stability',
  ],
  context: ['home_gym', 'calisthenics', 'machine_based', 'competition_lift', 'conditioning_metcon'],
  loading_physiology: ['time_under_tension', 'constant_tension', 'accommodating_resistance', 'isometric_endurance'],
  coaching: ['warmup_activation', 'shoulder_health', 'spinal_unload', 'weak_point', 'skill_progression'],
} as const;

/** Any snake_case tag from catalog JSON */
export type ExerciseTag = string;

export function isCatalogTag(x: string): x is ExerciseTag {
  return typeof x === 'string' && x.length > 0 && /^[a-z0-9_]+$/.test(x);
}
