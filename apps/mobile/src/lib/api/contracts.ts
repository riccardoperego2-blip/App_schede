/**
 * Backend contracts mirrored from `apps/backend/src/modules/**`.
 * Kept colocated for documentation; in a monorepo these should be moved to
 * `packages/api-contracts` and consumed by both sides.
 */

export type TrainingGoal = 'strength' | 'hypertrophy' | 'fat_loss' | 'general' | 'rehab';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite';

export interface UserProfile {
  readonly id: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly trainingGoal: TrainingGoal;
  readonly experienceLevel: ExperienceLevel;
  readonly trainingDaysPerWeek: number;
  readonly sessionDurationMin: number;
  readonly availableEquipment: string[];
}
export type ProgressionModel =
  | 'linear_load_addition'
  | 'double_progression_reps_then_load'
  | 'top_set_rpe_autoregulation'
  | 'volume_wave_then_intensity'
  | 'maintenance_volume';

export interface DashboardSummary {
  readonly user: { id: string; displayName: string; avatarUrl: string | null };
  readonly nextWorkout: NextWorkoutSummary | null;
  readonly weeklyVolume: { completed: number; planned: number };
  readonly streakDays: number;
  readonly readinessHint: 'ready' | 'caution' | 'rest';
}

export interface NextWorkoutSummary {
  readonly workoutDayId: string;
  readonly planVersionId: string;
  readonly weekNumber: number;
  readonly dayLabel: string;
  readonly estimatedDurationMin: number;
  readonly exerciseCount: number;
  readonly isDeloadWeek: boolean;
}

export interface ActivePlanDaySummary {
  readonly workoutDayId: string;
  readonly dayIndex: number;
  readonly dayLabel: string;
  readonly exerciseCount: number;
  readonly estimatedDurationMin: number;
}

export interface ActivePlanWeekSummary {
  readonly weekNumber: number;
  readonly name: string;
  readonly isDeload: boolean;
  readonly days: ActivePlanDaySummary[];
}

export interface ActivePlanFull {
  readonly planId: string;
  readonly versionId: string;
  readonly name: string;
  readonly weeks: ActivePlanWeekSummary[];
}

export interface PlannedWorkoutDetail {
  readonly workoutDayId: string;
  readonly weekNumber: number;
  readonly dayLabel: string;
  readonly isDeload: boolean;
  readonly notes: string | null;
  readonly exercises: PlannedExercise[];
}

export interface PlannedExercise {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly primaryMuscle: string;
  readonly orderIndex: number;
  readonly restSeconds: number;
  readonly tempoCode: string | null;
  readonly notes: string | null;
  readonly sets: PlannedSet[];
}

export interface PlannedSet {
  readonly setIndex: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly targetLoadKg: number | null;
  readonly targetRpe: number | null;
  readonly targetRir: number | null;
  readonly restSeconds: number;
}

export interface CompletedSetPayload {
  readonly setIndex: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly completedReps: number;
  readonly loadKg?: number;
  readonly actualRpe?: number;
  readonly actualRir?: number;
  readonly completed: boolean;
  readonly painScore?: number;
}

export interface ExerciseLogPayload {
  readonly exerciseSlug: string;
  readonly primaryMuscle?: string;
  readonly sets: CompletedSetPayload[];
  readonly notes?: string;
}

export interface CompleteWorkoutPayload {
  readonly workoutDayId: string;
  readonly completedAt: string;
  readonly durationMinutes: number;
  readonly sessionRpe?: number;
  readonly exerciseLogs: ExerciseLogPayload[];
  readonly sleepQuality: number;
  readonly soreness: number;
  readonly fatigueLevel: number;
  readonly adherenceScore: number;
  readonly trainingGoal: TrainingGoal;
  readonly experienceLevel: ExperienceLevel;
  readonly progressionModel: ProgressionModel;
  readonly userRecoveryMetrics?: {
    restingHeartRateDelta?: number;
    hrvDeltaPct?: number;
    stressLevel?: number;
    appetiteScore?: 1 | 2 | 3 | 4 | 5;
  };
  readonly bodyWeightTrend?: { direction: 'up' | 'flat' | 'down'; weeklyChangePct: number };
}

export interface CompleteWorkoutResponse {
  readonly sessionId: string;
  readonly adaptation: {
    readonly readiness: { band: 'green' | 'yellow' | 'red'; score: number };
    readonly deload: { shouldDeload: boolean; reason: string | null };
    readonly personalRecords: Array<{
      readonly exerciseSlug: string;
      readonly type: 'estimated_1rm' | 'max_weight_single' | 'session_volume';
      readonly value: number;
      readonly previousValue: number | null;
      readonly unit: string;
    }>;
    readonly nextWorkoutPatch: unknown;
  };
}

export interface HistoryListResponse {
  readonly items: Array<{
    readonly sessionId: string;
    readonly completedAt: string | null;
    readonly durationMinutes: number;
    readonly dayLabel: string;
    readonly exerciseCount: number;
    readonly volumeKg: number | null;
    readonly prCount: number;
    readonly readiness: 'green' | 'yellow' | 'red';
  }>;
  readonly nextCursor: string | null;
}

export interface AnalyticsOverview {
  readonly weeklyVolumeSeries: Array<{ weekStart: string; volumeKg: number }>;
  readonly muscleDistribution: Array<{ muscleGroup: string; sets: number }>;
  readonly readinessTrend: Array<{ date: string; score: number; band: 'green' | 'yellow' | 'red' }>;
  /** Ratio 0.0–1.0 (not 0–100). Multiply by 100 only in UI formatters. */
  readonly adherencePct: number;
  readonly completedSessions: number;
  readonly totalVolumeKg: number | null;
  readonly streakDays: number;
  readonly sessionsThisWeek: number;
}
