# Deploy backend su Railway

Backend NestJS: `apps/backend`. Monorepo **pnpm**; variabili e segreti **non** vanno committati (`.env` resta locale).

## Comandi Railway

| Fase | Comando |
|------|---------|
| **Root directory** | repository root (dove c’è `pnpm-workspace.yaml`) |
| **Build** | `pnpm install --frozen-lockfile && pnpm run build:backend` |
| **Start** | `pnpm run start:backend` |

Il processo ascolta su **`process.env.PORT`** (Railway lo imposta automaticamente; non è obbligatorio definire `PORT` nel dashboard se il provider lo fornisce).

## Variabili d’ambiente (Railway)

| Nome | Note |
|------|------|
| `NODE_ENV` | `production` |
| `PORT` | Opzionale se Railway imposta già `PORT` |
| `DATABASE_URL` | Connection string Postgres (`postgresql://…`) |
| `SUPABASE_URL` | URL progetto Supabase (es. `https://xxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo server** — JWT `service_role` (non loggare, non esporre al client) |
| `SUPABASE_ANON_KEY` | Opzionale sul backend se non usata dal codice; utile per riferimento o tool. L’app mobile usa in genere `EXPO_PUBLIC_*`. |
| `CORS_ORIGINS` | Origini **browser** consentite (comma-separated), es. Expo Web o pannello admin. Richieste **senza** header `Origin` (app native, curl) sono accettate. Lasciare vuoto in produzione = nessun browser in whitelist, solo client senza Origin + origini non abilitate vengono rifiutate. Per Expo Web aggiungere URL dev/prod. |
| `API_PREFIX` | Lasciare vuoto: le API restano su `/v1/...`. |
| `PG_POOL_MAX` | Opzionale (default `10`). |

Non committare `.env`. Non stampare chiavi nei log.

## Health check

- `GET /v1/health` — processo OK + uptime  
- `GET /v1/health/db` — database raggiungibile  

Su Railway imposta il path health (es. `/v1/health`) sulla URL pubblica del servizio.

## Mobile (produzione)

Punta l’API alla URL HTTPS del backend Railway, es.:

- `EXPO_PUBLIC_API_BASE_URL_PROD=https://<tuoprogetto>.up.railway.app`

Allineala con ciò che usi in `apps/mobile` per la base URL in build di release (vedi `.env.example` / env locali; **non** committare segreti).

## Script monorepo (locale / CI)

- `pnpm run build:backend` — build pacchetti workspace + compilazione Nest  
- `pnpm run start:backend` — avvio produzione (`node dist/...` nel package backend)  
- `pnpm run dev:backend` / `pnpm run backend` — sviluppo locale invariato  
