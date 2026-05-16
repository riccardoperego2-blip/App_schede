import { Module } from '@nestjs/common';
import { DomainEventBus } from '../../core/events/domain-event-bus';
import { SupabaseModule } from '../../core/supabase/supabase.module';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { WorkoutsController } from './api/workouts.controller';
import { WorkoutExecutionService } from './application/workout-execution.service';
import { WorkoutQueryService } from './application/workout-query.service';
import { WorkoutRepository } from './infrastructure/workout.repository';

@Module({
  imports: [SupabaseModule],
  controllers: [WorkoutsController],
  providers: [WorkoutExecutionService, WorkoutQueryService, WorkoutRepository, DomainEventBus, SupabaseAuthGuard],
  exports: [WorkoutExecutionService, WorkoutRepository],
})
export class WorkoutsModule {}
