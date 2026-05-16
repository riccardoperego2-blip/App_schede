import { Injectable, NotFoundException } from '@nestjs/common';
import { PgUnitOfWork } from '../../core/supabase/pg-unit-of-work';
import { WorkoutRepository } from '../workouts/infrastructure/workout.repository';

export interface DashboardSummaryResponse {
  readonly user: { id: string; displayName: string; avatarUrl: string | null };
  readonly nextWorkout: {
    readonly workoutDayId: string;
    readonly planVersionId: string;
    readonly weekNumber: number;
    readonly dayLabel: string;
    readonly estimatedDurationMin: number;
    readonly exerciseCount: number;
    readonly isDeloadWeek: boolean;
  } | null;
  readonly weeklyVolume: { completed: number; planned: number };
  readonly streakDays: number;
  readonly readinessHint: 'ready' | 'caution' | 'rest';
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly uow: PgUnitOfWork,
    private readonly workouts: WorkoutRepository,
  ) {}

  async summary(userId: string): Promise<DashboardSummaryResponse> {
    return this.uow.execute(async (tx) => {
      const profile = await tx.query<{ id: string; display_name: string | null; avatar_url: string | null }>(
        `select id, display_name, avatar_url
           from public.profiles
          where id = $1 and deleted_at is null`,
        [userId],
      );
      const p = profile.rows[0];
      if (!p) throw new NotFoundException('Profile not found');

      const next = await this.workouts.findFirstTrainingDayForUser(tx, userId);
      const completed = await this.workouts.countCompletedSessionsThisUtcWeek(tx, userId);
      const plannedDays = await this.workouts.countWorkoutDaysInActivePlan(tx, userId);

      return {
        user: {
          id: p.id,
          displayName: p.display_name ?? '',
          avatarUrl: p.avatar_url,
        },
        nextWorkout: next
          ? {
              workoutDayId: next.workoutDayId,
              planVersionId: next.planVersionId,
              weekNumber: next.weekNumber,
              dayLabel: next.dayLabel,
              estimatedDurationMin: next.estimatedDurationMin,
              exerciseCount: next.exerciseCount,
              isDeloadWeek: next.isDeloadWeek,
            }
          : null,
        weeklyVolume: { completed, planned: plannedDays },
        streakDays: 0,
        readinessHint: 'ready',
      };
    });
  }
}
