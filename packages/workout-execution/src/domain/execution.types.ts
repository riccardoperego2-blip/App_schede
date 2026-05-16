import type {
  GeneratedWorkoutDay,
  MuscleVolumeGroup,
  PlannedExercise,
  PlannedSet,
  ProgressionModel,
  TrainingGoal,
} from '@schede/workout-generation';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type TrendDirection = 'up' | 'flat' | 'down';
export type ReadinessBand = 'green' | 'yellow' | 'orange' | 'red';
export type AdaptationSeverity = 'info' | 'minor' | 'moderate' | 'major';

export interface UserRecoveryMetrics {
  /** Resting HR delta from baseline in bpm, positive = worse readiness. */
  readonly restingHeartRateDelta?: number;
  /** HRV percent delta from baseline, negative = worse readiness. */
  readonly hrvDeltaPct?: number;
  /** Subjective stress 1-10. */
  readonly stressLevel?: number;
  /** Appetite 1-5; persistent low appetite often tracks accumulated fatigue. */
  readonly appetiteScore?: 1 | 2 | 3 | 4 | 5;
}

export interface BodyWeightTrend {
  readonly direction: TrendDirection;
  readonly weeklyChangePct: number;
}

export interface CompletedSetLog {
  readonly setIndex: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly targetRpe?: number;
  readonly targetRir?: number;
  readonly completedReps: number;
  readonly loadKg?: number;
  readonly actualRpe?: number;
  readonly actualRir?: number;
  readonly completed: boolean;
  readonly painScore?: number;
}

export interface ExerciseLog {
  readonly exerciseSlug: string;
  readonly exerciseName?: string;
  readonly primaryMuscle?: MuscleVolumeGroup;
  readonly sets: readonly CompletedSetLog[];
  readonly notes?: string;
}

export interface CompletedWorkout {
  readonly workoutId: string;
  readonly completedAt: string;
  readonly durationMinutes: number;
  readonly sessionRpe?: number;
  readonly completedExerciseSlugs: readonly string[];
}

export interface HistoricalExercisePerformance {
  readonly exerciseSlug: string;
  readonly completedAt: string;
  readonly bestLoadKg?: number;
  readonly bestEstimated1RmKg?: number;
  readonly totalVolumeKg: number;
  readonly averageRpe?: number;
  readonly failedSets: number;
}

export interface WorkoutHistory {
  readonly recentSessions: readonly {
    readonly completedAt: string;
    readonly sessionRpe?: number;
    readonly adherenceScore: number;
    readonly systemicFatigueEstimate?: number;
  }[];
  readonly exerciseHistory: readonly HistoricalExercisePerformance[];
}

export interface WorkoutExecutionInput {
  readonly plannedWorkout: GeneratedWorkoutDay;
  readonly completedWorkout: CompletedWorkout;
  readonly exerciseLogs: readonly ExerciseLog[];
  readonly userRecoveryMetrics: UserRecoveryMetrics;
  readonly bodyWeightTrend: BodyWeightTrend;
  readonly sleepQuality: number; // 1-10
  readonly soreness: number; // 1-10
  readonly fatigueLevel: number; // 1-10
  readonly adherenceScore: number; // 0-1
  readonly workoutHistory: WorkoutHistory;
  readonly trainingGoal: TrainingGoal;
  readonly experienceLevel: ExperienceLevel;
  readonly progressionModel: ProgressionModel;
}

export interface ExercisePerformanceSummary {
  readonly exerciseSlug: string;
  readonly targetSets: number;
  readonly completedSets: number;
  readonly prescribedRepTotal: number;
  readonly completedRepTotal: number;
  readonly repCompletionRatio: number;
  readonly averageLoadKg: number | undefined;
  readonly estimated1RmKg: number | undefined;
  readonly volumeKg: number;
  readonly averageRpe: number | undefined;
  readonly averageRir: number | undefined;
  readonly painMax: number;
  readonly hitTopOfRepRange: boolean;
  readonly undershotByTwoOrMoreReps: boolean;
}

export interface PerformanceComparison {
  readonly exerciseSummaries: readonly ExercisePerformanceSummary[];
  readonly sessionCompletionRatio: number;
  readonly loadProgressionSignal: TrendDirection;
  readonly volumeProgressionSignal: TrendDirection;
  readonly regressionDetected: boolean;
}

export interface ReadinessScore {
  readonly score: number;
  readonly band: ReadinessBand;
  readonly modifiers: Readonly<Record<string, number>>;
}

export type StallType =
  | 'none'
  | 'single_session_miss'
  | 'load_stall'
  | 'volume_stall'
  | 'pain_limited'
  | 'systemic_fatigue_limited';

export interface StallDecision {
  readonly type: StallType;
  readonly affectedExercises: readonly string[];
  readonly affectedMuscles: readonly MuscleVolumeGroup[];
  readonly severity: AdaptationSeverity;
  readonly rationale: string;
}

export interface PersonalRecord {
  readonly exerciseSlug: string;
  readonly type: 'estimated_1rm' | 'max_weight_single' | 'max_reps_at_weight' | 'session_volume';
  readonly value: number;
  readonly previousValue: number | undefined;
  readonly unit: 'kg' | 'reps' | 'kg_volume';
}

export interface FatigueAccumulation {
  readonly acuteLoad: number;
  readonly monotony: number;
  readonly strain: number;
  readonly overreachingRisk: ReadinessBand;
}

export interface RecoveryAnalysis {
  readonly recoveryScore: number;
  readonly limitingFactors: readonly string[];
  readonly bodyWeightNote: string | undefined;
}

export interface ProgressionRecommendation {
  readonly exerciseSlug: string;
  readonly nextLoadKg: number | undefined;
  readonly nextRepsMin: number | undefined;
  readonly nextRepsMax: number | undefined;
  readonly nextRpeTarget: number | undefined;
  readonly nextRirTarget: number | undefined;
  readonly setDelta: number;
  readonly action:
    | 'increase_load'
    | 'increase_reps'
    | 'hold'
    | 'reduce_load'
    | 'reduce_volume'
    | 'replace_exercise';
  readonly rationale: string;
}

export interface AdaptiveVolumeDecision {
  readonly muscleGroup: MuscleVolumeGroup;
  readonly setDelta: number;
  readonly frequencyDelta: number;
  readonly rationale: string;
}

export interface DeloadDecisionExecution {
  readonly shouldDeload: boolean;
  readonly trigger:
    | 'none'
    | 'readiness_red'
    | 'overreaching_risk'
    | 'multi_session_regression'
    | 'pain'
    | 'planned_stall_break';
  readonly volumeMultiplier: number;
  readonly intensityMultiplier: number;
  readonly durationDays: number;
}

export interface ExecutionAdaptationResult {
  readonly readiness: ReadinessScore;
  readonly comparison: PerformanceComparison;
  readonly recovery: RecoveryAnalysis;
  readonly fatigue: FatigueAccumulation;
  readonly stall: StallDecision;
  readonly personalRecords: readonly PersonalRecord[];
  readonly progressions: readonly ProgressionRecommendation[];
  readonly volumeAdjustments: readonly AdaptiveVolumeDecision[];
  readonly deload: DeloadDecisionExecution;
  readonly nextWorkoutPatch: NextWorkoutPatch;
}

export interface NextWorkoutPatch {
  readonly exercisePatches: readonly {
    readonly exerciseSlug: string;
    readonly setPatches: readonly Partial<PlannedSet>[];
    readonly replaceExercise: boolean;
  }[];
  readonly volumeSetDeltasByMuscle: Readonly<Partial<Record<MuscleVolumeGroup, number>>>;
  readonly frequencyDeltasByMuscle: Readonly<Partial<Record<MuscleVolumeGroup, number>>>;
}

export interface ExecutionRepository {
  readonly loadWorkoutHistory: (userId: string) => Promise<WorkoutHistory>;
  readonly saveAdaptationResult: (userId: string, result: ExecutionAdaptationResult) => Promise<void>;
}

export type PlannedExerciseWithGroup = PlannedExercise & {
  readonly primaryMuscle: MuscleVolumeGroup | string;
};
