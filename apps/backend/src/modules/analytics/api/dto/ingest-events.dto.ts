import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

export class AnalyticsEnvelopeDto {
  @IsString()
  @Length(8, 64)
  event_id!: string;

  /**
   * Event name. Enforced as `<domain>.<entity>.<action>` snake_case so the
   * warehouse can pattern-match by domain prefix.
   */
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,3}$/, {
    message: 'event name must be snake_case dotted segments (e.g. workout.set.completed)',
  })
  @Length(3, 96)
  name!: string;

  @IsString()
  @IsIn([
    'app',
    'auth',
    'onboarding',
    'screen',
    'workout',
    'progression',
    'sync',
    'feature',
    'notification',
    'perf',
    'ux',
    'error',
  ])
  category!: string;

  @IsObject()
  properties!: Record<string, unknown>;

  @IsString()
  occurred_at!: string;

  @IsString()
  @Length(8, 64)
  client_session_id!: string;

  @IsString()
  @Length(1, 32)
  app_version!: string;

  @IsString()
  @IsIn(['ios', 'android'])
  os!: 'ios' | 'android';

  @IsString()
  @Length(1, 32)
  os_version!: string;

  @IsString()
  @Length(2, 16)
  locale!: string;

  @IsInt()
  schema_version!: number;
}

export class IngestEventsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => AnalyticsEnvelopeDto)
  events!: AnalyticsEnvelopeDto[];
}

export interface IngestEventsResponse {
  readonly accepted_event_ids: string[];
  readonly rejected: Array<{ event_id: string; reason: string }>;
}
