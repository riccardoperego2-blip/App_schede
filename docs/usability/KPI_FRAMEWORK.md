# Usability KPI Framework

The KPI framework answers one question: **is the app getting faster,
clearer, less heavy, and more robust between rounds?** It bridges what
the observation sheets see and what the analytics warehouse measures.

It also pins down the **critical UX thresholds** below which we hold
phase progression in the launch playbook.

---

## 1. The five core KPIs

We keep the list short. More KPIs would dilute the iteration meeting.

| # | KPI | What it measures | Source |
|--:|-----|------------------|--------|
| K1 | Time-to-log-set (TTL-set) | Median seconds from set finished to set logged | Stopwatch (in-gym) + `workout.set_completed` deltas |
| K2 | Time-to-start-workout (TTS) | Median seconds from app open to "Start workout" tapped | `screen.viewed:dashboard` → `workout.started` |
| K3 | First-try success rate (FTSR) | % of scenario steps completed without help / back-track | Observation sheet + scenario log |
| K4 | Rage-tap rate per session (RTR) | `ux.rage_tap` events per active session | `mv_rage_taps` / sessions |
| K5 | Session abandonment rate (SAR) | `workout.cancelled` / `workout.started` per week | `mv_workout_dropoff.completion_rate` (complement) |

These five are the **only** numbers we put on the round scorecard
header. Everything else is a drill-down.

---

## 2. Drill-down KPIs (per friction axis)

Used in the optimization backlog discussion, not on the scorecard.

### Speed

- TTL-set p50 / p95
- Time-to-first-meaningful-paint on `workout_session` (p95)
- Time-to-resume after backgrounding (p95)
- Set logging actions per minute, fatigue-state (script B)

### Clarity

- Verbal questions per session (mean)
- Back-tracks per session (mean)
- Onboarding step completion (`mv_onboarding_funnel`)
- Onboarding step back-tracked rate (`mv_onboarding_funnel.back_tracked / viewed`)

### Cognitive load

- Fatigue-state vs baseline TTL-set ratio (target ≤1.5×)
- Hesitations per session (mean)
- Notice failures per session (mean)
- "What does X mean?" count per session

### Robustness

- Scenario success rate on scenarios 2, 5, 6, 8, 10, 12 (mandatory)
- Offline scenario success rate (scenario 7)
- Sweaty-hand TTL-set vs baseline (script C)
- One-handed grip-shift count per session (script D)

---

## 3. Benchmark targets

Targets are **internal** and **versioned**. They move when we hit them
twice in a row.

### 3.1 Speed targets

| Metric | Phase 1 | Phase 2 | Phase 3 | Method |
|--------|--------:|--------:|--------:|--------|
| TTL-set p50 (baseline, in-gym) | ≤6 s | ≤4 s | ≤3 s | Stopwatch + analytics deltas |
| TTL-set p50 (fatigue state, script B) | ≤9 s | ≤6 s | ≤5 s | Script B stopwatch |
| TTS p50 | ≤6 s | ≤5 s | ≤4 s | `screen.viewed` → `workout.started` |
| Time-to-resume (background→workout) p95 | ≤2.0 s | ≤1.5 s | ≤1.2 s | App lifecycle hook + analytics |
| Set-logging actions per minute (warm) | ≥6 | ≥8 | ≥10 | Script B |
| First-meaningful-paint `workout_session` p95 | ≤2.0 s | ≤1.5 s | ≤1.2 s | `perf.screen_load` |

### 3.2 Clarity targets

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|--------:|--------:|--------:|
| FTSR on mandatory scenarios | ≥70% | ≥85% | ≥90% |
| Verbal questions per session | ≤3 | ≤2 | ≤1 |
| Back-tracks per session | ≤4 | ≤2 | ≤1 |
| Onboarding step completion (worst step) | ≥75% | ≥85% | ≥90% |
| Onboarding back-track rate per step | ≤20% | ≤15% | ≤10% |

### 3.3 Cognitive-load targets

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|--------:|--------:|--------:|
| Fatigue/baseline TTL-set ratio | ≤2.0× | ≤1.7× | ≤1.5× |
| Hesitations per session | ≤6 | ≤3 | ≤2 |
| Notice failures per session | ≤3 | ≤2 | ≤1 |

### 3.4 Robustness targets

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|--------:|--------:|--------:|
| Scenario 5 (timer + logging) success | ≥70% | ≥85% | ≥95% |
| Scenario 7 (offline) success | ≥70% | ≥85% | ≥95% |
| Scenario 12 (undo) success | ≥60% | ≥80% | ≥95% |
| Sweaty/baseline TTL-set ratio | ≤2.0× | ≤1.7× | ≤1.4× |
| One-handed grip shifts per session | ≤3 | ≤2 | ≤1 |

---

## 4. Critical UX thresholds (hold lines)

When **any** of these breach in a round, we **hold the next launch
phase**. Same governance as the launch playbook's rollback triggers —
the goal is to refuse to scale a broken experience to more testers.

| Threshold | Breach if… | Consequence |
|----------|------------|-------------|
| K1 TTL-set p50 | ≥1.5× the current target | Hold phase, dedicated UX sprint on the workout screen |
| K3 FTSR (mandatory scenarios) | <60% | Hold phase, re-run with revised script |
| K4 Rage-tap rate | >1.0 per session per active user | Hold phase, audit `+rep` / `+set` / `complete` targets |
| K5 SAR (weekly) | >25% | Hold phase, focused session-completion research |
| Onboarding worst step completion | <70% | Hold phase 2 invites |
| Scenario 12 (undo) success | 0 in a full round | Hold phase, prioritize undo path |

These mirror the rollback triggers in
[`../launch/ALPHA_LAUNCH.md`](../launch/ALPHA_LAUNCH.md) §6 — usability
holds are softer (no traffic rollback), but they block expansion.

---

## 5. Analytics mapping (read-only, no new events)

All KPI math runs against the existing materialized views from
`database/007_analytics_warehouse.sql` and the existing event taxonomy.
No backend change required.

### K1 — TTL-set (analytics-side approximation)

```sql
-- Median seconds between consecutive set completions per session
WITH set_events AS (
  SELECT
    user_id,
    properties->>'workout_day_id' AS workout_day_id,
    occurred_at,
    LAG(occurred_at) OVER (
      PARTITION BY user_id, properties->>'workout_day_id'
      ORDER BY occurred_at
    ) AS prev_occurred_at
  FROM public.analytics_events
  WHERE event_name = 'workout.set_completed'
    AND occurred_at >= current_date - INTERVAL '14 day'
)
SELECT
  date_trunc('day', occurred_at)::date AS day,
  percentile_disc(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (occurred_at - prev_occurred_at))
  ) AS ttl_set_p50_s,
  percentile_disc(0.95) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (occurred_at - prev_occurred_at))
  ) AS ttl_set_p95_s
FROM set_events
WHERE prev_occurred_at IS NOT NULL
  AND occurred_at - prev_occurred_at BETWEEN INTERVAL '5 second' AND INTERVAL '10 minute'
GROUP BY 1
ORDER BY 1 DESC;
```

The lower bound (5 s) filters out duplicate fires; the upper bound
(10 min) filters out true breaks between exercises.

### K2 — Time-to-start-workout

```sql
WITH starts AS (
  SELECT
    user_id,
    occurred_at AS started_at,
    (
      SELECT MAX(s.occurred_at)
      FROM public.analytics_events s
      WHERE s.user_id = e.user_id
        AND s.event_name = 'screen.viewed'
        AND s.properties->>'screen' = 'dashboard'
        AND s.occurred_at < e.occurred_at
        AND s.occurred_at >= e.occurred_at - INTERVAL '5 minute'
    ) AS dashboard_seen_at
  FROM public.analytics_events e
  WHERE e.event_name = 'workout.started'
    AND e.occurred_at >= current_date - INTERVAL '14 day'
)
SELECT
  date_trunc('day', started_at)::date AS day,
  percentile_disc(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (started_at - dashboard_seen_at))
  ) AS tts_p50_s
FROM starts
WHERE dashboard_seen_at IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;
```

### K3 — First-try success rate

FTSR has no clean analytics signal. Source is the observation sheet.
However, a **proxy** alarm exists for trend tracking:

```sql
-- Proxy: scenarios touched on the workout screen that ended in cancel
SELECT
  date_trunc('week', occurred_at)::date AS wk,
  COUNT(*) FILTER (WHERE event_name = 'workout.cancelled')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE event_name = 'workout.started'), 0)
    AS cancel_proxy
FROM public.analytics_events
WHERE event_name IN ('workout.started', 'workout.cancelled')
  AND occurred_at >= current_date - INTERVAL '8 week'
GROUP BY 1
ORDER BY 1 DESC;
```

### K4 — Rage-tap rate

```sql
SELECT
  date_trunc('week', day)::date AS wk,
  SUM(events)::numeric / NULLIF(SUM(unique_users), 0) AS rage_taps_per_user_session
FROM public.mv_rage_taps
WHERE day >= current_date - INTERVAL '8 week'
GROUP BY 1
ORDER BY 1 DESC;
```

### K5 — Session abandonment rate

```sql
SELECT day, sessions_started, sessions_cancelled,
       ROUND(sessions_cancelled::numeric / NULLIF(sessions_started, 0), 3) AS sar
FROM public.mv_workout_dropoff
WHERE day >= current_date - INTERVAL '4 week'
ORDER BY day DESC;
```

---

## 6. Combining qualitative + quantitative (per round)

The round scorecard pulls four numbers from analytics, four from the
observation sheets:

```
ROUND HEADER
  K1 TTL-set p50 (analytics):      ___ s    (target ___ s)
  K2 TTS p50 (analytics):          ___ s    (target ___ s)
  K4 RTR (analytics):              ___ /s   (target ___)
  K5 SAR (analytics):              ___ %    (target ___ %)

  TTL-set p50 (in-gym, observed):  ___ s
  FTSR (observation, mandatory):    ___ %
  Verbal Q per session (observed):  ___
  Cancel events (observed):         ___
```

Discrepancies between analytics and observation are themselves a
finding. If TTL-set is 3 s in analytics but 6 s in-gym, either we are
under-counting in analytics (e.g. background flush) or testers
behave differently when observed. Either way: write it down.

---

## 7. Review cadence

- **Daily during a round**: spot-check the friction log; no KPI review.
- **End of round (every 2 weeks)**: KPIs vs benchmarks; scorecard;
  optimization backlog grooming.
- **Monthly**: benchmark targets review. Move a target up only when it
  was met in two consecutive rounds.
- **Quarterly**: re-derive K1–K5 weights and confirm we still measure
  the right things. Removing a KPI is allowed; adding requires a
  written motivation tied to a recurring blind spot.
