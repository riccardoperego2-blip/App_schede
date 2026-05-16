import type {
  DifficultyLevel,
  EquipmentType,
  ExerciseCatalogEntry,
  MovementPattern,
  MuscleCode,
} from '../../../../shared/exerciseClassification';

/** Canonical selection input contract (API / job payload). */
export interface UserProfileSelection {
  readonly userId: string;
  readonly bodyweightKg?: number;
  readonly trainingAgeWeeks?: number;
}

export type WorkoutGoal =
  | 'strength'
  | 'hypertrophy'
  | 'fat_loss'
  | 'general'
  | 'sport_performance'
  | 'rehab';

export type TrainingSplit =
  | 'full_body'
  | 'upper_lower'
  | 'push_pull_legs'
  | 'bro_split'
  | 'powerlifting_focus'
  | 'athlete_hybrid';

export type ExperienceLevel = DifficultyLevel;

export interface InjuryConstraint {
  readonly code: string;
  /** Muscles or regions to de-emphasize / avoid as primary */
  readonly avoidPrimaryMuscles?: readonly MuscleCode[];
  readonly avoidMovementPatterns?: readonly MovementPattern[];
  readonly avoidTags?: readonly string[];
  readonly maxInjuryRisk?: 'low' | 'moderate';
}

export interface WeeklyVolumeTargets {
  /** Optional per-muscle normalized volume targets (0–1 scale or arbitrary units). */
  readonly musclePriority?: Readonly<Partial<Record<MuscleCode, number>>>;
  readonly maxHeavyAxialSessionsPerWeek?: number;
}

export interface SelectionInput {
  readonly userProfile: UserProfileSelection;
  readonly workoutGoal: WorkoutGoal;
  readonly split: TrainingSplit;
  /** Total session wall time (minutes). */
  readonly sessionDurationMinutes: number;
  readonly availableEquipment: ReadonlySet<EquipmentType>;
  readonly injuries: readonly InjuryConstraint[];
  readonly experienceLevel: ExperienceLevel;
  readonly preferredExercises: ReadonlySet<string>;
  readonly excludedExercises: ReadonlySet<string>;
  readonly weeklyVolumeTargets?: WeeklyVolumeTargets;
  /** Optional deterministic seed for ordering tie-break extensions (not randomness). */
  readonly selectionEpoch?: number;
}

export interface SelectionEngineConfig {
  /** Reserve minutes for warm-up / transitions. */
  readonly warmupReserveMinutes: number;
  /** Average working time per exercise including rest (minutes). */
  readonly defaultWorkBlockMinutes: number;
  /** Slot mix: must sum to 1. */
  readonly slotMix: Readonly<{
    primary: number;
    complementary: number;
    isolation: number;
  }>;
  readonly fatigue: Readonly<FatigueEngineConfig>;
  readonly scoring: Readonly<ScoringEngineConfig>;
  readonly overlap: Readonly<OverlapEngineConfig>;
  readonly patterns: Readonly<PatternBalancerConfig>;
}

export interface FatigueEngineConfig {
  readonly systemicFatigueCapByExperience: Readonly<
    Record<ExperienceLevel, number>
  >;
  /** Multiplier for fatigue_score when session_cost is very_high */
  readonly sessionCostWeight: Readonly<Record<'low' | 'medium' | 'high' | 'very_high', number>>;
  /** Extra systemic units per axial_load compound beyond first. */
  readonly axialLoadCompoundPenalty: number;
}

export interface ScoringEngineConfig {
  readonly goalWeights: Readonly<Record<WorkoutGoal, Readonly<Record<string, number>>>>;
  readonly preferredExerciseBoost: number;
  readonly patternUnderrepresentationBonus: number;
  readonly sfrWeight: number;
  readonly fatiguePenaltyWeight: number;
}

export interface OverlapEngineConfig {
  readonly primaryMuscleCompoundOverlapPenalty: number;
  readonly primaryMuscleIsolationOverlapPenalty: number;
  readonly duplicatePatternSoftCap: number;
  readonly duplicatePatternPenaltyPerExtra: number;
  readonly axialLoadTag: string;
  readonly kneeDominantTag: string;
}

export interface PatternBalancerConfig {
  /** Target pattern distribution by split (relative weights, sum arbitrary). */
  readonly splitPatternTargets: Readonly<
    Record<
      TrainingSplit,
      Readonly<Partial<Record<MovementPattern, number>>>
    >
  >;
  readonly imbalancePenaltyScale: number;
}

export type SlotRole = 'primary' | 'complementary' | 'isolation';

export interface ScoredExercise {
  readonly exercise: ExerciseCatalogEntry;
  readonly totalScore: number;
  readonly breakdown: Readonly<Record<string, number>>;
}

export interface SelectedExerciseSlot {
  readonly role: SlotRole;
  readonly exercise: ExerciseCatalogEntry;
  readonly score: ScoredExercise;
  readonly substitutionOf?: string;
  readonly estimatedMinutes: number;
}

export interface SelectionTraceEntry {
  readonly phase: string;
  readonly slug: string;
  readonly reason: string;
  readonly score: number;
}

export interface FatigueReport {
  readonly rawSum: number;
  readonly weightedSum: number;
  readonly axialCompoundCount: number;
  readonly systemicEstimate: number;
}

export interface WorkoutSelectionResult {
  readonly slots: readonly SelectedExerciseSlot[];
  readonly totalSystemicFatigue: number;
  readonly patternHistogram: Readonly<Partial<Record<MovementPattern, number>>>;
  readonly fatigueReport: Readonly<FatigueReport>;
  readonly trace: readonly SelectionTraceEntry[];
}
