import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string | null;

  @IsOptional()
  @IsIn(['strength', 'hypertrophy', 'fat_loss', 'general', 'rehab'])
  trainingGoal?: 'strength' | 'hypertrophy' | 'fat_loss' | 'general' | 'rehab';

  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced', 'elite'])
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'elite';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  @Type(() => Number)
  trainingDaysPerWeek?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(150)
  @Type(() => Number)
  sessionDurationMin?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  availableEquipment?: string[];
}
