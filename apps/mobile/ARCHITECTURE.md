# Schede Mobile — Architecture

Mobile client for the Schede fitness platform. Designed as a premium SaaS product:
fast, minimal, one-thumb friendly, offline-first, realtime-ready.

Stack: **React Native + Expo (SDK 52, new arch) + TypeScript + Expo Router + Zustand
+ React Query (with persistence) + NativeWind + Supabase Auth/Realtime + MMKV**.

## 1. High-level architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  app/                          UI surface — Expo Router file-based routes │
│  src/features/                 Feature modules (screens, sub-components)  │
│  src/design-system/            Tokens, theme, primitives                  │
│  src/hooks/                    Cross-feature hooks (data + behavior)      │
│  src/stores/                   Zustand stores (auth/session/settings)     │
│  src/lib/                      Infrastructure (api, supabase, offline,    │
│                                 storage, logging, env)                    │
│  src/providers/                Composition root (Query/SafeArea/Gesture)  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Layering rules

- `app/*` only re-exports screens from `features/*`. **No business logic in routes.**
- `features/*` imports from `design-system`, `hooks`, `stores`, `lib`. Never from another feature.
- `lib/*` is pure infrastructure (no React).
- `design-system/*` is UI-only (no business types, no React Query).
- `stores/*` is state (no fetch logic). Side effects flow through `hooks/*` → `lib/api`.

This keeps cycles impossible and makes feature deletion safe.

## 2. Folder structure

```
apps/mobile/
├─ app/                            # Expo Router routes
│  ├─ _layout.tsx                  # Root layout + AuthGate
│  ├─ index.tsx                    # Entry redirect
│  ├─ +not-found.tsx
│  ├─ (auth)/                      # Unauthenticated stack
│  │  ├─ _layout.tsx
│  │  ├─ sign-in.tsx
│  │  └─ sign-up.tsx
│  ├─ onboarding/index.tsx
│  ├─ (tabs)/                      # Main authenticated tabs
│  │  ├─ _layout.tsx
│  │  ├─ index.tsx                 # Dashboard
│  │  ├─ history.tsx
│  │  ├─ progress.tsx
│  │  └─ profile.tsx
│  └─ workout/session.tsx          # Modal full-screen workout
├─ src/
│  ├─ design-system/
│  │  ├─ global.css                # Tailwind entry
│  │  ├─ tokens.ts                 # Spacing, type scale, motion, hitSlop
│  │  ├─ theme.ts                  # Semantic palette (dark/light)
│  │  ├─ primitives/
│  │  │  ├─ Button.tsx
│  │  │  ├─ Card.tsx
│  │  │  ├─ Screen.tsx
│  │  │  ├─ Section.tsx
│  │  │  ├─ Stepper.tsx
│  │  │  └─ Text.tsx
│  │  └─ index.ts
│  ├─ features/
│  │  ├─ auth/                     # Sign-in / sign-up
│  │  ├─ onboarding/               # Multi-step plan generation
│  │  ├─ dashboard/                # Home
│  │  ├─ workout-session/          # Live workout
│  │  │  ├─ WorkoutSessionScreen.tsx
│  │  │  └─ components/
│  │  │     ├─ RestTimer.tsx
│  │  │     ├─ SetRow.tsx
│  │  │     ├─ ExerciseCard.tsx
│  │  │     └─ FinishSheet.tsx
│  │  ├─ history/
│  │  ├─ progress/
│  │  └─ profile/
│  ├─ hooks/
│  │  ├─ use-dashboard.ts
│  │  ├─ use-history.ts
│  │  ├─ use-analytics.ts
│  │  ├─ use-complete-workout.ts   # Mutation w/ offline fallback
│  │  ├─ use-rest-timer.ts
│  │  ├─ use-online-status.ts
│  │  └─ use-realtime-notifications.ts
│  ├─ lib/
│  │  ├─ env.ts                    # Typed env via Constants/process.env
│  │  ├─ logging/logger.ts
│  │  ├─ supabase/client.ts        # Secure-store-backed session
│  │  ├─ storage/
│  │  │  ├─ secure-storage.ts      # Keychain/Keystore (auth)
│  │  │  └─ mmkv.ts                # Hot cache + queues
│  │  ├─ api/
│  │  │  ├─ contracts.ts           # Backend types (mirror NestJS DTOs)
│  │  │  ├─ errors.ts              # ApiError class + retryable taxonomy
│  │  │  ├─ http-client.ts         # fetch wrapper + 401 refresh
│  │  │  ├─ sdk.ts                 # Typed endpoints
│  │  │  ├─ query-client.ts        # QueryClient + persister
│  │  │  └─ query-keys.ts          # Hierarchical key factory
│  │  └─ offline/
│  │     ├─ types.ts               # Discriminated union of queued mutations
│  │     ├─ queue.ts               # FIFO MMKV-backed queue w/ backoff
│  │     └─ sync-engine.ts         # AppState + onlineManager flush triggers
│  ├─ stores/
│  │  ├─ auth.store.ts             # Supabase session bridge
│  │  ├─ settings.store.ts         # MMKV-persisted preferences
│  │  ├─ workout-session.store.ts  # Live session draft (persisted)
│  │  └─ index.ts
│  └─ providers/AppProviders.tsx
├─ test/
│  ├─ jest.setup.ts
│  ├─ workout-session.store.test.ts
│  └─ offline-queue.test.ts
├─ app.json / babel.config.js / metro.config.js
├─ tailwind.config.ts
├─ package.json
├─ tsconfig.json
└─ jest.config.js
```

## 3. Navigation flow

Expo Router groups are used to model authentication boundaries:

```
RootLayout (Stack)
├── (auth)            unauthenticated only
│    ├── sign-in
│    └── sign-up
├── onboarding        first-run only
├── (tabs)            authenticated, post-onboarding
│    ├── index        Dashboard
│    ├── history
│    ├── progress
│    └── profile
└── workout/session   modal — slides up from bottom
```

`AuthGate` in `app/_layout.tsx` watches the auth store and redirects on
state changes:

```
unauthenticated  ──▶ (auth)/sign-in
authenticated + !onboarded ──▶ onboarding
authenticated + onboarded ──▶ (tabs)
```

Splash screen is held until auth hydration completes. The workout
session lives as a **modal route** so the full-screen training UX never
collides with the tab bar, and the user can dismiss with the platform
swipe-down gesture.

## 4. State management

| Layer | Scope | Where |
|-------|-------|-------|
| Auth session | Global, persisted in Keychain | `auth.store.ts` + Supabase storage adapter |
| User preferences | Global, persisted in MMKV | `settings.store.ts` (Zustand `persist` middleware) |
| Live workout draft | Global, persisted in MMKV | `workout-session.store.ts` |
| Server data | Cached, persisted | React Query + AsyncStorage persister |
| Onboarding wizard | In-memory (transient) | `onboarding.store.ts` |
| Form/local UI | Component local | `useState` |

**Selectors** for the workout store live in `workoutSelectors` so derived
values (adherence, volume, planned set count, exercise log payload) are
computed deterministically from the draft and stay referentially stable.

## 5. API layer

`http-client.ts` is the only place that calls `fetch`:

- Injects bearer JWT from Supabase session.
- Adds `X-Client`, `X-Client-Version`, optional `Idempotency-Key`.
- Maps HTTP status codes to typed `ApiErrorKind`.
- On `401`, attempts `supabase.auth.refreshSession()` and retries once.
- Aborts via `AbortController` after a configurable timeout (15s).
- Differentiates **retryable** (`network`, `timeout`, `5xx`) from
  **terminal** (`401`, `403`, `404`, `409`, `422`, `429`).

`sdk.ts` is a thin typed surface used by hooks:

```ts
api.dashboard.summary()
api.workouts.todays()
api.workouts.complete(payload, idempotencyKey)
api.workouts.history(cursor?)
api.analytics.overview(range)
```

`contracts.ts` mirrors the NestJS DTOs (today colocated for documentation;
move to a shared `packages/api-contracts` in a monorepo to share types
between backend and mobile).

## 6. React Query strategy

- **Persistent cache** via `PersistQueryClientProvider` + AsyncStorage —
  app boots fully populated even offline.
- `shouldDehydrateQuery` allow-lists slow-moving query roots
  (`profile`, `plans`, `exercises`, `analytics`, `workouts`). High-churn
  or sensitive keys stay in memory only.
- `staleTime: 5min`, `gcTime: 24h` to minimize refetches without showing
  stale data on cold boot.
- `retry` is conditioned on `ApiError.isRetryable` to avoid useless
  retries on validation/auth errors.
- `focusManager` wired to `AppState` so cached data refreshes on
  foreground.
- `onlineManager` drives both refetches and the offline queue flush.

## 7. Authentication flow

1. Supabase client uses **`expo-secure-store`** as session storage —
   sessions sit in iOS Keychain / Android Keystore.
2. `auth.store.hydrate()` runs at boot, reads existing session,
   subscribes to `onAuthStateChange` for refresh/sign-out events.
3. `AuthGate` reacts to `status` transitions and redirects.
4. `http-client` injects the access token per request; auto-refreshes
   on `401`.
5. `signOut()` clears the queue would-be sensitive items (handled by
   Supabase's signOut which clears Keychain entry).

Supports password sign-in/up out of the box. OAuth (Apple/Google)
plugs in via `supabase.auth.signInWithOAuth` + `expo-web-browser`.

## 8. Offline-first strategy

The mobile app must support full workout completion even when the
device is offline (gym basements, airplane mode). Pattern:

1. **Read path** — React Query persisted cache hydrates the UI without
   a network. `useDashboard`, `useTodaysWorkout`, `useWorkoutHistory`
   all render from cache instantly.
2. **Write path** — `useCompleteWorkout`:
   - Builds a deterministic `Idempotency-Key`
     (`workout:{dayId}:{completedAt}`) so server replays collapse.
   - Tries the network. On **retryable** error, enqueues into
     `offlineQueue` (MMKV-backed) and reports `{ status: 'queued' }`.
3. **Sync engine** flushes the queue on:
   - App returning to foreground
   - `onlineManager` switching to `true`
   - Periodic 30s interval while foregrounded
4. **Backoff** — exponential (5s × 2^attempt) capped at 8 attempts;
   non-retryable failures drop the item with a logged warning.
5. **Local persistence of the live session** — the entire workout
   draft is in MMKV via Zustand `persist`. Force-quit or crash leaves
   the user exactly where they were.

## 9. Workout session architecture

The workout screen is the highest-stakes UX in the product. Constraints:

- **Thumb reachable** — primary CTA fixed-bottom, "complete set"
  button on the right of each row.
- **Minimal taps** — load and reps are inline `TextInput`s pre-filled
  with last targets.
- **Always-on display** — `expo-keep-awake` toggled via settings.
- **Resilient** — the entire draft is persisted; backgrounding,
  killing, or losing connectivity does not lose data.
- **Realtime rest timer** — `useRestTimer` ticks at 250ms while a rest
  is active, idle otherwise.
- **Wellness capture** — finish sheet collects sleep/soreness/fatigue
  (1–10), which the backend `WorkoutExecutionEngine` consumes for
  adaptive progression.

Data flow on set completion:

```
User taps ✓
└─▶ store.completeSet()   // mark set + timestamp + values
└─▶ store.startRest(s)    // restEndsAt = now + s*1000
└─▶ RestTimer ticks
└─▶ Haptic feedback (settings.hapticsEnabled)
```

Data flow on workout completion:

```
FinishSheet → handleConfirmFinish
└─▶ build CompleteWorkoutPayload from workoutSelectors.toExerciseLogs
└─▶ useCompleteWorkout.mutateAsync(payload)
    ├─ online  → POST /v1/workouts/complete (idempotent)
    │           → invalidate(dashboard, history, todays, analytics)
    └─ offline → enqueue + return { status: 'queued' }
└─▶ store.cancel()  // clear draft
└─▶ router.replace('/(tabs)')
```

## 10. Realtime updates

Supabase Realtime is bound at the dashboard level via
`useRealtimeNotifications(userId, onInsert)`. RLS on
`public.notifications` guarantees a user only ever receives their own
rows. On insert, the dashboard invalidates relevant queries.

Coach dashboards and live progress sharing reuse the same primitive
keyed on different `RealtimeChannel` filters.

## 11. Design system

- Colors and radii live in `tailwind.config.ts` and are consumed via
  semantic classes (`bg-bg-primary`, `text-text-secondary`, `text-accent`).
- Spacing, type scale, motion, and hitSlop are in `tokens.ts` for use
  in non-class contexts (charts, animations).
- Primitives — `Text`, `Screen`, `Button`, `Card`, `Section`, `Stepper`
  — are the only components allowed to set raw styles. Features
  compose them.

Premium feel:

- Inter / InterDisplay typography (system fallback).
- Mint accent (`#5BE3A1`) on a near-black surface for high contrast.
- Pill CTAs, 20px card radius, 64px tab bar.
- Implicit motion via `expo-haptics.selectionAsync()` on primary actions.

## 12. Testing strategy

- **Unit tests** (`jest` + `jest-expo`) for stores and infrastructure
  with zero React: `workout-session.store.test.ts`, `offline-queue.test.ts`.
- **Component tests** (recommended next): React Testing Library on
  primitives + feature screens, with React Query providers stubbed.
- **Contract tests**: the backend exposes `apps/backend` OpenAPI; a
  CI job can generate types and diff `contracts.ts` to fail builds on
  drift.
- **E2E**: Detox or Maestro flows for `sign-in → onboarding → start
  workout → complete set → finish → history`.

## 13. Performance

- React Native **New Architecture** is enabled (`newArchEnabled: true`, Expo SDK 54). In **Expo Go**, native MMKV is still unavailable; the app uses an in-memory KV engine (see `src/lib/storage/mmkv.ts`). Custom native builds use **MMKV 3.x** over TurboModules.
- Heavy lists use `FlatList` with `keyExtractor`, no inline functions
  in render (extract via `useCallback` when adding features).
- Zustand selectors are coarse-grained but stable; primitives avoid
  inline objects in `style` props (Tailwind classes only).
- MMKV (synchronous, native) is used for hot paths (queue, drafts).
- React Query keeps the network surface small (idempotent queries,
  hierarchical invalidations).
- Splash held until auth hydrates → no white flash, no flicker.

## 14. Scalability

- Feature modules are independent and can be split into independent
  bundles (e.g. behind feature flags). Add a new tab by dropping a
  file in `app/(tabs)/`.
- API contracts can be promoted to a shared package once a second
  client (web/admin) needs them.
- Zustand stores are small and composable; introduce slices when one
  exceeds ~200 lines.
- React Query keys are hierarchical so invalidations stay surgical as
  the API grows.
- Sentry, Datadog RUM, or PostHog plug into `logger.ts` without
  touching call sites.

## 15. Deployment

- **EAS Build** for managed binaries
  (`eas build --profile production --platform all`).
- **EAS Update** for OTA delivery of JS bundles between native
  releases. Channels: `production`, `staging`, `preview`.
- **Submit**: `eas submit --platform ios|android`.
- App Store / Play Store metadata stored in `store/` (not included
  here).

CI recommendations:

```
1. typecheck (tsc --noEmit)
2. lint (eslint)
3. unit tests (jest --ci)
4. preview build (eas build --profile preview)
5. e2e (maestro cloud) on the preview build
```

## 16. Edge cases handled

- **Cold start while offline** — persisted React Query cache renders
  the dashboard, persisted Zustand store renders the in-progress
  workout, offline queue retains queued mutations.
- **Token expiry mid-session** — `http-client` refreshes and retries
  once; if refresh fails, redirects to `(auth)` and clears draft on
  next sign-in (configurable).
- **Network blip during set logging** — set logging is local-only; no
  network call until "Termina sessione".
- **Duplicate workout completion** — `Idempotency-Key` collapses
  retries server-side.
- **Crash mid-session** — MMKV persistence restores the entire draft;
  AuthGate routes the user back to `(tabs)`, dashboard surfaces a
  "Resume session" CTA when status is `running` (extension point).
- **Concurrent device sign-in** — Supabase Realtime listens for auth
  events; the store resets on remote sign-out.
- **Non-retryable validation errors** — Surfaced inline (sign-in, set
  completion), never silently dropped.

## 17. Integration with the backend

| Backend endpoint (NestJS, `/v1`) | Mobile consumer |
|----------------------------------|-----------------|
| `POST /plans/generate` | `OnboardingScreen.generatePlan` |
| `GET  /workouts/today` | `useTodaysWorkout` |
| `POST /workouts/complete` | `useCompleteWorkout` (+ offline queue) |
| `GET  /workouts/history` | `useWorkoutHistory` (cursor-paginated) |
| `GET  /dashboard/summary` | `useDashboard` |
| `GET  /analytics/overview` | `useAnalyticsOverview` |
| `GET  /me` / `PATCH /me` | `api.profile.*` |

Auth uses Supabase JWTs verified by the NestJS `SupabaseAuthGuard`.
Realtime data flows through Supabase channels with RLS, not through
the NestJS layer.

## 18. Next steps (not in MVP)

- Chart rendering with `victory-native` or `@shopify/react-native-skia`.
- Push notifications via `expo-notifications` + APNS/FCM tokens
  registered on `/me`.
- Apple Sign-In / Google OAuth.
- Coach dashboard (separate role-gated route group).
- Body measurements / progress photos UX (already wired in
  `MeasurementCreateMutation` queue type).
