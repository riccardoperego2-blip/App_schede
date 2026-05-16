import { Injectable } from '@nestjs/common';
import type {
  CompletedWorkout,
  ExerciseLog,
  WorkoutHistory,
} from '@schede/workout-execution';
import type { GeneratedWorkoutDay, PlannedExercise, PlannedSet } from '@schede/workout-generation';
import type { DbExecutor } from '../../../core/supabase/pg-unit-of-work';

/** Mirrors `PlannedWorkoutDetail` in `apps/mobile/src/lib/api/contracts.ts`. */
export interface MobilePlannedWorkoutDetail {
  readonly workoutDayId: string;
  readonly weekNumber: number;
  readonly dayLabel: string;
  readonly isDeload: boolean;
  readonly notes: string | null;
  readonly exercises: readonly MobilePlannedExercise[];
}

export interface MobilePlannedExercise {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly primaryMuscle: string;
  readonly orderIndex: number;
  readonly restSeconds: number;
  readonly tempoCode: string | null;
  readonly notes: string | null;
  readonly sets: readonly MobilePlannedSet[];
}

export interface MobilePlannedSet {
  readonly setIndex: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly targetLoadKg: number | null;
  readonly targetRpe: number | null;
  readonly targetRir: number | null;
  readonly restSeconds: number;
}

export interface NextWorkoutDayRow {
  readonly workoutDayId: string;
  readonly planVersionId: string;
  readonly weekNumber: number;
  readonly dayLabel: string;
  readonly exerciseCount: number;
  readonly isDeloadWeek: boolean;
  readonly estimatedDurationMin: number;
}

export interface MobileHistoryItem {
  readonly sessionId: string;
  readonly completedAt: string | null;
  readonly durationMinutes: number;
  readonly dayLabel: string;
  readonly exerciseCount: number;
  readonly volumeKg: number | null;
  readonly prCount: number;
  readonly readiness: 'green' | 'yellow' | 'red';
}

@Injectable()
export class WorkoutRepository {
  async loadPlannedWorkout(tx: DbExecutor, workoutDayId: string): Promise<GeneratedWorkoutDay> {
    const day = await tx.query<{
      id: string;
      week_index: number;
      day_index: number;
      name: string;
      metadata: { focusMuscleGroups?: string[] };
    }>(
      `select d.id, wk.week_index, d.day_index, d.name, d.metadata
         from public.workout_days d
         join public.workout_weeks wk on wk.id = d.week_id
        where d.id = $1`,
      [workoutDayId],
    );
    if (!day.rows[0]) throw new Error(`Workout day not found: ${workoutDayId}`);

    const exercises = await tx.query<{
      workout_exercise_id: string;
      slug: string;
      name: string;
      position: number;
      prescription: Record<string, unknown>;
    }>(
      `select we.id as workout_exercise_id, e.slug, coalesce(et.name, e.slug) as name,
              we.position, we.prescription
         from public.workout_exercises we
         join public.exercises e on e.id = we.exercise_id
         left join public.exercise_translations et on et.exercise_id = e.id and et.locale = 'it-IT'
        where we.day_id = $1
        order by we.position`,
      [workoutDayId],
    );

    const plannedExercises: PlannedExercise[] = [];
    for (const ex of exercises.rows) {
      const sets = await tx.query<{
        set_index: number;
        target_reps_min: number;
        target_reps_max: number;
        target_rpe: number | null;
        rest_seconds: number | null;
        metadata: { intensity?: PlannedSet['intensity'] };
      }>(
        `select set_index, target_reps_min, target_reps_max, target_rpe, rest_seconds, metadata
           from public.workout_sets
          where workout_exercise_id = $1
          order by set_index`,
        [ex.workout_exercise_id],
      );
      plannedExercises.push({
        order: ex.position,
        slug: ex.slug,
        name: ex.name,
        slotRole: (ex.prescription.slotRole as PlannedExercise['slotRole']) ?? 'complementary',
        movementPattern: String(ex.prescription.movementPattern ?? 'other'),
        primaryMuscle: String(ex.prescription.primaryMuscle ?? 'core'),
        progressionHint: String(ex.prescription.progressionHint ?? ''),
        sets: sets.rows.map((s) => ({
          setIndex: s.set_index,
          repsMin: s.target_reps_min,
          repsMax: s.target_reps_max,
          intensity: s.metadata.intensity ?? { kind: 'rpe', target: s.target_rpe ?? 7, lastSetModifier: 0 },
          restSeconds: s.rest_seconds ?? 90,
        })),
      });
    }

    const row = day.rows[0];
    return {
      weekIndex: row.week_index,
      dayIndex: row.day_index - 1,
      label: row.name,
      focusMuscleGroups: row.metadata.focusMuscleGroups ?? [],
      exercises: plannedExercises,
      systemicFatigueEstimate: 0,
      selectionTrace: [],
    } as GeneratedWorkoutDay;
  }

  async loadMobilePlannedWorkoutDetail(
    tx: DbExecutor,
    userId: string,
    workoutDayId: string,
  ): Promise<MobilePlannedWorkoutDetail | null> {
    const day = await tx.query<{
      id: string;
      week_index: number;
      day_index: number;
      name: string;
      week_metadata: { isDeload?: boolean } | null;
      coach_notes: string | null;
    }>(
      `select d.id, wk.week_index, d.day_index, d.name, wk.metadata as week_metadata,
              we_agg.coach_notes
         from public.workout_days d
         join public.workout_weeks wk on wk.id = d.week_id
         join public.workout_plan_versions v on v.id = wk.version_id
         join public.workout_plans p on p.id = v.plan_id
         left join lateral (
           select string_agg(we.coach_notes, E'\n') filter (where we.coach_notes is not null) as coach_notes
             from public.workout_exercises we
            where we.day_id = d.id
         ) we_agg on true
        where d.id = $1 and p.owner_user_id = $2`,
      [workoutDayId, userId],
    );
    const row = day.rows[0];
    if (!row) return null;

    const exercises = await tx.query<{
      workout_exercise_id: string;
      slug: string;
      name: string;
      position: number;
      prescription: { primaryMuscle?: string };
      coach_notes: string | null;
    }>(
      `select we.id as workout_exercise_id, e.slug, coalesce(et.name, e.slug) as name,
              we.position, we.prescription, we.coach_notes
         from public.workout_exercises we
         join public.exercises e on e.id = we.exercise_id
         left join public.exercise_translations et on et.exercise_id = e.id and et.locale = 'it-IT'
        where we.day_id = $1
        order by we.position`,
      [workoutDayId],
    );

    const outEx: MobilePlannedExercise[] = [];
    for (const ex of exercises.rows) {
      const sets = await tx.query<{
        set_index: number;
        target_reps_min: number;
        target_reps_max: number;
        target_rpe: number | null;
        rest_seconds: number | null;
        metadata: { intensity?: { kind: string; target: number } };
      }>(
        `select set_index, target_reps_min, target_reps_max, target_rpe, rest_seconds, metadata
           from public.workout_sets
          where workout_exercise_id = $1
          order by set_index`,
        [ex.workout_exercise_id],
      );
      const restDefault = sets.rows[0]?.rest_seconds ?? 90;
      outEx.push({
        id: ex.workout_exercise_id,
        slug: ex.slug,
        name: ex.name,
        primaryMuscle: String(ex.prescription.primaryMuscle ?? 'core'),
        orderIndex: ex.position,
        restSeconds: restDefault,
        tempoCode: null,
        notes: ex.coach_notes,
        sets: sets.rows.map((s) => {
          const int = s.metadata?.intensity;
          const targetRir = int?.kind === 'rir' ? int.target : null;
          const targetRpe = int?.kind === 'rpe' ? int.target : int?.kind === 'rir' ? null : s.target_rpe;
          return {
            setIndex: s.set_index,
            targetRepsMin: s.target_reps_min,
            targetRepsMax: s.target_reps_max,
            targetLoadKg: null,
            targetRpe: targetRpe != null ? Number(targetRpe) : null,
            targetRir: targetRir != null ? Number(targetRir) : null,
            restSeconds: s.rest_seconds ?? restDefault,
          };
        }),
      });
    }

    const isDeload = Boolean(row.week_metadata?.isDeload);
    return {
      workoutDayId: row.id,
      weekNumber: row.week_index,
      dayLabel: row.name,
      isDeload,
      notes: row.coach_notes,
      exercises: outEx,
    };
  }

  async findFirstTrainingDayForUser(tx: DbExecutor, userId: string): Promise<NextWorkoutDayRow | null> {
    const r = await tx.query<{
      workout_day_id: string;
      plan_version_id: string;
      week_index: number;
      day_label: string;
      exercise_count: string;
      is_deload: boolean;
    }>(
      `select d.id as workout_day_id,
              v.id as plan_version_id,
              wk.week_index,
              d.name as day_label,
              (select count(*)::text from public.workout_exercises we where we.day_id = d.id) as exercise_count,
              coalesce((wk.metadata->>'isDeload')::boolean, false) as is_deload
         from public.workout_days d
         join public.workout_weeks wk on wk.id = d.week_id
         join public.workout_plan_versions v on v.id = wk.version_id and v.is_current = true
         join public.workout_plans p on p.id = v.plan_id
        where p.owner_user_id = $1 and p.status = 'active'
        order by wk.week_index, d.day_index
        limit 1`,
      [userId],
    );
    const row = r.rows[0];
    if (!row) return null;
    const n = Number(row.exercise_count);
    return {
      workoutDayId: row.workout_day_id,
      planVersionId: row.plan_version_id,
      weekNumber: row.week_index,
      dayLabel: row.day_label,
      exerciseCount: Number.isFinite(n) ? n : 0,
      isDeloadWeek: row.is_deload,
      estimatedDurationMin: Math.max(25, Math.min(120, (Number.isFinite(n) ? n : 0) * 7)),
    };
  }

  async countCompletedSessionsThisUtcWeek(tx: DbExecutor, userId: string): Promise<number> {
    const r = await tx.query<{ c: string }>(
      `select count(*)::text as c
         from public.workout_sessions
        where user_id = $1
          and status = 'completed'
          and started_at >= date_trunc('week', timezone('utc', now()))::timestamptz`,
      [userId],
    );
    return Number(r.rows[0]?.c ?? 0);
  }

  async countWorkoutDaysInActivePlan(tx: DbExecutor, userId: string): Promise<number> {
    const r = await tx.query<{ c: string }>(
      `select count(d.id)::text as c
         from public.workout_days d
         join public.workout_weeks wk on wk.id = d.week_id
         join public.workout_plan_versions v on v.id = wk.version_id and v.is_current = true
         join public.workout_plans p on p.id = v.plan_id
        where p.owner_user_id = $1 and p.status = 'active'`,
      [userId],
    );
    return Number(r.rows[0]?.c ?? 0);
  }

  async loadMobileWorkoutHistoryPage(
    tx: DbExecutor,
    userId: string,
    limit: number,
    cursorStartedAt: string | null,
    cursorId: string | null,
  ): Promise<{ items: MobileHistoryItem[]; nextCursor: string | null }> {
    const cursorSql =
      cursorStartedAt && cursorId
        ? `and (ws.started_at, ws.id) < ($3::timestamptz, $4::uuid)`
        : '';
    const sqlParams =
      cursorStartedAt && cursorId
        ? [userId, limit + 1, cursorStartedAt, cursorId]
        : [userId, limit + 1];
    const q = await tx.query<{
      id: string;
      completed_at: Date | string;
      cursor_started_at: Date | string;
      notes: string | null;
      day_label: string | null;
      exercise_count: string;
      volume_kg: string | null;
      device_metadata: Record<string, unknown> | null;
    }>(
      `select ws.id,
              coalesce(ws.ended_at, ws.started_at) as completed_at,
              ws.started_at as cursor_started_at,
              ws.notes,
              d.name as day_label,
              (select count(distinct el.exercise_id)::text
                 from public.exercise_logs el
                where el.session_id = ws.id) as exercise_count,
              (select sum(el.weight_kg * el.reps_completed)::text
                 from public.exercise_logs el
                where el.session_id = ws.id
                  and el.weight_kg is not null) as volume_kg,
              ws.device_metadata
         from public.workout_sessions ws
         left join public.workout_days d on d.id = ws.workout_day_id
        where ws.user_id = $1 and ws.status = 'completed' ${cursorSql}
        order by ws.started_at desc, ws.id desc
        limit $2`,
      sqlParams,
    );

    const rows = q.rows;
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items: MobileHistoryItem[] = slice.map((ws) => {
      const durationFromNotes = parseDurationMinutes(ws.notes);
      const readiness = parseReadinessBand(ws.device_metadata);
      return {
        sessionId: ws.id,
        completedAt: toIsoTimestamp(ws.completed_at),
        durationMinutes: durationFromNotes,
        dayLabel: ws.day_label ?? 'Workout',
        exerciseCount: Number(ws.exercise_count ?? 0),
        volumeKg: ws.volume_kg != null && ws.volume_kg !== '' ? Number(ws.volume_kg) : null,
        prCount: 0,
        readiness,
      };
    });
    let nextCursor: string | null = null;
    if (hasMore) {
      const last = slice[slice.length - 1]!;
      nextCursor = Buffer.from(
        JSON.stringify({ startedAt: toIsoTimestamp(last.cursor_started_at), id: last.id }),
        'utf8',
      ).toString('base64url');
    }
    return { items, nextCursor };
  }

  async saveCompletedWorkout(
    tx: DbExecutor,
    userId: string,
    workoutDayId: string,
    completed: CompletedWorkout,
    logs: readonly ExerciseLog[],
  ): Promise<string> {
    const sessionId = await insertReturningId(
      tx,
      `insert into public.workout_sessions
        (user_id, workout_day_id, status, started_at, ended_at, perceived_exertion, notes)
       values ($1, $2, 'completed', $3, $4, $5, $6)
       returning id`,
      [
        userId,
        workoutDayId,
        completed.completedAt,
        completed.completedAt,
        completed.sessionRpe ? Math.round(completed.sessionRpe) : null,
        `duration=${completed.durationMinutes}`,
      ],
    );

    for (const log of logs) {
      const exerciseId = await lookupExerciseId(tx, log.exerciseSlug);
      for (const set of log.sets) {
        await tx.query(
          `insert into public.exercise_logs
            (session_id, exercise_id, set_index, reps_completed, weight_kg, rpe, completed, notes, metadata)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
          [
            sessionId,
            exerciseId,
            set.setIndex,
            set.completedReps,
            set.loadKg ?? null,
            set.actualRpe ?? null,
            set.completed,
            log.notes ?? null,
            JSON.stringify({ actualRir: set.actualRir, painScore: set.painScore }),
          ],
        );
      }
    }
    return sessionId;
  }

  async loadWorkoutHistory(tx: DbExecutor, userId: string): Promise<WorkoutHistory> {
    const sessions = await tx.query<{
      started_at: string;
      perceived_exertion: number | null;
    }>(
      `select started_at, perceived_exertion
         from public.workout_sessions
        where user_id = $1 and status = 'completed'
        order by started_at desc
        limit 12`,
      [userId],
    );

    const history = await tx.query<{
      exercise_slug: string;
      completed_at: string;
      best_load_kg: number | null;
      total_volume_kg: number;
      average_rpe: number | null;
      failed_sets: number;
    }>(
      `select e.slug as exercise_slug,
              max(ws.started_at)::text as completed_at,
              max(el.weight_kg) as best_load_kg,
              coalesce(sum(coalesce(el.weight_kg, 0) * coalesce(el.reps_completed, 0)), 0) as total_volume_kg,
              avg(el.rpe) as average_rpe,
              count(*) filter (where el.completed = false) as failed_sets
         from public.exercise_logs el
         join public.workout_sessions ws on ws.id = el.session_id
         join public.exercises e on e.id = el.exercise_id
        where ws.user_id = $1
        group by e.slug
        order by max(ws.started_at) desc
        limit 100`,
      [userId],
    );

    return {
      recentSessions: sessions.rows.map((s) => ({
        completedAt: String(s.started_at),
        adherenceScore: 1,
        ...(s.perceived_exertion != null ? { sessionRpe: s.perceived_exertion } : {}),
      })),
      exerciseHistory: history.rows.map((h) => ({
        exerciseSlug: h.exercise_slug,
        completedAt: h.completed_at,
        totalVolumeKg: Number(h.total_volume_kg),
        failedSets: Number(h.failed_sets),
        ...(h.best_load_kg != null ? { bestLoadKg: h.best_load_kg } : {}),
        ...(h.best_load_kg != null ? { bestEstimated1RmKg: h.best_load_kg * 1.1 } : {}),
        ...(h.average_rpe != null ? { averageRpe: h.average_rpe } : {}),
      })),
    };
  }
}

function toIsoTimestamp(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (candidate.includes(' ') && !candidate.includes('T')) {
    candidate = candidate.replace(' ', 'T');
  }
  if (/[+-]\d{2}$/.test(candidate)) {
    candidate = `${candidate}:00`;
  }
  const d = new Date(candidate);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function parseDurationMinutes(notes: string | null): number {
  if (!notes) return 0;
  const m = /duration=(\d+)/.exec(notes);
  if (m) return Number(m[1]) || 0;
  return 0;
}

function parseReadinessBand(meta: Record<string, unknown> | null): 'green' | 'yellow' | 'red' {
  const band = meta?.readinessBand ?? meta?.readiness;
  if (band === 'yellow' || band === 'red' || band === 'green') return band;
  return 'green';
}

async function insertReturningId(tx: DbExecutor, sql: string, params: readonly unknown[]): Promise<string> {
  const result = await tx.query<{ id: string }>(sql, params);
  return result.rows[0]!.id;
}

async function lookupExerciseId(tx: DbExecutor, slug: string): Promise<string> {
  const result = await tx.query<{ id: string }>('select id from public.exercises where slug = $1', [slug]);
  if (!result.rows[0]) throw new Error(`Exercise not found: ${slug}`);
  return result.rows[0].id;
}
