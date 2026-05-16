import { z } from 'zod';

/** Runtime configuration parsed from `process.env` (fail-fast, typed). */
export interface AppConfig {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly port: number;
  readonly apiPrefix: string;
  readonly databaseUrl: string;
  readonly supabaseUrl: string;
  readonly supabaseServiceRoleKey: string;
  readonly corsOrigins: readonly string[];
  readonly pgPoolMax: number;
}

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

function formatZodError(error: z.ZodError): string {
  const lines = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : '(root)';
    return `  • ${path}: ${issue.message}`;
  });
  return ['Invalid environment configuration:', ...lines, '', 'See apps/backend/.env.example and ENV_SETUP.md at the repo root.'].join('\n');
}

const PLACEHOLDER_SERVICE_KEYS = new Set(
  ['replace-with-service-role-key', 'replace-me', 'your-service-role-key'].map((s) => s.toLowerCase()),
);

const PLACEHOLDER_URL_MARKERS = /YOUR-PROJECT|example\.com/i;

function parseNodeEnv(value: string | undefined): 'development' | 'test' | 'production' {
  if (value === 'production' || value === 'test' || value === 'development') return value;
  return 'development';
}

function splitOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function resolveDatabaseUrl(env: NodeJS.ProcessEnv): string | undefined {
  const direct = nonEmpty(env.DATABASE_URL) ?? nonEmpty(env.SUPABASE_DATABASE_URL);
  if (direct) return direct;

  const host = nonEmpty(env.PGHOST);
  const user = nonEmpty(env.PGUSER);
  const password = nonEmpty(env.PGPASSWORD);
  if (!host || !user || !password) return undefined;

  const port = nonEmpty(env.PGPORT) ?? '5432';
  const database = nonEmpty(env.PGDATABASE) ?? 'postgres';
  const sslmode = nonEmpty(env.PGSSLMODE) ?? 'require';

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}?sslmode=${sslmode}`;
}

const serverEnvSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    PORT: z
      .preprocess((v) => {
        if (v === undefined || v === '') return 3000;
        const n = Number(v);
        return Number.isFinite(n) ? n : v;
      }, z.number({ invalid_type_error: 'PORT must be a number' }).int().min(1).max(65_535)),
    API_PREFIX: z.string().optional().default(''),
    DATABASE_URL: z
      .string({ required_error: 'DATABASE_URL, SUPABASE_DATABASE_URL, or PGHOST/PGUSER/PGPASSWORD is required' })
      .min(1, 'DATABASE_URL, SUPABASE_DATABASE_URL, or PGHOST/PGUSER/PGPASSWORD is required'),
    SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required').url('SUPABASE_URL must be a valid URL'),
    SUPABASE_SERVICE_ROLE_KEY: z
      .string()
      .min(32, 'SUPABASE_SERVICE_ROLE_KEY is required and must look like a real Supabase JWT (server only)'),
    CORS_ORIGINS: z.string().optional(),
    PG_POOL_MAX: z
      .preprocess((v) => {
        if (v === undefined || v === '') return 10;
        const n = Number(v);
        return Number.isFinite(n) ? n : v;
      }, z.number({ invalid_type_error: 'PG_POOL_MAX must be a number' }).int().min(1).max(200)),
  })
  .superRefine((data, ctx) => {
    const db = data.DATABASE_URL.trim();
    if (!db.startsWith('postgres://') && !db.startsWith('postgresql://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'must start with postgres:// or postgresql://',
      });
    }

    const key = data.SUPABASE_SERVICE_ROLE_KEY.trim();
    if (PLACEHOLDER_SERVICE_KEYS.has(key.toLowerCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['SUPABASE_SERVICE_ROLE_KEY'],
        message: 'replace the placeholder with your real service_role JWT from Supabase (server only)',
      });
    }

    const nodeEnv = parseNodeEnv(data.NODE_ENV);
    if (nodeEnv === 'production') {
      const supabaseUrl = data.SUPABASE_URL.trim();
      if (PLACEHOLDER_URL_MARKERS.test(supabaseUrl) || PLACEHOLDER_URL_MARKERS.test(db)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SUPABASE_URL'],
          message: 'remove template placeholders (YOUR-PROJECT, example.com) before production',
        });
      }
    }
  })
  .transform((data) => {
    const nodeEnv = parseNodeEnv(data.NODE_ENV);
    const corsOrigins = splitOrigins(data.CORS_ORIGINS);
    return {
      nodeEnv,
      port: data.PORT,
      apiPrefix: (data.API_PREFIX ?? '').trim(),
      databaseUrl: data.DATABASE_URL.trim(),
      supabaseUrl: data.SUPABASE_URL.trim(),
      supabaseServiceRoleKey: data.SUPABASE_SERVICE_ROLE_KEY.trim(),
      corsOrigins,
      pgPoolMax: data.PG_POOL_MAX,
    } satisfies AppConfig;
  });

/**
 * Parses and validates process env. Throws {@link EnvValidationError} with a
 * multi-line, human-readable message on failure.
 */
export function parseServerEnv(env: NodeJS.ProcessEnv): AppConfig {
  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    API_PREFIX: env.API_PREFIX,
    DATABASE_URL: resolveDatabaseUrl(env),
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    CORS_ORIGINS: env.CORS_ORIGINS,
    PG_POOL_MAX: env.PG_POOL_MAX,
  });

  if (!parsed.success) {
    throw new EnvValidationError(formatZodError(parsed.error));
  }
  return parsed.data;
}

let cached: AppConfig | undefined;

/** Memoized parse — safe to call multiple times (e.g. ConfigModule + bootstrap). */
export function getServerEnv(): AppConfig {
  if (!cached) {
    cached = parseServerEnv(process.env);
  }
  return cached;
}

/** Test helper: clears memoized env between cases. */
export function __resetServerEnvCacheForTests(): void {
  cached = undefined;
}
