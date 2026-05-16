import { IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CompletedSetDto {
  @IsInt()
  setIndex!: number;

  @IsInt()
  targetRepsMin!: number;

  @IsInt()
  targetRepsMax!: number;

  @IsInt()
  completedReps!: number;

  @IsNumber()
  @IsOptional()
  loadKg?: number;

  @IsNumber()
  @IsOptional()
  actualRpe?: number;

  @IsNumber()
  @IsOptional()
  actualRir?: number;

  @IsBoolean()
  completed!: boolean;

  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  painScore?: number;
}

export class ExerciseLogDto {
  @IsString()
  exerciseSlug!: string;

  @IsString()
  @IsOptional()
  primaryMuscle?: string;

  @IsArray()
  sets!: CompletedSetDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CompleteWorkoutDto {
  @IsString()
  workoutDayId!: string;

  @IsString()
  completedAt!: string;

  @IsInt()
  @Min(1)
  @Max(300)
  durationMinutes!: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  sessionRpe?: number;

  @IsArray()
  exerciseLogs!: ExerciseLogDto[];

  @IsNumber()
  @Min(1)
  @Max(10)
  sleepQuality!: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  soreness!: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  fatigueLevel!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  adherenceScore!: number;

  @IsString()
  trainingGoal!: 'strength' | 'hypertrophy' | 'fat_loss' | 'general' | 'rehab';

  @IsString()
  experienceLevel!: 'beginner' | 'intermediate' | 'advanced' | 'elite';

  @IsString()
  progressionModel!:
    | 'linear_load_addition'
    | 'double_progression_reps_then_load'
    | 'top_set_rpe_autoregulation'
    | 'volume_wave_then_intensity'
    | 'maintenance_volume';

  @IsOptional()
  userRecoveryMetrics?: {
    restingHeartRateDelta?: number;
    hrvDeltaPct?: number;
    stressLevel?: number;
    appetiteScore?: 1 | 2 | 3 | 4 | 5;
  };

  @IsOptional()
  bodyWeightTrend?: {
    direction: 'up' | 'flat' | 'down';
    weeklyChangePct: number;
  };
}
