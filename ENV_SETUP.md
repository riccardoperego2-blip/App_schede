# Environment configuration — Schede monorepo

This document is the single source of truth for **what** each variable does,
**where** it is validated, and **how** to deploy safely to production.

- **Backend**: Zod + fail-fast in `apps/backend/src/core/config/server-env.ts`
  (also invoked at the very start of `main.ts` before Nest boots).
- **Mobile**: Zod + fail-fast in `apps/mobile/src/lib/env.ts` (module load).

Templates:

- `apps/backend/.env.example`
- `apps/mobile/.env.example`
- `.env.example` (root catalog)

---

## 1. Security model (read this first)

| Secret | Where it lives | Exposed to browser / app bundle? |
|--------|----------------|-----------------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Backend `process.env` only | **Never** — bypasses RLS; server-side token verification only (`SupabaseService`). |
| `SUPABASE_ANON_KEY` | Mobile `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **Yes** — by design; protected by RLS + Auth. |
| `DATABASE_URL` / `SUPABASE_DATABASE_URL` / `PG*` | Backend only | **Never** — direct Postgres from Nest. Use split `PG*` variables on Railway. |

The mobile bundle **must not** contain:

- `SUPABASE_SERVICE_ROLE_KEY`
- Any `EXPO_PUBLIC_*` variable whose value is the service-role JWT

`apps/mobile/src/lib/env.ts` throws at startup if `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
(or `EXPO_PUBLIC_SERVICE_ROLE_KEY`) is present.

---

## 2. Backend variables

Validated by `parseServerEnv()` / `getServerEnv()` in `server-env.ts`.

### Required (all environments)

| Variable | Format | Notes |
|----------|--------|-------|
| `DATABASE_URL` | `postgres://` or `postgresql://` | Connection string for `pg` pool. Local/default name. |
| `SUPABASE_DATABASE_URL` | `postgres://` or `postgresql://` | Compatibility alias. Avoid on Railway if Railpack misreads `postgresql://` values. |
| `PGHOST` | Hostname | Railway-friendly preferred DB config. Required if no URL variable is set. |
| `PGUSER` | Username | Required with `PGHOST` when no URL variable is set. URL-encoded by the backend. |
| `PGPASSWORD` | Password | Required with `PGHOST` when no URL variable is set. URL-encoded by the backend. |
| `PGDATABASE` | Database name | Optional, default `postgres`. |
| `PGPORT` | Port | Optional, default `5432`. |
| `PGSSLMODE` | SSL mode | Optional, default `require`. |
| `SUPABASE_URL` | Valid `http:` or `https:` URL | Same project URL as in Supabase dashboard. |
| `SUPABASE_SERVICE_ROLE_KEY` | JWT string, length ≥ 32 | From Supabase → Project Settings → API → `service_role` **secret**. |

### Optional

| Variable | Default | Notes |
|----------|---------|-------|
| `NODE_ENV` | `development` | Set to `production` in prod. |
| `PORT` | `3000` | |
| `API_PREFIX` | *(empty)* | If set to `api`, routes become `/api/v1/...`. Leave empty when the reverse proxy terminates TLS and forwards to Nest at `/v1/...`. |
| `PG_POOL_MAX` | `10` | Integer 1–200; passed into `PgUnitOfWork` from validated config (not raw `process.env`). |
| `CORS_ORIGINS` | *(empty)* | Comma-separated **browser** origins. Dev + empty = allow any origin. Prod + empty = only clients **without** `Origin` header (native apps, curl); browsers must match the list if set. |

### Production-only rules (fail-fast)

When `NODE_ENV=production`:

1. `SUPABASE_URL` and the resolved database URL (`DATABASE_URL ?? SUPABASE_DATABASE_URL ?? PG*`) must not contain obvious placeholders (`YOUR-PROJECT`, `example.com`).

### Local development

```bash
cp apps/backend/.env.example apps/backend/.env
# edit values — use `supabase status` for local DB URL when using Supabase CLI
pnpm --filter @schede/backend start:dev
```

---

## 3. Mobile (Expo) variables

Everything the JS bundle reads **must** be prefixed with `EXPO_PUBLIC_` so it is
inlined at build time. Never put secrets in `EXPO_PUBLIC_*`.

Validated by `mobilePublicEnvSchema` in `apps/mobile/src/lib/env.ts`.

### API base URL

| Priority | Variable | Notes |
|----------|----------|-------|
| 1 | `EXPO_PUBLIC_API_BASE_URL` | Canonical name. No trailing slash (trimmed automatically). |
| 2 | `EXPO_PUBLIC_API_URL` | **Legacy alias** — same meaning; prefer `EXPO_PUBLIC_API_BASE_URL`. |
| 3 | `app.json` → `expo.extra.apiBaseUrl` | Fallback for EAS profiles / OTA without rebuilding env. |

The HTTP client (`src/lib/api/http-client.ts`) calls `${env.apiBaseUrl}/v1/...`.

**Expo Go + physical device (same Wi-Fi as your PC):** in `__DEV__`, if the resolved URL
uses `localhost` or `127.0.0.1`, `apps/mobile/src/lib/env.ts` **replaces the host** with the
LAN hostname from Expo (`getExpoGoProjectConfig().debuggerHost`) or from
`NativeModules.SourceCode.scriptURL`, so the phone does not call its own loopback.
You can still set `EXPO_PUBLIC_API_BASE_URL=http://<PC-LAN-IP>:3000` explicitly.

Optional:

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_PORT` | Port used when synthesizing `http://<LAN>:<port>` if no URL is set (default `3000`). |
| `EXPO_PUBLIC_DISABLE_LAN_API_FALLBACK=1` | Disables the localhost→LAN rewrite (debug only). |

**Simulator vs device (manual URLs, when fallback is off):**

- iOS Simulator → `http://localhost:3000`
- Android Emulator → `http://10.0.2.2:3000`
- Physical device → `http://<LAN-IP>:3000` (same Wi-Fi as your machine)

### Supabase (public)

| Variable | Fallback | Notes |
|----------|----------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `expo.extra.supabaseUrl` | Project URL (`https://xxx.supabase.co`). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `expo.extra.supabaseAnonKey` | **Anon** key only (JWT, ≥ 32 chars). Placeholders `REPLACE_ME` / `your-anon-key` are rejected. |

`src/lib/supabase/client.ts` uses `createClient(env.supabaseUrl, env.supabaseAnonKey, ...)`.

### Feature kill-switches (`EXPO_PUBLIC_FLAG_*`)

See `apps/mobile/src/lib/feature-flags/flags.ts`. Each flag can be `true`/`false`,
`1`/`0`, `on`/`off`, `yes`/`no` (case-insensitive). OTA overrides live in
`app.json` → `expo.extra.flags`.

### Local development

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @schede/mobile start
```

---

## 4. EAS / CI

- Set secrets in **EAS Secrets** or your CI provider; map them to `EXPO_PUBLIC_*`
  at build time for mobile.
- Backend runs on Node — inject `PGHOST`/`PGUSER`/`PGPASSWORD` (preferred on Railway), or a URL variable on other providers, plus `SUPABASE_*`, `CORS_ORIGINS`, `NODE_ENV=production`
  via the platform’s secret manager (Fly, Railway, Kubernetes Secrets, etc.).

---

## 5. Verification checklist (production)

- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists only in the backend runtime environment.
- [ ] `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` is **unset** everywhere (mobile CI, EAS env).
- [ ] The resolved DB connection uses TLS (`PGSSLMODE=require` or `sslmode=require`) when connecting to managed Postgres.
- [ ] `CORS_ORIGINS` lists only real browser front-end origins you intend to allow (no `*`); native/mobile traffic does not require `Origin`.
- [ ] `NODE_ENV=production` on the API.
- [ ] Smoke: `curl -sS -o /dev/null -w "%{http_code}" https://api.example.com/v1/plans/generate` → `401` (route + auth guard).

---

## 6. Troubleshooting

### Backend exits immediately with `EnvValidationError`

Read the printed bullet list — each line maps to one field in `server-env.ts`.
Most common: missing `DATABASE_URL` / `SUPABASE_DATABASE_URL` / `PGHOST`+`PGUSER`+`PGPASSWORD`, placeholder `SUPABASE_SERVICE_ROLE_KEY`, or
browser calls blocked by CORS (add the front-end origin to `CORS_ORIGINS`).

### Mobile red screen: `MobileEnvValidationError`

- Ensure **anon** key length ≥ 32 and not a placeholder string.
- Remove any forbidden `EXPO_PUBLIC_*SERVICE*` keys.
- Set `EXPO_PUBLIC_API_BASE_URL` (or legacy `EXPO_PUBLIC_API_URL`) if `app.json` extras are empty.

### `401` on every API call from the device

- Confirm the mobile `EXPO_PUBLIC_API_BASE_URL` reaches the machine running Nest.
- Confirm Supabase JWT is the **user** access token from `supabase.auth`, not the anon key as Bearer (the app uses Bearer user session — see `http-client.ts`).
