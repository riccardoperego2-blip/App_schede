# Local Setup — Schede Monorepo

Single document to take the repo from "fresh clone" to "backend + mobile
running locally". Everything is one-shot, no archeology required.

> Audience: contributors who want to boot the alpha stack locally.
> Goal: minimum viable boot. No new features, no architecture changes.

**Environment variables, validation, and production rules:** see [`ENV_SETUP.md`](./ENV_SETUP.md) (catalog: [`.env.example`](./.env.example)).

---

## 1. Prerequisites

| Tool | Required | Why |
|------|----------|-----|
| Node.js | `22.x` (see `.nvmrc`) | Runtime for backend + tooling |
| pnpm | `>=9.0` | Workspace package manager |
| Git | any modern | obvious |
| **For the backend**: a Postgres 15+ database | yes | Backend uses raw SQL through `pg` |
| **For the backend**: a Supabase project (local or hosted) | yes | Auth, RLS, realtime |
| **For mobile**: Expo CLI (auto-installed) | optional | Used through `pnpm` |
| **For mobile on a device**: Expo Go app | optional | Easiest physical-device path |
| **For mobile native build**: Xcode (iOS) / Android Studio (Android) | optional | Required only for `expo run:*` |

Install pnpm if missing:

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
```

Verify versions:

```bash
node -v   # v22.x
pnpm -v   # 9.x
```

---

## 2. Single command — install everything

From the repo root:

```bash
pnpm install
```

That's it. The `pnpm-workspace.yaml` wires `apps/*` and `packages/*` together.
After install you have:

- `node_modules/` flat tree (the `.npmrc` sets `node-linker=hoisted` for Expo/RN compat).
- `node_modules/@schede/exercise-selection` → symlink to `packages/exercise-selection/`.
- `node_modules/@schede/workout-generation` → symlink to `packages/workout-generation/`.
- `node_modules/@schede/workout-execution` → symlink to `packages/workout-execution/`.

---

## 3. Single command — backend

The backend depends on the three `@schede/*` engines being built to `dist/`.
The `prestart` / `prestart:dev` / `prebuild` scripts handle that automatically.

```bash
# from the repo root
pnpm backend
```

Behind the scenes:

```bash
pnpm --filter "./packages/*" -r build   # builds engines to packages/*/dist
pnpm --filter @schede/backend start:dev # nest start --watch
```

The first run takes ~10–20 seconds for the packages to compile.
Subsequent dev iterations rebuild only what changed.

You should see:

```
[Nest] Backend listening on http://localhost:3000/v1   Bootstrap
```

The OpenAPI / Swagger UI is at `http://localhost:3000/docs`.

### Backend environment

Copy the template and fill it in **before** the first `pnpm backend`:

```bash
cp apps/backend/.env.example apps/backend/.env
# then edit apps/backend/.env
```

Required:

- `DATABASE_URL` — Postgres connection string.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Studio →
  Project Settings → API.

The backend **will refuse to start** without these (see
`apps/backend/src/core/config/app.config.ts`).

### Backend database setup (one-time)

Run the SQL migrations against your Postgres:

```bash
psql "$DATABASE_URL" -f database/001_initial_schema.sql
psql "$DATABASE_URL" -f database/002_rls_supabase.sql
psql "$DATABASE_URL" -f database/003_auth_profile_sync.sql
psql "$DATABASE_URL" -f database/004_seed_muscle_tags.sql
psql "$DATABASE_URL" -f database/005_seed_exercises_catalog.sql
psql "$DATABASE_URL" -f database/006_backend_outbox.sql
psql "$DATABASE_URL" -f database/007_analytics_warehouse.sql
```

---

## 4. Single command — mobile

```bash
# from the repo root
pnpm mobile
```

Behind the scenes:

```bash
pnpm --filter @schede/mobile start    # expo start
```

The Expo dev server will print a QR code. From there:

- **iOS Simulator**: press `i`.
- **Android Emulator**: press `a`.
- **Physical device** (recommended for usability work): install Expo Go,
  scan the QR.

### Mobile environment

```bash
cp apps/mobile/.env.example apps/mobile/.env
# then edit apps/mobile/.env
```

Important hosts to remember for `EXPO_PUBLIC_API_BASE_URL`:

| Target | URL |
|--------|-----|
| iOS Simulator | `http://localhost:3000` |
| Android Emulator | `http://10.0.2.2:3000` |
| Physical device on same Wi-Fi | `http://<your-machine-LAN-IP>:3000` |

If the device cannot reach the backend, double-check the firewall is
allowing inbound TCP on port 3000.

### Native build (only if you need real device features)

```bash
pnpm mobile:ios       # expo run:ios
pnpm mobile:android   # expo run:android
```

These require Xcode / Android Studio. For day-to-day alpha work, Expo
Go is enough.

---

## 5. Single command — tests

```bash
pnpm test
```

Runs in parallel across all workspaces:

- `packages/*` → Vitest (deterministic engine tests).
- `apps/backend` → Jest (`ts-jest` preset).
- `apps/mobile` → Jest (`jest-expo` preset).

To focus on one suite:

```bash
pnpm test:packages   # engines only
pnpm test:backend    # NestJS services + repositories
pnpm test:mobile     # RN components + lib/* + e2e helpers
```

For a typecheck-only pass:

```bash
pnpm typecheck
```

---

## 6. Dependency graph (synthetic)

```
                        ┌────────────────────────┐
                        │  @schede/mobile        │  (Expo / React Native)
                        │   apps/mobile          │  self-contained, no
                        └─────────┬──────────────┘  workspace package deps
                                  │ HTTPS
                                  ▼
            ┌──────────────────────────────────────────────┐
            │  @schede/backend          (NestJS / Node 22) │
            │   apps/backend                               │
            └──────┬───────────┬───────────┬───────────────┘
                   │           │           │
                   ▼           ▼           ▼
       ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
       │ @schede/          │ │ @schede/          │ │ @schede/          │
       │ workout-execution │ │ workout-generation│ │ exercise-selection│
       │ packages/         │ │ packages/         │ │ packages/         │
       └────────┬──────────┘ └─────────┬─────────┘ └─────────┬─────────┘
                │                      │                     │
                │ type-only            │ type-only           │
                └──────────────────────┴─────────────────────┘
                            (DAG, no runtime imports)
```

Notes:

- All cross-package imports between `packages/*` are **`import type`** —
  no JS is emitted between them.
- `shared/exerciseClassification.ts` is consumed via `@shared/*` tsconfig
  paths or relative paths, type-only. It is not a published package.

---

## 7. What was fixed during the audit

These are the only changes applied during this setup pass. None of them
introduce new features or change architecture.

### 7.1 Workspace skeleton (added)

- `package.json` — pnpm workspace orchestrator with the single-command
  scripts the README documents.
- `pnpm-workspace.yaml` — lists `apps/*` and `packages/*`.
- `.npmrc` — `node-linker=hoisted` (required for Expo + RN plugin
  resolution), `auto-install-peers=true`.
- `.nvmrc` — pins Node `22.x`.
- `.gitignore` — protects `.env`, `node_modules`, `dist`, Expo caches,
  and the launch logs.

**Why critical**: without a root workspace, `pnpm install` does not link
`@schede/*` packages and `apps/backend` cannot resolve them.

### 7.2 Backend ↔ packages wiring

- `apps/backend/package.json` now declares the three engines as
  `workspace:*` dependencies. `prestart` / `prebuild` builds the
  packages first so `dist/index.js` exists at runtime.
- `apps/backend/tsconfig.json` dropped the source-path aliases for
  `@schede/*` (resolution now goes through `node_modules` symlinks to
  the package `main` / `types`). `@shared/*` remains as the only path.
- `apps/backend/src/modules/exercises/infrastructure/supabase-exercise.repository.ts`
  no longer reaches into `packages/.../src/ports/ExerciseRepository`
  via a six-level relative path; it imports through the public
  `@schede/exercise-selection` surface.

**Why critical**: the previous setup left backend ↔ engines wiring
implicit. Without workspace deps, the backend would fail to resolve
`@schede/...` at runtime and would silently fall back on the
`tsconfig.paths` IDE alias that does not survive `nest build`.

### 7.3 ESM → CommonJS for packages and backend

- `apps/backend/package.json` and each `packages/*/package.json` no
  longer declare `"type": "module"`.
- Each `tsconfig.json` now sets `module: CommonJS` + `moduleResolution: Node`.

**Why critical**: the original setup had `"type": "module"` everywhere
combined with TypeScript `module: NodeNext`. Under that combination,
Node ESM requires explicit `.js` extensions on every relative import.
The source uses extension-less imports throughout (~150 of them), so
`nest build` and `tsc -p tsconfig.build.json` would fail at compile
time, and even if compiled, Node would refuse the output with
`ERR_MODULE_NOT_FOUND`. Switching to CommonJS preserves the source
verbatim, makes the output Node-loadable, and is the standard NestJS
setup. Mobile is unaffected (Metro / RN handles its own modules).

### 7.4 Broken import in `VolumeLandmarksCalculator`

```ts
// before
import type { ... } from './generation.types';
import { MUSCLE_VOLUME_GROUPS } from './generation.types';
// after
import type { ... } from '../domain/generation.types';
import { MUSCLE_VOLUME_GROUPS } from '../domain/generation.types';
```

**Why critical**: `./generation.types` does not exist next to the
calculator. The file lives in `../domain/generation.types`. The
package build (`tsc -p tsconfig.build.json`) would fail with TS2307.
This file is imported by `WorkoutGenerationEngine`, so the entire
workout-generation engine could not be loaded by the backend.

### 7.5 Duplicate `v1/` segment in REST routes

All three controllers used both `@Controller({ path: 'v1/foo', version: '1' })`
**and** `app.enableVersioning({ type: VersioningType.URI })`. With URI
versioning, NestJS already prepends the version, so the actual URLs
were `/v1/v1/plans/generate`, `/v1/v1/workouts/complete`, and
`/v1/v1/analytics/events`. The mobile client posts to `/v1/plans/...`,
so no request would have reached a controller.

The fix removes the leading `v1/` from each `@Controller` path. URLs
are now the canonical `/v1/<resource>`.

### 7.6 Global API prefix default

`app.config.ts` no longer defaults `apiPrefix` to `api`. The new
default is empty, which matches the mobile client's assumption that
`<apiBaseUrl>/v1/<resource>` is the full URL. The bootstrap code only
calls `app.setGlobalPrefix(...)` if the prefix is non-empty.
Production deployments can still set `API_PREFIX=api` via env to
restore the `/api/v1/...` shape behind a reverse proxy.

### 7.7 Missing Expo asset references

`app.json` referenced `./assets/icon.png`, `./assets/splash.png`, and
`./assets/adaptive-icon.png`. The `assets/` folder does not exist in
the repo. Expo refuses to start when an asset reference is missing.

Fix: removed the explicit asset paths so Expo falls back to its
defaults. The user can drop real PNGs into `apps/mobile/assets/` and
re-add the entries later — that is not a boot-blocker.

### 7.8 Env templates added

- `apps/backend/.env.example` — every variable consumed by
  `app.config.ts` and `pg-unit-of-work.ts`.
- `apps/mobile/.env.example` — `EXPO_PUBLIC_*` set used by
  `src/lib/env.ts` and `src/lib/feature-flags/flags.ts`.

The backend `.env` is loaded via `ConfigModule.forRoot({ envFilePath: ['.env.local', '.env'] })`,
which now also accepts a non-committed `.env.local` for personal
overrides.

---

## 8. Remaining (non-blocking) observations

These do not block local boot. Listed here for future passes.

| # | Observation | Where | Impact |
|--:|-------------|-------|--------|
| 1 | Cross-package imports inside `packages/*` use deep relative paths (e.g. `'../../exercise-selection/src/domain/selection.types'`). They are **type-only**, so they compile fine and emit nothing. They bypass the package boundary, so refactors can drift. | `packages/workout-{generation,execution}/src` | brittle, not broken |
| 2 | `shared/exerciseClassification.ts` is reused by both `packages/*` and `apps/backend` via a `@shared/*` alias plus relative paths. It is not a published package. Could be promoted to `@schede/shared` later. | `shared/`, all tsconfigs | technical debt |
| 3 | Mobile app has no PNG assets committed. Expo uses defaults; production builds should ship real assets. | `apps/mobile/app.json`, `apps/mobile/assets/` | cosmetic |
| 4 | `analytics.service.ts` writes `'workout.*'` events using the `'workout'` enum value, which is in `analytics_event_category` from migration 001 — but `'progression'` is added in migration 007. Migrations must be applied in order. | `database/007_analytics_warehouse.sql` | documented, not a code bug |
| 5 | No `lockfile` is committed yet. After the first successful `pnpm install` you should commit `pnpm-lock.yaml`. | repo root | one-time, post-setup |
| 6 | Backend Swagger is mounted at `/docs` unconditionally. Fine for alpha; gate behind `NODE_ENV !== 'production'` before real launch. | `apps/backend/src/main.ts` | hardening, not boot |

None of these prevent `pnpm backend` or `pnpm mobile` from running.

---

## 9. Ready-to-boot checklist

Run through this once on a clean machine. Every box must be ticked.

### A. Tooling

- [ ] `node -v` reports `v22.x`.
- [ ] `pnpm -v` reports `9.x`.
- [ ] (Optional) `psql --version` reports a Postgres 15+ client.

### B. Repo

- [ ] Fresh `pnpm install` at the repo root completes without errors.
- [ ] `node_modules/@schede/exercise-selection` is a symlink to
      `packages/exercise-selection/`.
- [ ] `node_modules/@schede/workout-generation` is a symlink to
      `packages/workout-generation/`.
- [ ] `node_modules/@schede/workout-execution` is a symlink to
      `packages/workout-execution/`.

### C. Backend prerequisites

- [ ] `apps/backend/.env` exists and contains `DATABASE_URL`,
      `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `psql "$DATABASE_URL" -c "select 1"` returns `1` (DB reachable).
- [ ] Migrations `001..007` applied in order.

### D. Backend boot

- [ ] `pnpm backend` builds packages and prints
      `Backend listening on http://localhost:3000/v1`.
- [ ] `curl http://localhost:3000/docs` returns the Swagger HTML.
- [ ] `curl -X POST http://localhost:3000/v1/plans/generate` returns
      `401 Unauthorized` (auth guard active, route resolved).

### E. Mobile prerequisites

- [ ] `apps/mobile/.env` exists with `EXPO_PUBLIC_API_BASE_URL`,
      `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] The chosen URL is reachable from the simulator/device.

### F. Mobile boot

- [ ] `pnpm mobile` starts the Expo dev server and prints a QR.
- [ ] Pressing `i` (iOS) or `a` (Android) opens the app to the
      sign-in screen.
- [ ] The sign-in screen renders without a red-box error.

### G. Tests

- [ ] `pnpm test` finishes; no suite reports a failing assertion.
- [ ] `pnpm typecheck` finishes with zero errors.

If every box is ticked, the alpha stack is ready for the
`docs/launch/RELEASE_CHECKLIST.md` to take over.

---

## 10. Quick command reference

```bash
# install everything
pnpm install

# backend (builds engines, then nest start --watch)
pnpm backend

# mobile (expo start)
pnpm mobile

# all tests + typecheck
pnpm test
pnpm typecheck

# build production bundles
pnpm build              # packages + backend dist
pnpm build:packages     # engines only

# focused tests
pnpm test:packages
pnpm test:backend
pnpm test:mobile
```

Stop a server: `Ctrl-C` in its terminal. The watchers exit cleanly.
