import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../core/supabase/supabase.module';
import { WorkoutRepository } from '../workouts/infrastructure/workout.repository';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './api/analytics.controller';
import { AnalyticsIngestionService } from './application/analytics-ingestion.service';
import { AnalyticsOverviewService } from './application/analytics-overview.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsIngestionService, AnalyticsOverviewService, WorkoutRepository],
  exports: [AnalyticsIngestionService],
})
export class AnalyticsModule {}
