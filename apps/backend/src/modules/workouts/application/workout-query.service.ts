import { Injectable, NotFoundException } from '@nestjs/common';
import { PgUnitOfWork } from '../../../core/supabase/pg-unit-of-work';
import type { MobilePlannedWorkoutDetail } from '../infrastructure/workout.repository';
import type { MobileHistoryItem } from '../infrastructure/workout.repository';
import { WorkoutRepository } from '../infrastructure/workout.repository';

@Injectable()
export class WorkoutQueryService {
  constructor(
    private readonly uow: PgUnitOfWork,
    private readonly workouts: WorkoutRepository,
  ) {}

  /**
   * Returns the first training day of the active plan (ordered by week/day).
   * Sufficient for local bootstrap until calendar scheduling exists.
   */
  async today(userId: string): Promise<MobilePlannedWorkoutDetail | null> {
    return this.uow.execute(async (tx) => {
      const head = await this.workouts.findFirstTrainingDayForUser(tx, userId);
      if (!head) return null;
      return this.workouts.loadMobilePlannedWorkoutDetail(tx, userId, head.workoutDayId);
    });
  }

  async byDay(userId: string, workoutDayId: string): Promise<MobilePlannedWorkoutDetail> {
    return this.uow.execute(async (tx) => {
      const detail = await this.workouts.loadMobilePlannedWorkoutDetail(tx, userId, workoutDayId);
      if (!detail) throw new NotFoundException('Workout day not found');
      return detail;
    });
  }

  async history(
    userId: string,
    cursor?: string,
  ): Promise<{ items: MobileHistoryItem[]; nextCursor: string | null }> {
    const parsed = decodeHistoryCursor(cursor);
    return this.uow.execute((tx) =>
      this.workouts.loadMobileWorkoutHistoryPage(
        tx,
        userId,
        20,
        parsed?.startedAt ?? null,
        parsed?.id ?? null,
      ),
    );
  }
}

function decodeHistoryCursor(cursor?: string): { startedAt: string; id: string } | null {
  const trimmed = cursor?.trim();
  if (!trimmed) return null;
  for (const enc of ['base64url', 'base64'] as const) {
    try {
      const json = Buffer.from(trimmed, enc).toString('utf8');
      const o = JSON.parse(json) as { startedAt?: string; id?: string };
      if (typeof o.startedAt === 'string' && typeof o.id === 'string') return { startedAt: o.startedAt, id: o.id };
    } catch {
      /* try next */
    }
  }
  return null;
}
