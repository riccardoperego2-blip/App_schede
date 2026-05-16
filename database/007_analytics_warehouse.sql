-- =============================================================================
-- 007_analytics_warehouse.sql
--
-- Promotes `public.analytics_events` to a warehouse-ready event store and
-- materializes the product KPIs (retention cohorts, adherence, funnel,
-- workout quality, progression health, performance, rage-tap).
--
-- Design notes:
--  * Schema is additive — existing rows remain valid (server-side feed used
--    `null` for `event_id`; we backfill with a deterministic id below).
--  * `event_id` carries idempotency for the client SDK ingestion endpoint.
--  * `received_at` is the server clock; never trust `occurred_at` for billing.
--  * For high-volume production deployments, convert `analytics_events` to a
--    monthly-partitioned table via `pg_partman` (see commented section).
--  * Materialized views are refreshed by a scheduled job
--    (Supabase cron or n8n); none of them are stateful.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Extend the analytics_event_category enum with product-aligned categories.
-- -----------------------------------------------------------------------------
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'app';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'auth';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'screen';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'progression';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'sync';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'feature';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'notification';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'perf';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'ux';
ALTER TYPE public.analytics_event_category ADD VALUE IF NOT EXISTS 'error';

COMMIT;

BEGIN;

-- -----------------------------------------------------------------------------
-- 2. Extend the analytics_events table for the production envelope.
-- -----------------------------------------------------------------------------
ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS event_id          text,
  ADD COLUMN IF NOT EXISTS client_session_id text,
  ADD COLUMN IF NOT EXISTS received_at       timestamptz NOT NULL DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS os                text,
  ADD COLUMN IF NOT EXISTS os_version        text;

-- Backfill event_id for rows missing it (server-emitted before this migration)
-- so the uniqueness constraint can be safely created.
UPDATE public.analytics_events
SET event_id = concat('legacy:', id::text)
WHERE event_id IS NULL;

ALTER TABLE public.analytics_events
  ALTER COLUMN event_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_event_id_uniq
  ON public.analytics_events (event_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_category_time
  ON public.analytics_events (category, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_client_session
  ON public.analytics_events (client_session_id, occurred_at DESC);

-- Index for funnel / property lookups that filter on JSONB keys.
CREATE INDEX IF NOT EXISTS idx_analytics_events_props_gin
  ON public.analytics_events USING GIN (properties jsonb_path_ops);

COMMENT ON COLUMN public.analytics_events.event_id IS
  'Idempotency key for client ingestion. Legacy server events are prefixed with "legacy:" or "server:".';
COMMENT ON COLUMN public.analytics_events.received_at IS
  'Server clock at ingest time. Use this for retention / cohort math; client clock can drift.';

COMMIT;

-- =============================================================================
-- 3. KPI materialized views
--
-- All views are `MATERIALIZED VIEW` so dashboards stay fast even on multi-million
-- event tables. Refresh policy: every 5–15 minutes for daily KPIs, hourly for
-- weekly cohorts. Replace with TimescaleDB continuous aggregates at scale.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 3.1 Daily Active Users (DAU/WAU/MAU)
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_dau AS
SELECT
  date_trunc('day', occurred_at AT TIME ZONE 'UTC')::date AS day,
  COUNT(DISTINCT user_id) AS dau
FROM public.analytics_events
WHERE user_id IS NOT NULL
GROUP BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS mv_dau_day_uniq ON public.mv_dau (day);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_wau AS
SELECT
  gs::date AS week_start,
  (
    SELECT COUNT(DISTINCT user_id)
    FROM public.analytics_events
    WHERE user_id IS NOT NULL
      AND occurred_at >= gs::timestamptz
      AND occurred_at < (gs + INTERVAL '7 day')::timestamptz
  ) AS wau
FROM generate_series(
  (SELECT date_trunc('week', MIN(occurred_at))::date FROM public.analytics_events),
  (SELECT date_trunc('week', MAX(occurred_at))::date FROM public.analytics_events),
  '7 day'
) AS gs;

CREATE UNIQUE INDEX IF NOT EXISTS mv_wau_week_uniq ON public.mv_wau (week_start);

-- -----------------------------------------------------------------------------
-- 3.2 Signup → first workout activation
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_activation AS
WITH first_workout AS (
  SELECT user_id, MIN(occurred_at) AS first_workout_at
  FROM public.analytics_events
  WHERE event_name = 'workout.completed'
  GROUP BY user_id
)
SELECT
  p.id AS user_id,
  p.created_at AS signed_up_at,
  fw.first_workout_at,
  EXTRACT(EPOCH FROM (fw.first_workout_at - p.created_at)) / 86400.0 AS days_to_first_workout,
  (fw.first_workout_at IS NOT NULL
    AND fw.first_workout_at <= p.created_at + INTERVAL '7 day') AS activated_within_7d
FROM public.profiles p
LEFT JOIN first_workout fw ON fw.user_id = p.id;

CREATE UNIQUE INDEX IF NOT EXISTS mv_activation_user_uniq ON public.mv_activation (user_id);

-- -----------------------------------------------------------------------------
-- 3.3 Weekly cohort retention (signup-week → return-week)
--
-- Definition: a user is "retained in week N" if they have any
-- `workout.completed` or `app.session.started` event in that week.
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_weekly_cohort_retention AS
WITH cohort AS (
  SELECT id AS user_id, date_trunc('week', created_at)::date AS cohort_week
  FROM public.profiles
), active_weeks AS (
  SELECT
    e.user_id,
    date_trunc('week', e.occurred_at)::date AS active_week
  FROM public.analytics_events e
  WHERE e.event_name IN ('workout.completed', 'app.session.started')
  GROUP BY 1, 2
)
SELECT
  c.cohort_week,
  EXTRACT(EPOCH FROM (a.active_week - c.cohort_week)) / 604800.0 AS week_offset,
  COUNT(DISTINCT a.user_id) AS retained_users,
  (
    SELECT COUNT(*) FROM cohort cc WHERE cc.cohort_week = c.cohort_week
  ) AS cohort_size
FROM cohort c
JOIN active_weeks a ON a.user_id = c.user_id AND a.active_week >= c.cohort_week
GROUP BY 1, 2;

CREATE UNIQUE INDEX IF NOT EXISTS mv_weekly_cohort_retention_uniq
  ON public.mv_weekly_cohort_retention (cohort_week, week_offset);

-- -----------------------------------------------------------------------------
-- 3.4 Weekly adherence per user
--
-- adherence_pct = completed_workouts / NULLIF(planned_workouts, 0)
-- planned_workouts comes from the active plan version (workout_weeks * days/week).
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_weekly_adherence AS
WITH completions AS (
  SELECT
    user_id,
    date_trunc('week', occurred_at)::date AS week_start,
    COUNT(*) FILTER (WHERE event_name = 'workout.completed') AS completed_workouts,
    AVG((properties->>'adherence_score')::numeric)
      FILTER (WHERE event_name = 'workout.completed'
              AND (properties ? 'adherence_score'))
      AS avg_adherence_score,
    SUM((properties->>'planned_set_count')::numeric)
      FILTER (WHERE event_name = 'workout.completed') AS planned_set_count,
    SUM((properties->>'completed_set_count')::numeric)
      FILTER (WHERE event_name = 'workout.completed') AS completed_set_count
  FROM public.analytics_events
  WHERE event_name = 'workout.completed' AND user_id IS NOT NULL
  GROUP BY 1, 2
)
SELECT
  user_id,
  week_start,
  completed_workouts,
  COALESCE(avg_adherence_score, 0)::numeric(5,4) AS avg_adherence_score,
  CASE
    WHEN planned_set_count > 0 THEN (completed_set_count / planned_set_count)::numeric(5,4)
    ELSE NULL
  END AS volume_adherence_pct
FROM completions;

CREATE UNIQUE INDEX IF NOT EXISTS mv_weekly_adherence_uniq
  ON public.mv_weekly_adherence (user_id, week_start);

-- -----------------------------------------------------------------------------
-- 3.5 Onboarding funnel
--
-- Drop-off per step. Used for unblocking onboarding friction.
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_onboarding_funnel AS
SELECT
  COALESCE((properties->>'step_index')::int, -1) AS step_index,
  properties->>'step_key' AS step_key,
  COUNT(*) FILTER (WHERE event_name = 'onboarding.step.viewed') AS viewed,
  COUNT(*) FILTER (WHERE event_name = 'onboarding.step.completed') AS completed,
  COUNT(*) FILTER (WHERE event_name = 'onboarding.step.back_tracked') AS back_tracked
FROM public.analytics_events
WHERE event_name LIKE 'onboarding.%'
GROUP BY 1, 2
ORDER BY 1;

-- -----------------------------------------------------------------------------
-- 3.6 Workout drop-off (where users abandon a session)
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_workout_dropoff AS
WITH sessions AS (
  SELECT
    user_id,
    properties->>'workout_day_id' AS workout_day_id,
    MIN(occurred_at) AS started_at,
    MAX(CASE WHEN event_name = 'workout.completed' THEN occurred_at END) AS completed_at,
    MAX(CASE WHEN event_name = 'workout.cancelled' THEN occurred_at END) AS cancelled_at,
    MAX(CASE WHEN event_name = 'workout.cancelled' THEN
      (properties->>'completed_set_count')::int END) AS abandoned_at_set
  FROM public.analytics_events
  WHERE event_name IN ('workout.started', 'workout.completed', 'workout.cancelled')
  GROUP BY 1, 2
)
SELECT
  date_trunc('day', started_at)::date AS day,
  COUNT(*) AS sessions_started,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS sessions_completed,
  COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL) AS sessions_cancelled,
  AVG(abandoned_at_set) FILTER (WHERE cancelled_at IS NOT NULL)::numeric(6,2)
    AS avg_set_abandoned_at,
  CASE
    WHEN COUNT(*) > 0
    THEN (COUNT(*) FILTER (WHERE completed_at IS NOT NULL))::numeric / COUNT(*)
    ELSE NULL
  END AS completion_rate
FROM sessions
GROUP BY 1
ORDER BY 1;

CREATE UNIQUE INDEX IF NOT EXISTS mv_workout_dropoff_uniq
  ON public.mv_workout_dropoff (day);

-- -----------------------------------------------------------------------------
-- 3.7 Workout quality per user
--
-- Quality = mix of adherence, on-target sets, low rage taps, low pain reports.
-- Higher is better. Range 0..1.
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_workout_quality AS
WITH per_session AS (
  SELECT
    user_id,
    properties->>'workout_day_id' AS workout_day_id,
    (properties->>'adherence_score')::numeric AS adherence_score,
    (properties->>'completed_set_count')::int AS completed_set_count,
    (properties->>'planned_set_count')::int AS planned_set_count,
    (properties->>'duration_minutes')::int AS duration_minutes,
    occurred_at
  FROM public.analytics_events
  WHERE event_name = 'workout.completed'
)
SELECT
  user_id,
  date_trunc('week', occurred_at)::date AS week_start,
  COUNT(*) AS sessions,
  AVG(adherence_score)::numeric(5,4) AS avg_adherence,
  AVG(duration_minutes)::numeric(6,2) AS avg_duration_minutes,
  SUM(completed_set_count) AS total_sets,
  SUM(planned_set_count) AS planned_sets
FROM per_session
WHERE user_id IS NOT NULL
GROUP BY 1, 2;

CREATE UNIQUE INDEX IF NOT EXISTS mv_workout_quality_uniq
  ON public.mv_workout_quality (user_id, week_start);

-- -----------------------------------------------------------------------------
-- 3.8 Progression health
--
-- PR frequency, deload frequency, stall events per user.
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_progression_health AS
SELECT
  user_id,
  date_trunc('week', occurred_at)::date AS week_start,
  COUNT(*) FILTER (WHERE event_name = 'progression.pr.detected') AS pr_count,
  COUNT(*) FILTER (WHERE event_name = 'progression.deload.applied') AS deload_count,
  COUNT(*) FILTER (WHERE event_name = 'progression.stall.detected') AS stall_count
FROM public.analytics_events
WHERE event_name LIKE 'progression.%' AND user_id IS NOT NULL
GROUP BY 1, 2;

CREATE UNIQUE INDEX IF NOT EXISTS mv_progression_health_uniq
  ON public.mv_progression_health (user_id, week_start);

-- -----------------------------------------------------------------------------
-- 3.9 Performance and reliability
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_api_latency_daily AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  properties->>'endpoint' AS endpoint,
  COUNT(*) AS samples,
  percentile_disc(0.5)  WITHIN GROUP (ORDER BY (properties->>'duration_ms')::numeric) AS p50_ms,
  percentile_disc(0.95) WITHIN GROUP (ORDER BY (properties->>'duration_ms')::numeric) AS p95_ms,
  percentile_disc(0.99) WITHIN GROUP (ORDER BY (properties->>'duration_ms')::numeric) AS p99_ms,
  COUNT(*) FILTER (WHERE (properties->>'status')::int >= 500) AS server_errors,
  COUNT(*) FILTER (WHERE (properties->>'status')::int >= 400) AS client_errors
FROM public.analytics_events
WHERE event_name = 'perf.api_latency'
  AND properties ? 'duration_ms'
  AND properties ? 'endpoint'
GROUP BY 1, 2
ORDER BY 1 DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_api_latency_daily_uniq
  ON public.mv_api_latency_daily (day, endpoint);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_sync_health_daily AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  COUNT(*) FILTER (WHERE event_name = 'sync.queue.flushed') AS flushes,
  SUM((properties->>'processed')::int) FILTER (WHERE event_name = 'sync.queue.flushed') AS processed,
  SUM((properties->>'succeeded')::int) FILTER (WHERE event_name = 'sync.queue.flushed') AS succeeded,
  COUNT(*) FILTER (WHERE event_name = 'sync.failed') AS failures,
  COUNT(*) FILTER (WHERE event_name = 'sync.dropped') AS dropped
FROM public.analytics_events
WHERE event_name LIKE 'sync.%'
GROUP BY 1
ORDER BY 1 DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_sync_health_daily_uniq
  ON public.mv_sync_health_daily (day);

-- -----------------------------------------------------------------------------
-- 3.10 UX friction
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_rage_taps AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  properties->>'screen' AS screen,
  properties->>'target' AS target,
  COUNT(*) AS events,
  COUNT(DISTINCT user_id) AS unique_users
FROM public.analytics_events
WHERE event_name = 'ux.rage_tap'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 4 DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_rage_taps_uniq
  ON public.mv_rage_taps (day, screen, target);

COMMIT;

-- =============================================================================
-- 4. Optional: monthly partitioning (run after the warehouse outgrows a single
-- table). Commented out — uncomment and run during a maintenance window.
-- =============================================================================
-- CREATE EXTENSION IF NOT EXISTS pg_partman;
-- SELECT partman.create_parent(
--   p_parent_table => 'public.analytics_events',
--   p_control      => 'occurred_at',
--   p_type         => 'native',
--   p_interval     => 'monthly',
--   p_premake      => 6
-- );

-- =============================================================================
-- 5. Refresh helper. Schedule via Supabase cron:
--    SELECT cron.schedule('analytics-refresh', '*/10 * * * *', $$SELECT public.refresh_analytics_views()$$);
-- =============================================================================
CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dau;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_wau;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_activation;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_weekly_cohort_retention;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_weekly_adherence;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_onboarding_funnel;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_workout_dropoff;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_workout_quality;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_progression_health;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_api_latency_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_sync_health_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_rage_taps;
END;
$$;

COMMENT ON FUNCTION public.refresh_analytics_views IS
  'Refreshes all analytics materialized views. Schedule via pg_cron every 10–15 minutes.';
