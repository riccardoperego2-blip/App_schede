# MVP Hardening & Reliability

The goal of this document is not to add features. It is to make the app
**survive the gym**: dead networks, sweaty hands, low battery, crashed
processes, expired tokens, slow servers, and old Android devices.

The system is designed around four invariants that we will not compromise:

1. **No logged set is ever lost.** Force-quit, crash, airplane mode, network
   blip — the user's logged work is durable from the moment the set is
   accepted into the store.
2. **No duplicate side effects.** Workout completions, profile updates, and
   analytics events are idempotent end-to-end via deterministic ids.
3. **The session screen does not stall.** Render budget is bounded; timer
   ticks are isolated; the screen survives slow APIs and offline mode.
4. **Recovery is automatic and silent.** Stale drafts, corrupted blobs,
   expired tokens, and tripped circuits are handled without exposing the
   user to a wall of errors.

## 1. Reliability checklist

Each row must hold before a release ships. Owners are individuals; tests are
either Jest unit, Maestro E2E, or a manual chaos drill.

| Area | Invariant | Owner | Verification |
|------|-----------|-------|--------------|
| Persistence | Workout draft survives force-quit | Mobile | `resume-after-kill.yaml` |
| Persistence | Corrupted JSON is quarantined, not crashed on | Mobile | `storage-corruption.test.ts` |
| Persistence | Stale drafts (>18h) are discarded on hydrate | Mobile | `workout-session.store.test.ts` |
| Sync | Completed workout reaches backend exactly once | Mobile + Backend | `offline-workout.yaml` + idempotency-key check |
| Sync | Retryable failures back off exponentially with jitter | Mobile | `offline-queue.test.ts` |
| Sync | `Retry-After` is honored | Mobile | manual fault injection |
| Auth | Expired token refreshes silently mid-request | Mobile | `auth-expiration.yaml` |
| Auth | Refresh failure routes back to sign-in cleanly | Mobile | manual |
| Race | Rapid completion taps never duplicate a set | Mobile | `rage-tap-protection.yaml` |
| Race | Pause/resume math never produces negative duration | Mobile | unit |
| Timer | Wall-clock jumps don't break rest countdown | Mobile | `monotonic-clock.test.ts` |
| Circuit | One bad endpoint cannot stall the whole app | Mobile | `circuit-breaker.test.ts` |
| Memory | Long session does not balloon memory linearly | Mobile | profiler drill |
| Render | Workout session keeps 60 FPS on iPhone 11 / Pixel 5 | Mobile | profiler drill |
| Observability | Crashes, sync failures, slow APIs surface in dashboards | Mobile + Data | analytics events present |

## 2. Failure matrix

The fundamental table for hardening. Each row: **failure → detection →
recovery → test**. If a row has no test, it's not protected.

| Failure | Detection | Recovery | Test |
|---------|-----------|----------|------|
| Total offline at workout start | Cached `useTodaysWorkout` data | Render from React Query persister; queue completion | `offline-workout.yaml` |
| Total offline at workout finish | `ApiError.isRetryable` | Enqueue in `offlineQueue`, surface "Saved offline" | `offline-workout.yaml` |
| Network switching mid-request | `AbortController` timeout, `ApiError.kind=network` | Single 401 refresh retry, then mutation queue | `use-complete-workout` tests |
| App force-closed mid-workout | Zustand persist + MMKV | Hydrate draft on next launch | `resume-after-kill.yaml` |
| App force-closed mid-flush | MMKV write atomic per event | Reload queue, replay remaining items | manual |
| Duplicate sync of same workout | Idempotency-Key on backend | Backend collapses on insert | backend unit |
| Auth token expired | 401 from backend | `supabase.auth.refreshSession()` + retry once | `auth-expiration.yaml` |
| Auth refresh fails | Refresh path returns false | `AuthGate` redirects to sign-in; draft preserved | manual |
| Slow backend (5s p95 spike) | Circuit breaker counts failures | Trip per endpoint; fail fast in UI | `circuit-breaker.test.ts` |
| One endpoint 5xx, others fine | Per-endpoint circuit key | Other endpoints unaffected | manual chaos |
| Rate limited (429 + Retry-After) | `ApiError.retryAfterMs` | Queue honors hint, backs off | unit |
| Storage corrupted (parse error) | `mmkvJson.get` catches | Quarantine blob, log, return undefined | `storage-corruption.test.ts` |
| Storage decoder rejects shape | `mmkvJson.getWithDecoder` | Quarantine, discard live key | `storage-corruption.test.ts` |
| Wall clock jumps (NTP / DST) | Monotonic clock detects drift | Re-anchor monotonic ref | `monotonic-clock.test.ts` |
| Timer interval starvation | `useRestTimer` reads `restEndsAt` not deltas | Recompute remaining from absolute time | unit |
| Stale workout draft (>18h) | `onRehydrateStorage` guard | Auto-cancel; user gets fresh plan | manual |
| Duplicate Complete-Set taps | `completeSet` is no-op when `set.completed` | First write wins | `rage-tap-protection.yaml` |
| Optimistic update rollback | React Query `onError` | Cache invalidate; UI re-syncs from server | manual |
| Realtime channel drops | Supabase auto-reconnect | Reattach on `useRealtimeNotifications` mount | manual |
| Memory pressure on Android | OOM kill | Persisted state + idempotent restart | manual |
| Hydration failure | `onRehydrateStorage` error path | Discard partial state; logger.error | `workout-session.store.test.ts` |
| Backend partial failure (Postgres ok, outbox not) | UoW transactional outbox | Single commit boundary; consistent state | backend unit |
| Analytics queue corrupted | Decoder pattern | Drop bad rows; logger.warn | unit |
| Large session (10 exercises × 8 sets) | FlatList + memoized rows | Memo + reference equality on store updates | manual profile |
| Low-end Android render budget | RN new arch on; memoized cards | <16ms per frame on Pixel 5 | profiler drill |

## 3. Chaos scenarios

These are scripted manual drills run before each release. Each has a
pass/fail outcome the engineer must record in the release ticket.

### CHAOS-1: Airplane mode mid-session

1. Start a workout.
2. Complete one set.
3. Enable airplane mode.
4. Complete two more sets and finish the session.
5. Confirm the "Saved offline" alert appears.
6. Disable airplane mode.
7. Within 30s the offline queue flushes and the dashboard refreshes.

**Pass criteria**: zero logged work lost; `analytics_events` contains the
expected `workout.completed` event for the session id with `synced=true`
after flush.

### CHAOS-2: Force-kill at random points

1. Start a workout.
2. After each set completion, force-quit the app (swipe up + remove).
3. Relaunch and verify the session is restored.
4. Repeat 5 times across the same session.

**Pass criteria**: every set logged before kill survives. Backend never
receives a `workout.completed` with mismatched `completed_set_count`.

### CHAOS-3: NTP clock jump

1. Start a workout, complete one set, enter rest.
2. From device Settings, change the date forward by 4 hours.
3. Verify the rest timer does not jump (`monotonicNow` re-anchors).
4. Change date back. Verify the timer still ends correctly.

**Pass criteria**: rest timer countdown remains monotonic and ends within
±2 seconds of the prescribed rest, regardless of wall-clock direction.

### CHAOS-4: Backend p95 spike

1. Hold the backend at 4s artificial latency on `/workouts/today`.
2. Open the dashboard, then the workout screen.
3. The session should render from cache. After 5 consecutive timeouts the
   circuit opens; the UI falls back to "Sei offline" banner without
   freezing other features (`/me`, `/dashboard/summary`).

**Pass criteria**: no UI thread block exceeds 100ms; no other endpoint is
affected; `mv_api_latency_daily.p95_ms` for `/workouts/today` reflects the
spike.

### CHAOS-5: Memory pressure

1. Start a long session (10 exercises, 6 sets each).
2. Background the app for 10 minutes on a low-memory Android.
3. Foreground.

**Pass criteria**: the session restores with the same completed set count.
If the OS killed the process, the persisted draft is fully recovered.

### CHAOS-6: Queue replay storm

1. Queue 5 workout completions offline (different `workoutDayId`s).
2. Restore network.
3. Backend returns 500 for first attempt, 200 for the second.

**Pass criteria**: queue replays in FIFO order with backoff + jitter; no
thundering herd; final state has all 5 workouts persisted exactly once.

### CHAOS-7: Stale draft from previous release

1. Manually inject a malformed `schede.workout-session.v1` blob into MMKV.
2. Launch the app.

**Pass criteria**: parse failure quarantines the blob, session starts
fresh; logger emits `mmkvJson parse failed; quarantining key`.

## 4. Recovery flows

```
                  ┌───────────────────────────┐
                  │   App launch / foreground  │
                  └───────────────┬────────────┘
                                  │
                ┌─────────────────┴─────────────────┐
                ▼                                   ▼
       Hydrate auth from              Hydrate React Query persister
       Keychain (Supabase)            (AsyncStorage allow-list)
                │                                   │
                ▼                                   ▼
       AuthGate route decision         Hydrate Zustand stores from MMKV
                │                       (workout-session, settings)
                ▼                                   │
       Start AnalyticsTracker                       ▼
       Start SyncEngine               onRehydrateStorage guards:
                                       - corrupt blob → quarantine
                                       - stale (>18h) → cancel()
                                       - shape mismatch → drop
                                                  │
                                                  ▼
                                       Resume previous workout if any
```

```
              ┌────────────────────────────────────┐
              │  Workout completion (online path)  │
              └─────────────────────┬──────────────┘
                                    │
                ┌───────────────────┴───────────────────┐
                ▼                                       ▼
         POST /workouts/complete             Idempotency-Key:
         + Authorization JWT                 workout:<dayId>:<completedAt>
                │
                ▼
         200 OK ──► invalidate(dashboard, history, todays, analytics)
                │   cancel draft
                │
                ▼
         retryable error ──► offlineQueue.enqueue() ──► toast "Saved offline"
                │
                ▼
         non-retryable error ──► surface inline ; draft preserved
```

```
              ┌───────────────────────────┐
              │   Sync engine flush tick  │
              └───────────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       analyticsQueue                   offlineQueue
       batch 50 / 5 batches             FIFO, per-mutation backoff
              │                               │
              ▼                               ▼
       POST /analytics/events           per-kind execute()
       ack accepted ids                 on 4xx non-retryable → drop
       leave on transport error         on 5xx/network → backoff + jitter
                                                 │
                                                 ▼
                                       Honor Retry-After hint
```

## 5. React Native performance optimization strategy

### Render budget

Target: 60 FPS on iPhone 11 / Pixel 5. That's a 16.6 ms/frame budget.

Patterns enforced today:

- `SetRow` and `ExerciseCard` are wrapped in `memo` with reference-equality
  comparators against `set` / `exercise`. Updating one set does not
  re-render the others.
- The Zustand workout store updates exercises immutably via
  `exercises.map(...)` so unchanged entries retain identity, which the
  memo above relies on.
- `useMonotonicTick` lives in the rest-timer component only; the rest of
  the session screen does not re-render on each tick.
- `screen.viewed` event emission goes through `useScreenTracking` —
  it never causes a layout pass.

Patterns to apply as the session grows:

- Convert the exercise list to `FlatList` once it exceeds ~8 exercises:
  `getItemLayout`, `removeClippedSubviews`, `windowSize={6}`,
  `initialNumToRender={4}`, `maxToRenderPerBatch={4}`. Verify keyboard
  behavior before enabling `removeClippedSubviews`.
- For analytics dashboards, prefer `victory-native` over chart libs that
  ship full SVG trees per render.

### Memory

- All persisted state goes through MMKV — synchronous, native, no JS
  hot path. AsyncStorage is reserved for the React Query persister, which
  is throttled to one write per second.
- The offline queue is bounded by attempt count; the analytics queue is
  bounded by length (1,000) with oldest-drop policy.
- Long-lived listeners (AppState, online manager, Supabase realtime) are
  always returned with cleanup. No timers escape `useEffect` cleanup.

### Battery

- Sync engine flushes only on foreground + online + 30s interval.
  Background flushing is intentionally off on iOS — we respect the
  energy budget.
- The analytics tracker batches at 50 events per request, 5 batches per
  tick. No per-event POST under any condition.
- Polling is forbidden. Realtime uses Supabase channels; refresh uses
  React Query `focusManager`.

### Cold-start budget

- Splash screen is held until auth hydration. Anything heavier than
  reading a single Keychain entry happens after the first frame.
- Persistor restore is parallel to splash; on success we transition
  immediately.

## 6. Testing architecture

```
unit (jest)          ─►  pure logic: store, queue, circuit breaker,
                          analytics queue, monotonic clock, storage decoder

component (rtl)      ─►  primitives + critical screens with mocked providers
                          (not required for MVP gate)

E2E (maestro)        ─►  full flows on real builds:
                          smoke / offline / resume-after-kill /
                          rage-tap / auth-expiration

backend (jest/nest)  ─►  application services, transactional outbox,
                          ingestion, repository invariants

contract             ─►  generated types from OpenAPI compared against
                          `contracts.ts` (next iteration)
```

### Test inventory shipped in this hardening pass

- `apps/mobile/test/circuit-breaker.test.ts`
- `apps/mobile/test/storage-corruption.test.ts`
- `apps/mobile/test/monotonic-clock.test.ts`
- `apps/mobile/e2e/maestro/smoke.yaml`
- `apps/mobile/e2e/maestro/offline-workout.yaml`
- `apps/mobile/e2e/maestro/resume-after-kill.yaml`
- `apps/mobile/e2e/maestro/rage-tap-protection.yaml`
- `apps/mobile/e2e/maestro/auth-expiration.yaml`

## 7. Monitoring stack

Operational observability is wired entirely through the analytics pipeline:

| Signal | Source | Dashboard |
|--------|--------|-----------|
| App crash | `error.app.crashed` event (and OS / Sentry once enabled) | Reliability dashboard |
| API failure | `error.api` + `perf.api_latency` | Reliability dashboard, alerts on p95 / 5xx |
| Sync replay health | `sync.queue.flushed` / `.failed` / `.dropped` | `mv_sync_health_daily` |
| Workout cancellation pattern | `workout.cancelled` properties | `mv_workout_dropoff` |
| Circuit trips | `error.api` with `details.circuitKey` | Reliability dashboard |
| Hydration failure | `error.app.crashed` with `properties.kind=hydrate` | manual triage |

Recommended add-ons (post-MVP, not blocking release):

- **Sentry** (`@sentry/react-native`) for native crash symbolication.
  Initialize after the consent gate.
- **Flipper** in development for runtime inspection.
- **EAS Insights** for OTA update telemetry.

## 8. Production rollout plan

Releases follow a four-stage rollout. Each stage has a hold time and a
rollback trigger.

| Stage | Audience | Hold | Rollback trigger |
|-------|----------|------|------------------|
| 1. Internal | TestFlight / Internal track | 24h | any P1 |
| 2. Early access | 5% of opt-in users (EAS Update preview channel) | 48h | crash-free < 99.5%, sync failure > 5% |
| 3. Gradual GA | 10% → 25% → 50% over 72h | 24h per step | crash-free < 99.7%, p95 latency > 1.5s, completion-rate drop > 5pp |
| 4. Full GA | 100% | — | — |

Tooling: EAS Update channels + Apple Phased Release + Play Console staged
rollout. The mobile binary version pins the `schema_version` of the
analytics envelope so the warehouse can reject stale payloads.

Rollback procedure:

1. EAS Update: republish the previous bundle on the channel (`eas update --republish`).
2. App binary: pause phased release in App Store Connect / Play Console.
3. Backend: revert the offending tag; the API is backward-compatible per
   versioning policy.

## 9. Scalability risks (mobile-side)

These are the medium-term risks that should not block MVP but must be on
the roadmap:

- **Persistor write contention.** Many concurrent React Query writes
  could thrash AsyncStorage. The `throttleTime: 1_000` in the persister
  controls this today; revisit if write count grows.
- **Analytics queue dominance.** If event volume per session grows
  beyond ~200 events, batches will fill faster than flushes. Add a
  high-priority lane for `error.*` events and downgrade `screen.viewed`
  to sampled.
- **Realtime fanout.** A single Supabase channel per user is fine for
  notifications. Workout-live-share would require channel-per-session
  and is explicitly out of MVP scope.
- **Circuit registry leaks.** The current map grows lazily by path
  prefix. With dozens of endpoints this is still trivial, but as the API
  surface widens, add an LRU eviction policy.

## 10. Implementation priorities

The hardening in this PR is priority 1 and 2. Priority 3 is for the next
release; priority 4 is the post-MVP backlog.

### Priority 1 — shipped here

- Safe JSON storage with quarantine + decoder validation
- Workout-session store: idempotent `start`, race-safe `completeSet`,
  bounded `addSetTo`, schema version, stale-draft guard
- Offline queue: decoder-validated reads, `Retry-After`, jitter,
  capped exponential backoff
- HTTP client circuit breaker per endpoint
- Monotonic clock + hook for timers
- Memoized `ExerciseCard` and `SetRow`
- Maestro smoke + reliability flows
- Unit tests for the new primitives

### Priority 2 — same release if time allows

- Promote `FlatList` for exercises when count > 8
- Add `error.api` and `error.app.crashed` event emission from
  `http-client` and a top-level error boundary
- Wire Sentry behind consent gate

### Priority 3 — next release

- Resume-workout banner on the dashboard when a draft is detected
- Background queue flush on Android (via `expo-task-manager`)
- Crash-aware splash that auto-clears persisters on three consecutive
  hydration failures

### Priority 4 — post-MVP

- LRU eviction for the circuit-breaker registry
- Sampling policy on `screen.viewed` and `perf.screen_load`
- Detox companion suite for accessibility regression
- Synthetic backend-latency injection in staging
