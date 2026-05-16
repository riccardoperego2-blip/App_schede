import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProfileModule } from './modules/profile/profile.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { SupabaseModule } from './core/supabase/supabase.module';
import { appConfig } from './core/config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      // `.env` is read from the backend's package directory when running
      // via `pnpm --filter @schede/backend ...` because nest CLI sets cwd
      // to the package root. We also accept `.env.local` for personal
      // overrides without touching the committed `.env.example`.
      envFilePath: ['.env.local', '.env'],
    }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 20 }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    SupabaseModule,
    HealthModule,
    ExercisesModule,
    PlansModule,
    WorkoutsModule,
    DashboardModule,
    ProfileModule,
    AnalyticsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
