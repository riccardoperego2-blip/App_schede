import { __resetServerEnvCacheForTests } from '../src/core/config/server-env';

/**
 * Default env for unit tests. Override in a specific test file if needed.
 * Keeps `getServerEnv()` / ConfigModule happy when modules import app config.
 */
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PORT = process.env.PORT ?? '3000';
process.env.API_PREFIX = process.env.API_PREFIX ?? '';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'x'.repeat(40);
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:8081';
process.env.PG_POOL_MAX = process.env.PG_POOL_MAX ?? '10';

beforeEach(() => {
  __resetServerEnvCacheForTests();
});
