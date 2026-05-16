import { Transform, Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import type { EquipmentType } from '@shared/exerciseClassification';
import type { MuscleVolumeGroup, TrainingGoal } from '@schede/workout-generation';

export class GeneratePlanDto {
  /** Extra fields from mobile onboarding — whitelisted, ignored by generation. */
  @Allow()
  @IsOptional()
  displayName?: unknown;

  @Allow()
  @IsOptional()
  sex?: unknown;

  @Allow()
  @IsOptional()
  birthYear?: unknown;

  @Allow()
  @IsOptional()
  heightCm?: unknown;

  @Allow()
  @IsOptional()
  bodyWeightKg?: unknown;

  @IsIn(['strength', 'hypertrophy', 'fat_loss', 'general', 'rehab'])
  trainingGoal!: TrainingGoal;

  @IsIn(['beginner', 'intermediate', 'advanced', 'elite'])
  experienceLevel!: 'beginner' | 'intermediate' | 'advanced' | 'elite';

  /** Mobile onboarding field (whitelist). Coalesced into `trainingDays`. */
  @Allow()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  @Type(() => Number)
  trainingDaysPerWeek?: number;

  @Transform(({ obj }) => obj.trainingDays ?? obj.trainingDaysPerWeek)
  @IsInt()
  @Min(1)
  @Max(7)
  trainingDays!: number;

  /** Mobile onboarding field (whitelist). Coalesced into `sessionDurationMinutes`. */
  @Allow()
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(150)
  @Type(() => Number)
  sessionDurationMin?: number;

  @Transform(({ obj }) => obj.sessionDurationMinutes ?? obj.sessionDurationMin)
  @IsInt()
  @Min(30)
  @Max(150)
  sessionDurationMinutes!: number;

  @IsArray()
  @ArrayMinSize(1)
  availableEquipment!: EquipmentType[];

  /** Default 3 when omitted (mobile onboarding does not collect it yet). */
  @Transform(({ obj }) => (obj.recoveryCapacity === undefined || obj.recoveryCapacity === null ? 3 : obj.recoveryCapacity))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  recoveryCapacity!: 1 | 2 | 3 | 4 | 5;

  @IsArray()
  @IsOptional()
  preferredExercises?: string[];

  @IsArray()
  @IsOptional()
  excludedExercises?: string[];

  @IsArray()
  @ArrayMaxSize(8)
  @IsOptional()
  weakMuscleGroups?: MuscleVolumeGroup[];

  @IsArray()
  @ArrayMaxSize(8)
  @IsOptional()
  priorityMuscleGroups?: MuscleVolumeGroup[];

  @IsInt()
  @Min(3)
  @Max(8)
  @IsOptional()
  mesocycleWeeks?: number;

  @IsOptional()
  trainingHistory?: {
    sessionsLast7Days: number;
    averageSessionRpe?: number;
    consecutiveTrainingWeeks: number;
  };

  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return value;
    if (!Array.isArray(value)) return value;
    if (value.length === 0) return [];
    if (typeof value[0] === 'string') {
      return (value as string[]).map((code) => ({ code }));
    }
    return value;
  })
  injuries?: {
    code: string;
    avoidPrimaryMuscles?: string[];
    avoidMovementPatterns?: string[];
    avoidTags?: string[];
    maxInjuryRisk?: 'low' | 'moderate';
  }[];

  @IsString()
  @IsOptional()
  clientUserId?: string;
}
