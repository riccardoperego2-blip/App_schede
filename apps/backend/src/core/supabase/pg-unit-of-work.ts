import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import type { AppConfig } from '../config/app.config';

export interface DbExecutor {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: readonly unknown[]): Promise<QueryResult<T>>;
}

export interface UnitOfWorkExecuteOptions {
  /** Postgres `statement_timeout` for this transaction (default 15s). */
  readonly statementTimeoutMs?: number;
}

export interface UnitOfWork {
  execute<T>(handler: (tx: DbExecutor) => Promise<T>, options?: UnitOfWorkExecuteOptions): Promise<T>;
}

@Injectable()
export class PgUnitOfWork implements UnitOfWork, OnModuleDestroy {
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    const app = config.getOrThrow<AppConfig>('app');
    const { connectionString, ssl } = poolConnectionOptions(app.databaseUrl);
    this.pool = new Pool({
      connectionString,
      max: app.pgPoolMax,
      idleTimeoutMillis: 30_000,
      ...(ssl ? { ssl } : {}),
    });
  }

  async execute<T>(handler: (tx: DbExecutor) => Promise<T>, options?: UnitOfWorkExecuteOptions): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const ms = options?.statementTimeoutMs ?? 15_000;
      await client.query(`SET LOCAL statement_timeout = '${ms}ms'`);
      const result = await handler(wrapClient(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Supabase pooler needs TLS; `sslmode=require` in the URL alone makes Node verify the chain
 * strictly. We keep DATABASE_URL in .env unchanged but apply `ssl.rejectUnauthorized: false`
 * here and drop `sslmode` from the string passed to `pg` so it does not override Pool.ssl.
 */
function poolConnectionOptions(databaseUrl: string): {
  connectionString: string;
  ssl: { rejectUnauthorized: false } | undefined;
} {
  const supabaseTls =
    /\.supabase\.co|\.pooler\.supabase\.com/i.test(databaseUrl) ||
    /[?&]sslmode=require/i.test(databaseUrl);

  if (!supabaseTls) {
    return { connectionString: databaseUrl, ssl: undefined };
  }

  const connectionString = databaseUrl
    .replace(/([?&])sslmode=[^&]*/gi, (_, sep) => (sep === '?' ? '?' : ''))
    .replace(/\?&/, '?')
    .replace(/\?$/, '');

  return {
    connectionString,
    ssl: { rejectUnauthorized: false },
  };
}

function wrapClient(client: PoolClient): DbExecutor {
  return {
    query: <T extends QueryResultRow = QueryResultRow>(sql: string, params?: readonly unknown[]) =>
      client.query<T>(sql, params ? [...params] : undefined),
  };
}
