import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../core/supabase/supabase.module';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { WorkoutsModule } from '../workouts/workouts.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [SupabaseModule, WorkoutsModule],
  controllers: [DashboardController],
  providers: [DashboardService, SupabaseAuthGuard],
})
export class DashboardModule {}
