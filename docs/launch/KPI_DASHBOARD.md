# KPI Dashboard — Alpha

The alpha is judged on two dashboards: **Reliability** (daily) and
**Product** (weekly). Both read from the materialized views built in
`database/007_analytics_warehouse.sql`. They are intentionally small
and re-use what already exists.

This document is the single source for: which question we ask, which
view answers it, the SQL we run, and the threshold that triggers an
action.

---

## Dashboard 1 — Reliability (daily)

**Cadence**: refreshed every 10 minutes (MV refresh job), reviewed once
per day at the rollout standup.

**Owner**: on-call engineer.

### R1. Crash-free sessions

Question — *what fraction of sessions ended without a crash yesterday?*

Source — Sentry "Crash Free Sessions" widget (primary). Cross-check with
the absence of `error.crash` events client-side.

Threshold — alert <99%, hard rollback <97%.

### R2. Sync failure rate

```sql
SELECT
  day,
  failures,
  succeeded,
  ROUND(failures::numeric / NULLIF(succeeded + failures, 0), 4) AS failure_rate
FROM public.mv_sync_health_daily
WHERE day >= current_date - INTERVAL '14 day'
ORDER BY day DESC;
```

Threshold — alert >5%, hard rollback >10%.

### R3. API latency (p95)

```sql
SELECT day, endpoint, samples, p50_ms, p95_ms, p99_ms,
       server_errors, client_errors
FROM public.mv_api_latency_daily
WHERE day >= current_date - INTERVAL '7 day'
  AND endpoint IN (
    '/v1/workouts/today',
    '/v1/workouts/complete',
    '/v1/dashboard/summary',
    '/v1/plans/generate'
  )
ORDER BY day DESC, endpoint;
```

Thresholds — alert if any of:
- `/workouts/complete` p95 >800 ms,
- `/workouts/today` p95 >500 ms,
- `/dashboard/summary` p95 >500 ms,
- `/plans/generate` p95 >2000 ms,
- `server_errors / samples >1%`.

### R4. UX friction — rage taps

```sql
SELECT day, screen, target, events, unique_users
FROM public.mv_rage_taps
WHERE day >= current_date - INTERVAL '7 day'
ORDER BY day DESC, events DESC
LIMIT 25;
```

Threshold — same screen/target appearing 3 days in a row with >5 unique
users → open a P2 UX bug.

### R5. Onboarding funnel snapshot

```sql
SELECT step_index, step_key, viewed, completed, back_tracked,
       ROUND(completed::numeric / NULLIF(viewed, 0), 3) AS completion_rate
FROM public.mv_onboarding_funnel
ORDER BY step_index;
```

Threshold — any step with `completion_rate <0.80` and `viewed >50` →
investigate the step that day.

---

## Dashboard 2 — Product (weekly)

**Cadence**: reviewed every Monday during the weekly review (~45 min).

**Owner**: product lead, with engineering attending.

### P1. Activation (signup → first workout)

```sql
SELECT
  date_trunc('week', signed_up_at)::date AS signup_week,
  COUNT(*)                                AS signups,
  COUNT(*) FILTER (WHERE activated_within_7d) AS activated_7d,
  ROUND(
    COUNT(*) FILTER (WHERE activated_within_7d)::numeric
    / NULLIF(COUNT(*), 0),
    3
  ) AS activation_rate_7d,
  ROUND(AVG(days_to_first_workout) FILTER (WHERE activated_within_7d)::numeric, 2)
    AS avg_days_to_first_workout
FROM public.mv_activation
WHERE signed_up_at >= current_date - INTERVAL '8 week'
GROUP BY 1
ORDER BY 1 DESC;
```

Thresholds — Phase 1 ≥60%, Phase 2 ≥50%, Phase 3 ≥35%.

### P2. Cohort retention triangle

```sql
SELECT
  cohort_week,
  cohort_size,
  ROUND(SUM(retained_users) FILTER (WHERE week_offset = 1)::numeric / NULLIF(cohort_size, 0), 3) AS w1,
  ROUND(SUM(retained_users) FILTER (WHERE week_offset = 2)::numeric / NULLIF(cohort_size, 0), 3) AS w2,
  ROUND(SUM(retained_users) FILTER (WHERE week_offset = 3)::numeric / NULLIF(cohort_size, 0), 3) AS w3,
  ROUND(SUM(retained_users) FILTER (WHERE week_offset = 4)::numeric / NULLIF(cohort_size, 0), 3) AS w4
FROM public.mv_weekly_cohort_retention
WHERE cohort_week >= current_date - INTERVAL '8 week'
GROUP BY 1, cohort_size
ORDER BY cohort_week DESC;
```

Targets — see `ALPHA_LAUNCH.md` §5 (W1 ≥40% by phase 3).

### P3. Workout completion + drop-off

```sql
SELECT day, sessions_started, sessions_completed, sessions_cancelled,
       completion_rate, avg_set_abandoned_at
FROM public.mv_workout_dropoff
WHERE day >= current_date - INTERVAL '4 week'
ORDER BY day DESC;
```

Threshold — `completion_rate <0.75` for 3 consecutive days → open a P2
UX review of the workout screen.

### P4. Weekly adherence distribution

```sql
WITH last_week AS (
  SELECT *
  FROM public.mv_weekly_adherence
  WHERE week_start = date_trunc('week', current_date)::date - INTERVAL '7 day'
)
SELECT
  CASE
    WHEN avg_adherence_score >= 0.85 THEN 'green'
    WHEN avg_adherence_score >= 0.65 THEN 'yellow'
    ELSE 'red'
  END AS band,
  COUNT(*) AS users,
  ROUND(AVG(completed_workouts)::numeric, 2)   AS avg_completed_workouts,
  ROUND(AVG(volume_adherence_pct)::numeric, 3) AS avg_volume_adherence
FROM last_week
GROUP BY 1
ORDER BY 1;
```

Threshold — `red` band >25% of weekly actives → review workout difficulty
calibration.

### P5. Progression health

```sql
SELECT
  week_start,
  COUNT(DISTINCT user_id) AS users,
  SUM(pr_count)           AS prs,
  SUM(deload_count)       AS deloads,
  SUM(stall_count)        AS stalls
FROM public.mv_progression_health
WHERE week_start >= current_date - INTERVAL '6 week'
GROUP BY 1
ORDER BY 1 DESC;
```

Heuristic flags:

- `stalls > prs` for two consecutive weeks → progression engine too slow.
- `deloads > 30%` of active users in a week → fatigue model too aggressive.
- `prs ≈ 0` after week 2 → progression engine not firing.

### P6. Quality of completed workouts

```sql
SELECT
  week_start,
  COUNT(DISTINCT user_id)        AS users,
  ROUND(AVG(avg_adherence), 3)   AS avg_adherence,
  ROUND(AVG(avg_duration_minutes), 1) AS avg_duration_min,
  SUM(total_sets)                AS total_sets
FROM public.mv_workout_quality
WHERE week_start >= current_date - INTERVAL '6 week'
GROUP BY 1
ORDER BY 1 DESC;
```

Threshold — `avg_duration_min >75` or `<25` → review prescribed session
length distribution.

---

## Review cadence (operating rhythm)

| Frequency | What | Who | Duration | Output |
|-----------|------|-----|---------:|--------|
| Daily 09:00 | Reliability dashboard + on-call queue | On-call | 15 min | Slack standup note |
| Friday PM | Tester feedback themes | On-call + product | 30 min | Top-3 themes posted |
| Monday AM | Product dashboard + phase decision | Product + eng lead | 45 min | Phase go/no-go, KPI doc updated |
| End of phase | Phase retro | Whole team | 60 min | Phase report (1 page) |

### Phase report template (1 page)

```
Phase: <0/1/2/3>     Dates: <start–end>     Testers: <N>

Outcome KPIs
- Activation 7d:      <x%>  (target: <y%>)
- W1 retention:       <x%>
- Workout completion: <x%>
- Avg adherence:      <x>

Reliability KPIs
- Crash-free sessions: <x%>
- Sync failure rate:   <x%>
- API p95 critical:    <x ms>

Top issues fixed:
1. ...
Top open risks:
1. ...
Decision: GO / HOLD / ROLLBACK to phase <n>
```

---

## Crash thresholds (single source of truth)

| Window | Crash-free sessions | Action |
|--------|--------------------:|--------|
| Last 1 h | <95% | Alert on-call, investigate within 30 min |
| Last 24 h | <99% | Alert on-call, OTA hotfix candidate |
| Last 24 h | <97% | **Hard rollback** (republish previous OTA) |
| Last 7 d  | <99.5% | Block phase escalation |

Cross-reference Sentry "Crash Free Sessions" + client-side `error.crash`
events. If the two disagree by more than 1pp the disagreement itself is
a P2 (telemetry pipeline issue).

---

## Rollback triggers (mirror of `ALPHA_LAUNCH.md` §6)

Hard — rollback within 2 hours:

- Crash-free sessions <97% / 24 h.
- Sync failure rate >10% / 24 h.
- `/workouts/complete` 5xx >1% / 24 h.
- Reproducible P1.
- Data integrity incident.

Soft — review within 24 h:

- Activation drop >20pp phase-over-phase.
- W1 retention drop >15pp phase-over-phase.
- Workout completion rate <70% / 7 d.
- ≥3 qualitative complaints on the same theme.

---

## Dashboard implementation notes

- Tool: **Metabase** (cheap, fast, plays well with Supabase). Each
  query above maps to one Metabase question; questions are grouped into
  the two dashboards described.
- Refresh: every 10 minutes via the existing `refresh_analytics_views()`
  function (already scheduled in `database/007_analytics_warehouse.sql`).
- Access: read-only DB role with `SELECT` on `public.mv_*` and
  `analytics_events`. Do **not** give Metabase read access to PII tables
  (`profiles`, `workout_logs`, `body_measurements`).
- Annotations: Metabase annotations are used to mark release/OTA dates;
  this is how we visually correlate KPI dips with deploys.
