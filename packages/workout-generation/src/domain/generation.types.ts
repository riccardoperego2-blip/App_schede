/**
 * Volume prescription groups (coarser than catalog `MuscleCode`) for **weekly hard-set** budgeting.
 * Aligns with common hypertrophy volume landmark literature (MEV/MAV/MRV framing).
 */
import type { InjuryConstraint, TrainingSplit, WorkoutSelectionResult } from '@schede/exercise-selection';
import type { EquipmentType } from '@shared/exerciseClassification';

export const MUSCLE_VOLUME_GROUPS = [
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
] as const;

export type MuscleVolumeGroup = (typeof MUSCLE_VOLUME_GROUPS)[number];

export type TrainingGoal =
  | 'strength'
  | 'hypertrophy'
  | 'fat_loss'
  | 'general'
  | 'rehab'
  | 'sport_performance';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

/** 1 = poor recovery capacity, 5 = excellent — scales volume toward MAV vs MEV. */
export type RecoveryCapacityScore = 1 | 2 | 3 | 4 | 5;

export interface UserProfileGeneration {
  readonly userId: string;
  readonly ageYears?: number;
  readonly sex?: 'male' | 'female' | 'other';
}

export interface TrainingHistorySummary {
  /** Completed hard sessions in trailing 7 days (proxy for current fatigue / adherence). */
  readonly sessionsLast7Days: number;
  /** Average session RPE 1–10 if tracked; undefined if unknown. */
  readonly averageSessionRpe?: number;
  /** Weeks of consistent training prior to this plan. */
  readonly consecutiveTrainingWeeks: number;
}

export interface WorkoutGenerationInput {
  readonly userProfile: UserProfileGeneration;
  readonly trainingGoal: TrainingGoal;
  readonly experienceLevel: ExperienceLevel;
  /** Sessions per week the user commits to (1–7). */
  readonly trainingDays: number;
  readonly sessionDurationMinutes: number;
  readonly availableEquipment: ReadonlySet<EquipmentType>;
  readonly injuries: readonly InjuryConstraint[];
  readonly recoveryCapacity: RecoveryCapacityScore;
  readonly preferredExercises: ReadonlySet<string>;
  readonly excludedExercises: ReadonlySet<string>;
  readonly trainingHistory?: TrainingHistorySummary;
  readonly weakMuscleGroups: readonly MuscleVolumeGroup[];
  readonly priorityMuscleGroups: readonly MuscleVolumeGroup[];
  /** Mesocycle length including deload week (default applied in engine if omitted). */
  readonly mesocycleWeeks?: number;
}

/** Minimum / adaptive / maximum recoverable volume (hard sets per week). */
export interface VolumeLandmarks {
  readonly mev: number;
  readonly mavLow: number;
  readonly mavHigh: number;
  readonly mrv: number;
}

export type ProgressionModel =
  | 'linear_load_addition'
  | 'double_progression_reps_then_load'
  | 'top_set_rpe_autoregulation'
  | 'volume_wave_then_intensity'
  | 'maintenance_volume';

export type DeloadStrategy =
  | 'none'
  | 'volume_reduction_40'
  | 'volume_reduction_50'
  | 'frequency_preserved_intensity_drop'
  | 'exercise_variation_deload';

export interface DeloadDecision {
  readonly strategy: DeloadStrategy;
  readonly volumeMultiplier: number;
  readonly intensityMultiplier: number;
  readonly frequencyPreserved: boolean;
}

export interface ProgressionDecision {
  readonly model: ProgressionModel;
  readonly weeklyLoadIncrementPct: number;
  readonly rirProgressionStep: number;
  readonly notes: string;
}

export type IntensityPrescription =
  | { readonly kind: 'rir'; readonly target: number; readonly lastSetModifier: number }
  | { readonly kind: 'rpe'; readonly target: number; readonly lastSetModifier: number };

export interface PlannedSet {
  readonly setIndex: number;
  readonly repsMin: number;
  readonly repsMax: number;
  readonly intensity: IntensityPrescription;
  readonly restSeconds: number;
}

export interface PlannedExercise {
  readonly order: number;
  readonly slug: string;
  readonly name: string;
  readonly slotRole: 'primary' | 'complementary' | 'isolation';
  readonly movementPattern: string;
  readonly primaryMuscle: string;
  readonly sets: readonly PlannedSet[];
  readonly progressionHint: string;
}

export interface GeneratedWorkoutDay {
  readonly dayIndex: number;
  readonly weekIndex: number;
  readonly label: string;
  readonly focusMuscleGroups: readonly MuscleVolumeGroup[];
  readonly exercises: readonly PlannedExercise[];
  readonly systemicFatigueEstimate: number;
  readonly selectionTrace: WorkoutSelectionResult['trace'];
}

export interface GeneratedWorkoutWeek {
  readonly weekIndex: number;
  readonly isDeload: boolean;
  readonly deload: DeloadDecision;
  readonly days: readonly GeneratedWorkoutDay[];
}

export interface FatigueManagementReport {
  readonly weeklySystemicBudget: number;
  readonly projectedWeeklyFatigue: number;
  readonly historyAdjustmentFactor: number;
  readonly axialSessionCap: number;
}

export interface RecoveryManagementReport {
  readonly recoveryCapacity: RecoveryCapacityScore;
  readonly volumeScalarFromRecovery: number;
  readonly frequencyCap: number;
}

export interface GeneratedWorkoutPlan {
  readonly version: 'schede_workout_gen_v1';
  readonly split: TrainingSplit;
  readonly trainingGoal: TrainingGoal;
  readonly experienceLevel: ExperienceLevel;
  readonly progression: ProgressionDecision;
  readonly volumeLandmarksByMuscle: Readonly<Record<MuscleVolumeGroup, VolumeLandmarks>>;
  readonly weeklyTargetSetsByMuscle: Readonly<Record<MuscleVolumeGroup, number>>;
  readonly frequencyByMuscle: Readonly<Record<MuscleVolumeGroup, number>>;
  readonly fatigueReport: FatigueManagementReport;
  readonly recoveryReport: RecoveryManagementReport;
  readonly weeks: readonly GeneratedWorkoutWeek[];
}
