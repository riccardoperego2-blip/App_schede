# Deploy backend su Railway

Backend NestJS: `apps/backend`. Monorepo **pnpm**; variabili e segreti **non** vanno committati (`.env` resta locale).

## Comandi Railway

| Fase | Comando |
|------|---------|
| **Root directory** | repository root (dove c’è `pnpm-workspace.yaml`) |
| **Build** | `pnpm install --frozen-lockfile && pnpm run build:backend` |
| **Start** | `pnpm run start:backend` |

Il processo ascolta su **`process.env.PORT`** (Railway lo imposta automaticamente; non è obbligatorio definire `PORT` nel dashboard se il provider lo fornisce).

## Dockerfile

Il repo contiene un `Dockerfile` nella root per il deploy backend. Se Railway/Railpack fallisce con errori tipo `secret postgresql not found` o timeout in **Snapshot code**, configura Railway per usare il **Dockerfile** (o il `railway.toml` incluso nel repo) invece del rilevamento Railpack/Nixpacks.

Aggiungi anche un `.dockerignore` nella root: senza di esso, un deploy locale con `railway up` può includere `node_modules` (~500MB+) e far scadere lo snapshot.

Il Dockerfile:

- usa Node 22
- abilita Corepack con `pnpm@9.15.0`
- esegue `pnpm install --frozen-lockfile`
- esegue `pnpm run build:backend`
- espone `3000`
- avvia con `pnpm run start:backend`

Non committare `.env`: le variabili runtime vanno impostate nel dashboard Railway.

## Variabili d’ambiente (Railway)

| Nome | Note |
|------|------|
| `NODE_ENV` | `production` |
| `PORT` | Opzionale se Railway imposta già `PORT` |
| `DB_ENV_SOURCE` | Su Railway impostare `PG_PARTS` per ignorare eventuali `DATABASE_URL` / `SUPABASE_DATABASE_URL`. |
| `PGHOST` | **Preferito su Railway**. Host Postgres/Supabase senza protocollo. |
| `PGUSER` | Utente Postgres/Supabase. |
| `PGPASSWORD` | Password Postgres/Supabase. |
| `PGDATABASE` | Opzionale, default `postgres`. |
| `PGPORT` | Opzionale, default `5432`. |
| `PGSSLMODE` | Opzionale, default `require`. |
| `DATABASE_URL` | Alternativa compatibile per locale/altri provider. Evitala su Railway se il valore inizia con `postgresql://`. |
| `SUPABASE_DATABASE_URL` | Seconda alternativa compatibile. Evitala su Railway se Railpack interpreta male valori `postgresql://`. |
| `SUPABASE_URL` | URL progetto Supabase (es. `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo server** — JWT `service_role` (non loggare, non esporre al client) |
| `SUPABASE_ANON_KEY` | Opzionale sul backend se non usata dal codice; utile per riferimento o tool. L’app mobile usa in genere `EXPO_PUBLIC_*`. |
| `CORS_ORIGINS` | Origini **browser** consentite (comma-separated), es. Expo Web o pannello admin. Richieste **senza** header `Origin` (app native, curl) sono accettate. Lasciare vuoto in produzione = nessun browser in whitelist, solo client senza Origin + origini non abilitate vengono rifiutate. Per Expo Web aggiungere URL dev/prod. |
| `API_PREFIX` | Lasciare vuoto: le API restano su `/v1/...`. |
| `PG_POOL_MAX` | Opzionale (default `10`). |

Non committare `.env`. Non stampare chiavi nei log.

Il backend risolve la connessione in questo ordine:

1. Se `DB_ENV_SOURCE=PG_PARTS`, costruzione da `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`, `PGSSLMODE`
2. `DATABASE_URL`, se presente e non vuota
3. `SUPABASE_DATABASE_URL`, se presente e non vuota
4. costruzione da `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`, `PGSSLMODE`

Su Railway usa preferibilmente `DB_ENV_SOURCE=PG_PARTS` + variabili `PG*`, così nessuna variabile contiene direttamente un valore che inizia con `postgresql://` e il backend non userà URL iniettate dal provider.

## Health check

- `GET /v1/health` — processo OK + uptime  
- `GET /v1/health/db` — database raggiungibile  

Su Railway imposta il path health (es. `/v1/health`) sulla URL pubblica del servizio.

## Mobile (produzione)

Punta l’API alla URL HTTPS del backend Railway:

- `EXPO_PUBLIC_API_URL=https://appschede-production.up.railway.app`

L’app usa questa URL come fallback production se non viene impostata nessuna env API. Per sviluppo locale mantieni `EXPO_PUBLIC_API_URL=http://localhost:3000` in `apps/mobile/.env` (file ignorato da Git).

## Script monorepo (locale / CI)

- `pnpm run build:backend` — build pacchetti workspace + compilazione Nest  
- `pnpm run start:backend` — avvio produzione (`node dist/...` nel package backend)  
- `pnpm run dev:backend` / `pnpm run backend` — sviluppo locale invariato  
