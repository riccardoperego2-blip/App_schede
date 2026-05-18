import { Injectable } from '@nestjs/common';
import { PgUnitOfWork, type DbExecutor } from '../../../core/supabase/pg-unit-of-work';
import { WorkoutRepository } from '../../workouts/infrastructure/workout.repository';

export type AnalyticsRange = '4w' | '12w' | '6m';

export interface AnalyticsOverviewResponse {
  readonly weeklyVolumeSeries: Array<{ weekStart: string; volumeKg: number }>;
  readonly muscleDistribution: Array<{ muscleGroup: string; sets: number }>;
  readonly personalRecords: Array<{
    exerciseSlug: string;
    exerciseName: string;
    bestWeightKg: number | null;
    bestVolumeKg: number | null;
    bestReps: number | null;
  }>;
  readonly topExercisesByVolume: Array<{
    exerciseSlug: string;
    exerciseName: string;
    volumeKg: number;
    sets: number;
    bestWeightKg: number | null;
    bestReps: number | null;
  }>;
  readonly mostTrainedExercises: Array<{
    exerciseSlug: string;
    exerciseName: string;
    sets: number;
    sessions: number;
  }>;
  readonly readinessTrend: Array<{ date: string; score: number; band: 'green' | 'yellow' | 'red' }>;
  readonly adherencePct: number;
  readonly completedSessions: number;
  readonly totalSessions: number;
  readonly totalVolumeKg: number | null;
  readonly allTimeVolumeKg: number | null;
  readonly last4WeeksVolumeKg: number | null;
  readonly streakDays: number;
  readonly sessionsThisWeek: number;
}

@Injectable()
export class AnalyticsOverviewService {
  constructor(
    private readonly uow: PgUnitOfWork,
    private readonly workouts: WorkoutRepository,
  ) {}

  async overview(userId: string, range: string): Promise<AnalyticsOverviewResponse> {
    const resolved: AnalyticsRange = range === '12w' || range === '6m' ? range : '4w';
    const weeksBack = resolved === '6m' ? 26 : resolved === '12w' ? 12 : 4;

    return this.uow.execute(async (tx) => {
      const weeklyVolumeSeries = await this.loadWeeklyVolumeSeries(tx, userId, weeksBack);
      const muscleDistribution = await this.loadMuscleDistribution(tx, userId, weeksBack);
      const completedSessions = await this.countCompletedSessions(tx, userId, weeksBack);
      const totalVolumeKg = await this.sumTotalVolume(tx, userId, weeksBack);
      const totalSessions = await this.countCompletedSessions(tx, userId);
      const allTimeVolumeKg = await this.sumTotalVolume(tx, userId);
      const last4WeeksVolumeKg = await this.sumTotalVolume(tx, userId, 4);
      const personalRecords = await this.loadPersonalRecords(tx, userId);
      const topExercisesByVolume = await this.loadTopExercisesByVolume(tx, userId, weeksBack);
      const mostTrainedExercises = await this.loadMostTrainedExercises(tx, userId, weeksBack);
      const sessionsThisWeek = await this.workouts.countCompletedSessionsThisUtcWeek(tx, userId);
      const planDays = await this.workouts.countWorkoutDaysInActivePlan(tx, userId);
      const planWeeks = await this.countPlanWeeks(tx, userId);
      const daysPerWeek = Math.min(7, Math.max(1, Math.round(planDays / planWeeks)));
      const weeksInRange = Math.min(weeksBack, planWeeks);
      const targetSessions = Math.max(1, weeksInRange * daysPerWeek);
      const adherencePct = Math.min(1, Math.max(0, completedSessions / targetSessions));
      const streakDays = await this.computeStreakDays(tx, userId);
      const readinessTrend = weeklyVolumeSeries.map((week) => {
        const score = week.volumeKg > 0 ? 85 : 55;
        const band: 'green' | 'yellow' | 'red' = week.volumeKg > 0 ? 'green' : 'yellow';
        return { date: week.weekStart, score, band };
      });

      return {
        weeklyVolumeSeries,
        muscleDistribution,
        personalRecords,
        topExercisesByVolume,
        mostTrainedExercises,
        readinessTrend,
        adherencePct,
        completedSessions,
        totalSessions,
        totalVolumeKg,
        allTimeVolumeKg,
        last4WeeksVolumeKg,
        streakDays,
        sessionsThisWeek,
      };
    });
  }

  private async loadWeeklyVolumeSeries(
    tx: DbExecutor,
    userId: string,
    weeksBack: number,
  ): Promise<Array<{ weekStart: string; volumeKg: number }>> {
    const r = await tx.query<{ week_start: string; volume_kg: string | null }>(
      `select date_trunc('week', ws.started_at at time zone 'utc')::date::text as week_start,
              sum(el.weight_kg * el.reps_completed)::text as volume_kg
         from public.workout_sessions ws
         left join public.exercise_logs el
           on el.session_id = ws.id and el.weight_kg is not null
        where ws.user_id = $1
          and ws.status = 'completed'
          and ws.started_at >= (timezone('utc', now()) - make_interval(weeks => $2))
        group by 1
        order by 1 asc`,
      [userId, weeksBack],
    );
    return r.rows.map((row) => ({
      weekStart: row.week_start,
      volumeKg: row.volume_kg != null && row.volume_kg !== '' ? Number(row.volume_kg) : 0,
    }));
  }

  private async loadMuscleDistribution(
    tx: DbExecutor,
    userId: string,
    weeksBack: number,
  ): Promise<Array<{ muscleGroup: string; sets: number }>> {
    const r = await tx.query<{ muscle_group: string; sets: string }>(
      `select coalesce(mt.code::text, 'other') as muscle_group,
              count(*)::text as sets
         from public.exercise_logs el
         join public.workout_sessions ws on ws.id = el.session_id
         join public.exercises e on e.id = el.exercise_id
         left join public.exercise_muscles em on em.exercise_id = e.id and em.is_primary = true
         left join public.muscle_tags mt on mt.id = em.muscle_id
        where ws.user_id = $1
          and ws.status = 'completed'
          and ws.started_at >= (timezone('utc', now()) - make_interval(weeks => $2))
        group by 1
        order by count(*) desc
        limit 8`,
      [userId, weeksBack],
    );
    return r.rows.map((row) => ({
      muscleGroup: row.muscle_group,
      sets: Number(row.sets ?? 0),
    }));
  }

  private async countCompletedSessions(tx: DbExecutor, userId: string, weeksBack?: number): Promise<number> {
    const rangeSql = weeksBack ? `and started_at >= (timezone('utc', now()) - make_interval(weeks => $2))` : '';
    const params: Array<string | number> = weeksBack ? [userId, weeksBack] : [userId];
    const r = await tx.query<{ c: string }>(
      `select count(*)::text as c
         from public.workout_sessions
        where user_id = $1
          and status = 'completed'
          ${rangeSql}`,
      params,
    );
    return Number(r.rows[0]?.c ?? 0);
  }

  private async sumTotalVolume(tx: DbExecutor, userId: string, weeksBack?: number): Promise<number | null> {
    const rangeSql = weeksBack ? `and ws.started_at >= (timezone('utc', now()) - make_interval(weeks => $2))` : '';
    const params: Array<string | number> = weeksBack ? [userId, weeksBack] : [userId];
    const r = await tx.query<{ volume_kg: string | null }>(
      `select sum(el.weight_kg * el.reps_completed)::text as volume_kg
         from public.exercise_logs el
         join public.workout_sessions ws on ws.id = el.session_id
        where ws.user_id = $1
          and ws.status = 'completed'
          and el.weight_kg is not null
          ${rangeSql}`,
      params,
    );
    const raw = r.rows[0]?.volume_kg;
    if (raw == null || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private async loadPersonalRecords(
    tx: DbExecutor,
    userId: string,
  ): Promise<AnalyticsOverviewResponse['personalRecords']> {
    const r = await tx.query<{
      exercise_slug: string;
      exercise_name: string;
      best_weight_kg: string | null;
      best_volume_kg: string | null;
      best_reps: string | null;
    }>(
      `with per_session as (
          select e.id as exercise_id,
                 e.slug as exercise_slug,
                 coalesce(et.name, e.slug) as exercise_name,
                 ws.id as session_id,
                 max(el.weight_kg)::text as best_weight_kg,
                 max(el.reps_completed)::text as best_reps,
                 sum(coalesce(el.weight_kg, 0) * coalesce(el.reps_completed, 0))::text as session_volume_kg
            from public.exercise_logs el
            join public.workout_sessions ws on ws.id = el.session_id
            join public.exercises e on e.id = el.exercise_id
            left join public.exercise_translations et on et.exercise_id = e.id and et.locale = 'it-IT'
           where ws.user_id = $1
             and ws.status = 'completed'
           group by e.id, e.slug, et.name, ws.id
        )
        select exercise_slug,
               exercise_name,
               max(best_weight_kg::numeric)::text as best_weight_kg,
               max(session_volume_kg::numeric)::text as best_volume_kg,
               max(best_reps::int)::text as best_reps
          from per_session
         group by exercise_slug, exercise_name
         order by max(session_volume_kg::numeric) desc nulls last, max(best_weight_kg::numeric) desc nulls last
         limit 12`,
      [userId],
    );
    return r.rows.map((row) => ({
      exerciseSlug: row.exercise_slug,
      exerciseName: row.exercise_name,
      bestWeightKg: toPositiveNumberOrNull(row.best_weight_kg),
      bestVolumeKg: toPositiveNumberOrNull(row.best_volume_kg),
      bestReps: toPositiveNumberOrNull(row.best_reps),
    }));
  }

  private async loadTopExercisesByVolume(
    tx: DbExecutor,
    userId: string,
    weeksBack: number,
  ): Promise<AnalyticsOverviewResponse['topExercisesByVolume']> {
    const r = await tx.query<{
      exercise_slug: string;
      exercise_name: string;
      volume_kg: string | null;
      sets: string;
      best_weight_kg: string | null;
      best_reps: string | null;
    }>(
      `select e.slug as exercise_slug,
              coalesce(et.name, e.slug) as exercise_name,
              sum(coalesce(el.weight_kg, 0) * coalesce(el.reps_completed, 0))::text as volume_kg,
              count(*)::text as sets,
              max(el.weight_kg)::text as best_weight_kg,
              max(el.reps_completed)::text as best_reps
         from public.exercise_logs el
         join public.workout_sessions ws on ws.id = el.session_id
         join public.exercises e on e.id = el.exercise_id
         left join public.exercise_translations et on et.exercise_id = e.id and et.locale = 'it-IT'
        where ws.user_id = $1
          and ws.status = 'completed'
          and ws.started_at >= (timezone('utc', now()) - make_interval(weeks => $2))
        group by e.slug, et.name
        order by sum(coalesce(el.weight_kg, 0) * coalesce(el.reps_completed, 0)) desc
        limit 5`,
      [userId, weeksBack],
    );
    return r.rows.map((row) => ({
      exerciseSlug: row.exercise_slug,
      exerciseName: row.exercise_name,
      volumeKg: Number(row.volume_kg ?? 0),
      sets: Number(row.sets ?? 0),
      bestWeightKg: toPositiveNumberOrNull(row.best_weight_kg),
      bestReps: toPositiveNumberOrNull(row.best_reps),
    }));
  }

  private async loadMostTrainedExercises(
    tx: DbExecutor,
    userId: string,
    weeksBack: number,
  ): Promise<AnalyticsOverviewResponse['mostTrainedExercises']> {
    const r = await tx.query<{
      exercise_slug: string;
      exercise_name: string;
      sets: string;
      sessions: string;
    }>(
      `select e.slug as exercise_slug,
              coalesce(et.name, e.slug) as exercise_name,
              count(*)::text as sets,
              count(distinct ws.id)::text as sessions
         from public.exercise_logs el
         join public.workout_sessions ws on ws.id = el.session_id
         join public.exercises e on e.id = el.exercise_id
         left join public.exercise_translations et on et.exercise_id = e.id and et.locale = 'it-IT'
        where ws.user_id = $1
          and ws.status = 'completed'
          and ws.started_at >= (timezone('utc', now()) - make_interval(weeks => $2))
        group by e.slug, et.name
        order by count(*) desc
        limit 5`,
      [userId, weeksBack],
    );
    return r.rows.map((row) => ({
      exerciseSlug: row.exercise_slug,
      exerciseName: row.exercise_name,
      sets: Number(row.sets ?? 0),
      sessions: Number(row.sessions ?? 0),
    }));
  }

  private async countPlanWeeks(tx: DbExecutor, userId: string): Promise<number> {
    const r = await tx.query<{ c: string }>(
      `select count(wk.id)::text as c
         from public.workout_weeks wk
         join public.workout_plan_versions v on v.id = wk.version_id and v.is_current = true
         join public.workout_plans p on p.id = v.plan_id
        where p.owner_user_id = $1 and p.status = 'active'`,
      [userId],
    );
    return Math.max(1, Number(r.rows[0]?.c ?? 0));
  }

  private async computeStreakDays(tx: DbExecutor, userId: string): Promise<number> {
    const r = await tx.query<{ session_day: string }>(
      `select distinct (ws.started_at at time zone 'utc')::date::text as session_day
         from public.workout_sessions ws
        where ws.user_id = $1 and ws.status = 'completed'
        order by session_day desc
        limit 90`,
      [userId],
    );
    if (r.rows.length === 0) return 0;

    const days = new Set(r.rows.map((row) => row.session_day));
    let streak = 0;
    const cursor = new Date();
    cursor.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < 90; i += 1) {
      const key = cursor.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  }
}

function toPositiveNumberOrNull(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}
