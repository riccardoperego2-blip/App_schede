# Product Analytics & Telemetry System

Production telemetry for the Schede fitness platform. The system exists to
answer one question: **is the product helping athletes train better and stay
engaged?** Every event, KPI, and dashboard is chosen against that goal.
Vanity metrics are explicitly excluded.

The system spans three layers:

1. A strictly-typed mobile SDK that buffers events and ships them in batches.
2. A NestJS ingestion endpoint that authenticates, deduplicates, and persists.
3. A PostgreSQL warehouse with materialized views feeding dashboards.

## 1. Design principles

- **Outcome-driven.** Every event we track must trace back to a product
  decision: retention, adherence, workout quality, progression, friction.
- **Deterministic taxonomy.** Strict naming, strict schema, strict types. No
  ad-hoc `properties` fields.
- **Server-side is the source of truth** for outcomes (retention, PRs,
  adherence). Client-side is for funnels and friction only.
- **Privacy by default.** No PII in `properties`. User identity propagates
  by id from the authenticated principal, never from the payload.
- **Offline-correct.** The mobile SDK must never lose events because of a
  bad gym network, and must never block training while flushing.
- **Idempotent ingestion.** Every event carries an `event_id` and the
  warehouse deduplicates on it.
- **Composable warehouse.** All KPIs are materialized views on top of a
  single event table. No second pipeline to maintain.

## 2. Event taxonomy

### Naming convention

`<domain>.<entity?>.<action>` in snake_case past tense.

- `domain` is the product surface (`workout`, `onboarding`, `auth`, etc.).
- `entity` is optional and only used when a domain has clear nested nouns
  (e.g. `workout.set.completed`, `workout.rest.skipped`).
- `action` is a verb in the past tense (`started`, `completed`, `skipped`,
  `failed`, `viewed`). Present-tense names like `tap` are forbidden.

Examples of acceptable names:

```
app.session.started
auth.signin.succeeded
onboarding.step.completed
screen.viewed
workout.set.completed
progression.pr.detected
sync.queue.flushed
ux.rage_tap
perf.api_latency
error.api
```

### Categories

The `analytics_event_category` enum is the coarse axis used in dashboards:

```
app | auth | onboarding | screen | workout | progression
sync | feature | notification | perf | ux | error
```

### What we track (and why)

| Event | Why we need it |
|-------|----------------|
| `app.session.started` | Reach, cold-start frequency, app version distribution |
| `auth.signin.succeeded` / `.failed` | Auth funnel health, OAuth method mix |
| `onboarding.step.viewed` / `.completed` / `.back_tracked` / `.abandoned` | Onboarding funnel, drop-off points |
| `screen.viewed` | Section reach, navigation patterns |
| `workout.started` | Sessions started, deload week mix |
| `workout.paused` / `.resumed` / `.cancelled` | Session continuity, abandonment point |
| `workout.set.completed` / `.skipped` / `.missed_target` | Per-set engagement, adherence quality |
| `workout.exercise.skipped` / `.replaced` | Exercise relevance, equipment friction |
| `workout.rest.started` / `.extended` / `.skipped` | Rest behavior, plan calibration |
| `workout.pain.reported` | Safety signal, exercise replacement triggers |
| `workout.completed` | Outcome of the session — primary adherence anchor |
| `progression.pr.detected` | Progress signal, motivation surfaces |
| `progression.deload.applied` | Fatigue management correctness |
| `progression.stall.detected` | Plan calibration health |
| `progression.plan.generated` | Plan churn, regeneration patterns |
| `sync.queue.enqueued` / `.flushed` / `.failed` / `.dropped` | Offline correctness, reliability |
| `notification.received` / `.opened` | Reactivation effectiveness |
| `feature.used` | Adoption of secondary surfaces |
| `perf.api_latency` | Backend latency budget compliance |
| `perf.screen_load` | Mobile responsiveness |
| `ux.rage_tap` / `ux.keyboard_frustration` | Friction hot spots |
| `error.api` / `error.app.crashed` | Reliability budget |

### What we deliberately **do not** track

- Generic page-view ping events with no product hypothesis behind them.
- Click events on every button. Only events that map to a KPI.
- Scroll depth.
- Cursor movement / heatmap data.
- Plain user-typing inputs. We never want PII like body weight in event
  properties — that data flows through domain endpoints with RLS.
- Device fingerprinting beyond OS, app version, locale.
- Engagement vanity counters that do not feed a decision.

## 3. Event schema

Every event carries the same envelope:

```ts
interface AnalyticsEventEnvelope {
  event_id: string;            // SDK-generated UUID; primary idempotency key
  name: AnalyticsEventName;    // discriminator
  category: AnalyticsCategory; // coarse axis
  properties: Record<string, unknown>;
  occurred_at: string;         // ISO; client clock — never used for retention
  client_session_id: string;   // groups events into one app run
  app_version: string;
  os: 'ios' | 'android';
  os_version: string;
  locale: string;
  schema_version: 1;
}
```

The wire format is JSON. Server-side enforced rules:

- `name` must match `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,3}$`.
- `category` must be one of the enum values.
- `properties` is a JSON object; nested keys are tolerated but discouraged.
- `received_at` (server clock) is stamped server-side and is the only
  timestamp used in retention math.

TypeScript event union: see `apps/mobile/src/lib/analytics/events.ts`.

## 4. Client telemetry architecture

```
features/* / hooks/*  ───┐
                          ▼
                  analytics.track(event)         ← typed against AnalyticsEvent
                          │
                          ▼
              ┌──────────────────────────┐
              │ AnalyticsTracker (singleton)
              │  - identify(userId, locale)
              │  - track(...)
              │  - rageTap(screen, target)
              │  - perfApiLatency(...)
              │  - flush(reason)
              └──────────────────────────┘
                          │
                          ▼
                AnalyticsQueue  (MMKV, FIFO, bounded 1000)
                          │
            AppState change ─┤
            onlineManager ───┤
            interval 15s ────┤
                          ▼
               httpAnalyticsTransport
                  POST /v1/analytics/events
```

Key behaviors:

- **Strict typing.** `track()` accepts only the `AnalyticsEvent` discriminated
  union. Wrong property names fail at compile time.
- **Persistence.** The queue is MMKV-backed — events survive force-quit.
- **Bounded buffer.** Hard cap at 1,000 envelopes. On overflow, we drop the
  oldest because the most recent events are far more valuable.
- **Batching.** Up to 50 events per request, up to 5 batches per flush tick.
- **Triggers.** Flush on foreground, online, every 15s, and on demand.
- **Backoff.** On retryable transport errors, the batch stays in the queue;
  the next flush retries. Non-retryable failures (malformed payload) are
  acked locally to avoid poison-pill loops.
- **Identity.** The tracker only ever carries `userId`, `locale`, `os`,
  `appVersion`. Anything sensitive stays out.
- **Consent.** The tracker checks the consent flag (settings store) on every
  `track()` call. Error and crash events are exempt because they are
  required for reliability.

Files:

- `apps/mobile/src/lib/analytics/events.ts` — event contracts.
- `apps/mobile/src/lib/analytics/queue.ts` — persistent FIFO.
- `apps/mobile/src/lib/analytics/rage-tap-detector.ts` — friction detector.
- `apps/mobile/src/lib/analytics/transport.ts` — HTTP transport.
- `apps/mobile/src/lib/analytics/tracker.ts` — singleton SDK.
- `apps/mobile/src/hooks/use-screen-tracking.ts` — screen view + TTI helper.

Wiring example:

```ts
// In AppProviders.tsx after auth hydration
useEffect(() => {
  const stopTracker = analytics.start();
  return stopTracker;
}, []);

// On sign-in
analytics.identify(user.id, settings.language);

// In features
analytics.track({
  name: 'workout.started',
  category: 'workout',
  properties: { workout_day_id, plan_version_id, ... },
});
```

## 5. Backend ingestion pipeline

```
mobile client ──POST /v1/analytics/events──▶ AnalyticsController
                                                │
                                                ▼
                                  AnalyticsIngestionService
                                  - dedupe by event_id (in-batch + DB)
                                  - validate occurred_at
                                  - stamp user_id from JWT
                                  - one multi-row INSERT
                                                │
                                                ▼
                                  public.analytics_events
                                  (idempotent on event_id)
```

Hardening:

- `SupabaseAuthGuard` ensures `userId` is the verified principal.
- `@Throttle({ limit: 60, ttl: 60_000 })` rate-limits clients.
- `class-validator` enforces envelope shape and the naming regex.
- Batch is capped at 200 events to keep latency bounded.
- The endpoint is `HttpCode(202)` because we accept events asynchronously;
  the SDK does not need a synchronous result.

In parallel, the existing `AnalyticsService` listens to **domain events**
(`workout.*`, `plan.*`) emitted by NestJS application services and writes
them to the same table with `os = 'server'`. This is the authoritative
feed for outcome KPIs because it cannot be tampered with by the client.

## 6. Warehouse design

One table, many materialized views. Schema: see `database/007_analytics_warehouse.sql`.

Core table `public.analytics_events`:

```sql
event_id            text       UNIQUE NOT NULL   -- idempotency key
user_id             uuid       NULLABLE          -- authenticated principal
client_session_id   text
category            enum
event_name          text
properties          jsonb
occurred_at         timestamptz                  -- client clock
received_at         timestamptz                  -- server clock (use for retention)
app_version         text
os                  text
os_version          text
client_locale       text
```

Indexes:

- `(user_id, occurred_at desc)` — user dashboards.
- `(event_name, occurred_at desc)` — funnels.
- `(category, occurred_at desc)` — category breakdowns.
- `(client_session_id, occurred_at desc)` — session replay walks.
- GIN `(properties)` — JSONB property filters.
- UNIQUE `(event_id)` — dedupe.

Materialized views shipped today:

| View | Purpose |
|------|---------|
| `mv_dau`, `mv_wau` | DAU / WAU |
| `mv_activation` | Signup → first workout activation in 7 days |
| `mv_weekly_cohort_retention` | Signup-week cohort retention |
| `mv_weekly_adherence` | Adherence per user per week |
| `mv_onboarding_funnel` | Drop-off per onboarding step |
| `mv_workout_dropoff` | Where users abandon sessions |
| `mv_workout_quality` | Adherence + duration + volume per user/week |
| `mv_progression_health` | PRs, deloads, stalls per user/week |
| `mv_api_latency_daily` | p50/p95/p99 per endpoint |
| `mv_sync_health_daily` | Offline flush reliability |
| `mv_rage_taps` | UX friction per screen/target |

Refresh: `SELECT public.refresh_analytics_views()` every 10–15 minutes via
`pg_cron`. All views use `REFRESH CONCURRENTLY` and are safe to run while
queries are in flight.

Scale strategy:

- Up to ~50M rows: stay on a single Postgres table with monthly indexes.
- Beyond that: partition on `occurred_at` monthly via `pg_partman`
  (template SQL is included, commented).
- For real-time analytics workloads (>200M events/year), promote
  `analytics_events` to a TimescaleDB hypertable and replace MVs with
  continuous aggregates.

## 7. KPI definitions

### Retention

- **D1, D7, D30 retention** by signup cohort. A user is retained in window
  W if there exists at least one `workout.completed` or
  `app.session.started` event in week W after the signup week.
- **Activation rate.** `% users whose first workout.completed occurs within
  7 days of signup`. Reported per signup week.
- **WAU / MAU.** Standard Mixpanel-style definition over `received_at`.
- **Stickiness.** `DAU / MAU` rolling 28d.

Formula reference (psql shorthand):

```sql
-- D7 retention
SELECT
  cohort_week,
  retained_users::float / NULLIF(cohort_size, 0) AS d7
FROM public.mv_weekly_cohort_retention
WHERE week_offset = 1;
```

### Adherence

Two complementary metrics:

- **Workout adherence** = `completed_workouts / planned_workouts`
  per ISO week per user. Source: `workout.completed` events whose
  `properties.completed_set_count` and `properties.planned_set_count`
  are non-null. Stored in `mv_weekly_adherence.volume_adherence_pct`.
- **Set-level adherence** = `completed_sets / planned_sets`. Detects
  partial sessions that the workout-level metric hides.

Threshold buckets used in dashboards:

- `≥ 0.85` → green (on plan)
- `0.6 – 0.85` → yellow (drifting)
- `< 0.6` → red (at risk)

### Workout completion

- **Completion rate per day** = `workout.completed` / `workout.started`.
- **Average set abandoned at** = average `completed_set_count` of cancelled
  sessions. A leading indicator of plan misfit.
- **Average session duration** by goal and split.

### Drop-off

- **Onboarding drop-off** per step: `viewed - completed` for each step.
  Surfaces in `mv_onboarding_funnel`.
- **Workout drop-off** per exercise index. Built ad-hoc from
  `workout.cancelled` events filtered by goal/experience cohort.

### Progression quality

- **PR frequency** per user per week. Healthy ranges depend on training
  goal:
  - hypertrophy: 0.5–1.5 per week (estimated 1RM PRs allowed)
  - strength: 0.25–0.75 per week
  - beginner: 1–3 per week
- **Deload acceptance rate** = `progression.deload.applied` per user per
  mesocycle. Compare against backend prescription frequency.
- **Stall rate** = `progression.stall.detected` per active user per week.
  Persistent stalls flag plan calibration issues.

### Fatigue / recovery analytics

Computed from `workout.completed` properties `readiness_band` and
`adherence_score`:

- Distribution of `readiness_band` over time.
- Correlation between low readiness and missed-target sets.
- Auto-deload trigger rate vs manual override rate.

### Onboarding analytics

- **Step completion rate.**
- **Step abandonment time** = median `duration_ms` on `onboarding.step.completed`.
- **Back-track ratio** = `onboarding.step.back_tracked / onboarding.step.viewed`.
- **Plan-generated rate** = `onboarding.completed` / `onboarding.started`.

### Performance

- **API p50/p95/p99** per endpoint, daily. Alert when p95 > 800 ms or p99 > 2 s.
- **Screen TTI** per screen. Alert when p95 > 1.5 s on Dashboard,
  > 2 s on Workout session.
- **Crash-free sessions** = `1 - distinct(client_session_id with crash) / distinct(client_session_id)`.

### UX friction

- **Rage tap rate** per screen/target. Alert on sustained ≥ 0.5%
  rage taps over total taps on a given target.
- **Sync failure rate** = `sync.failed / sync.queue.flushed`. Alert if > 5%.

## 8. Dashboards

We do not build a single mega-dashboard. We build five role-aligned ones.

1. **Growth dashboard**
   - DAU/WAU/MAU
   - Activation rate by signup week
   - D1/D7/D30 retention triangle
   - Onboarding funnel
   - Reactivation from notifications

2. **Product/Engagement dashboard**
   - Workouts started / completed per day
   - Completion rate trend
   - Adherence distribution (green/yellow/red split)
   - Average session duration
   - Drop-off heatmap by exercise index

3. **Coaching quality dashboard**
   - PR frequency per cohort
   - Deload acceptance rate
   - Stall rate
   - Pain reports + actions taken
   - Workout-quality MV breakdown

4. **Reliability dashboard**
   - API p50/p95/p99 per endpoint
   - Crash-free sessions
   - Sync flush success and failure rates
   - Top error.api kinds by frequency

5. **UX friction dashboard**
   - Rage taps per screen
   - Keyboard frustration per field
   - Screen TTI distribution
   - Top abandoned screens

Suggested stack: Metabase or Superset reading the materialized views. Both
support row-level access, scheduled refresh, and embedding in a coach
back-office if needed later.

## 9. Alerting

Alerts must wake someone up only when a metric crosses a real threshold.
Each alert has an owner, a threshold, and a runbook. No generic anomaly
alerts.

| Alert | Threshold | Owner | Runbook |
|-------|-----------|-------|---------|
| D7 retention drops > 20% week-over-week | absolute delta on `mv_weekly_cohort_retention` | Growth | Check most recent release for regression |
| Activation rate < 35% for 2 consecutive cohorts | derived from `mv_activation` | Product | Investigate onboarding funnel |
| Completion rate < 70% (rolling 7d) | `mv_workout_dropoff.completion_rate` | Product | Investigate plan churn |
| API p95 > 800 ms on critical endpoint | `mv_api_latency_daily` | Backend | Check `/workouts/complete`, `/plans/generate` |
| Sync failure rate > 5% rolling 24h | `mv_sync_health_daily` | Backend | Check `analytics.controller`, RLS, throttling |
| Crash-free sessions < 99% | derived | Mobile | Triage Sentry |
| Pain reports with action `stop_exercise` > X per week | event count | Coaching | Review exercise selection rules |

Anomaly detection (phase 2): Prophet or Grafana ML over the daily MVs.
Use as guidance only — humans triage.

## 10. Privacy strategy (GDPR / CCPA)

- **No PII in properties.** Names, emails, weights, photos never travel
  in event properties. Identity propagates only by `user_id`, taken from
  the authenticated JWT — never from the client payload.
- **Consent gate.** The mobile SDK consults `settings.notificationsEnabled`
  today and should be migrated to a dedicated `telemetryConsent` setting.
  Error and crash events are exempt as legitimate interest.
- **Right to erasure.** On account deletion, set
  `analytics_events.user_id = null` (already enforced by the FK
  `ON DELETE SET NULL`), preserving aggregate counts without identifying
  the user.
- **Right to access / portability.** Export endpoint
  `GET /v1/me/analytics/export` returns all events where
  `user_id = auth.uid()`. Already permitted by RLS.
- **Data minimization.** No third-party SDK in MVP. We control the entire
  pipeline. If a third party is added later (Sentry, PostHog), the consent
  gate must be honored before initialization.
- **Retention.** Raw `analytics_events` rows older than 24 months are
  pruned by a scheduled job; aggregate MVs survive.

## 11. Performance considerations

Client:

- Tracker calls are sync and cheap (MMKV write).
- Flushes are bounded (5 batches × 50 events per tick).
- Rage-tap detection is per-target O(window-size).
- Property objects are kept small (under ~1 KB serialized).

Backend:

- Single multi-row insert per request — no N+1.
- Throttling caps individual abusers.
- No joins on insert. Reads happen only through MVs.

Warehouse:

- All KPIs are pre-aggregated MVs.
- Partition-ready for monthly chunks once the table grows.
- All MV refreshes are concurrent.

## 12. Edge cases

- **Client clock drift.** We never use `occurred_at` for retention math.
  Dashboards use `received_at` everywhere unless we explicitly want
  the user's local clock (e.g. workout duration).
- **Replayed batches.** `event_id` UNIQUE prevents duplication.
- **User signs out mid-session.** `client_session_id` keeps continuity;
  identity rotates server-side via the JWT.
- **Anonymous events.** Pre-auth events (sign-in failure) carry no
  `user_id`. The FK is nullable; the analytics table accepts them.
- **Bad payload.** The DTO validator rejects malformed envelopes with 400.
  The SDK then drops them locally instead of looping forever.
- **Battery / data caps.** Flushes are intervalized and only run while
  foregrounded or on online transition. Background flushing on iOS is
  intentionally not implemented to respect platform energy budgets.
- **Test data contamination.** Events from non-production builds carry
  `app_version` containing `dev` / `staging`; dashboards filter on
  `app_version NOT LIKE '%dev%'`.

## 13. Implementation roadmap

**Phase 1 — Foundation (this PR)**

- Strict event taxonomy and TypeScript contracts.
- Mobile SDK with persistent queue, batching, rage-tap, screen tracking.
- NestJS ingestion endpoint with auth, throttling, idempotency.
- Warehouse extension and 11 materialized views.
- Refresh function.

**Phase 2 — Dashboards & alerts**

- Metabase or Superset deployment.
- Build the five role dashboards listed above.
- Wire alerts in Grafana or BetterStack against MV thresholds.
- Add `telemetryConsent` setting to the mobile app.

**Phase 3 — Activation & reactivation**

- Notification → workout open attribution.
- Push notification effectiveness dashboard.
- Onboarding A/B experiment framework reading the funnel MV.

**Phase 4 — Adaptive coaching feedback loop**

- Feed weekly adherence / stall / pain MVs back into the
  `WorkoutGenerationEngine` to recalibrate volume targets per user.
- Detect cohorts where the coaching backend over-prescribes and adjust
  defaults.

**Phase 5 — Scale**

- Partition `analytics_events` monthly.
- Move heavy queries to Timescale continuous aggregates.
- Optional: replicate to BigQuery / Snowflake via Supabase + Airbyte for
  data team self-serve.

## 14. File map

```
apps/mobile/src/lib/analytics/
  events.ts                   # Typed event contracts (source of truth)
  queue.ts                    # Persistent FIFO buffer (MMKV)
  rage-tap-detector.ts        # UX friction heuristic
  transport.ts                # HTTP transport (POST /v1/analytics/events)
  tracker.ts                  # Singleton SDK (start/track/flush/identify)
  index.ts                    # Public exports

apps/mobile/src/hooks/
  use-screen-tracking.ts      # screen.viewed + perf.screen_load

apps/mobile/test/
  analytics-tracker.test.ts   # Queue, detector, tracker

apps/backend/src/modules/analytics/
  analytics.module.ts         # Wires controller + listener
  analytics.service.ts        # Server-side domain event listener
  api/analytics.controller.ts # POST /v1/analytics/events
  api/dto/ingest-events.dto.ts
  application/analytics-ingestion.service.ts

database/
  007_analytics_warehouse.sql # Schema extension + materialized views
```
