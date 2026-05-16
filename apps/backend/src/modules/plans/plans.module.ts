import { Module } from '@nestjs/common';
import { DomainEventBus } from '../../core/events/domain-event-bus';
import { SupabaseModule } from '../../core/supabase/supabase.module';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ExercisesModule } from '../exercises/exercises.module';
import { PlansController } from './api/plans.controller';
import { PlanGenerationService } from './application/plan-generation.service';
import { PlanRepository } from './infrastructure/plan.repository';

@Module({
  imports: [SupabaseModule, ExercisesModule],
  controllers: [PlansController],
  providers: [PlanGenerationService, PlanRepository, DomainEventBus, SupabaseAuthGuard],
  exports: [PlanGenerationService],
})
export class PlansModule {}
