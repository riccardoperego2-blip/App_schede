import { Injectable, Logger } from '@nestjs/common';
import { PgUnitOfWork } from '../../../core/supabase/pg-unit-of-work';
import type { AnalyticsEnvelopeDto, IngestEventsResponse } from '../api/dto/ingest-events.dto';

/**
 * Production-grade ingestion for the mobile telemetry SDK.
 *
 * Design notes:
 *  - The endpoint is idempotent on `event_id` via the unique index on the
 *    warehouse table (`analytics_events_dedupe_uniq`).
 *  - Backpressure: oversized batches are rejected at the controller (200 max).
 *  - We never trust client-side `occurred_at` for billing or retention; we
 *    store both `occurred_at` (client clock) and `received_at` (server clock)
 *    so warehouse queries can pick the right one.
 *  - `user_id` is taken from the authenticated principal, never from the
 *    client payload. This prevents one user from logging events as another.
 *  - Events arrive in batches; we do a single multi-row insert per request.
 */
@Injectable()
export class AnalyticsIngestionService {
  private readonly logger = new Logger(AnalyticsIngestionService.name);

  constructor(private readonly uow: PgUnitOfWork) {}

  async ingest(userId: string, envelopes: AnalyticsEnvelopeDto[]): Promise<IngestEventsResponse> {
    if (envelopes.length === 0) {
      return { accepted_event_ids: [], rejected: [] };
    }

    const rejected: IngestEventsResponse['rejected'] = [];
    const valid: AnalyticsEnvelopeDto[] = [];
    const seen = new Set<string>();

    for (const env of envelopes) {
      if (seen.has(env.event_id)) {
        rejected.push({ event_id: env.event_id, reason: 'duplicate_in_batch' });
        continue;
      }
      seen.add(env.event_id);
      if (!Number.isFinite(Date.parse(env.occurred_at))) {
        rejected.push({ event_id: env.event_id, reason: 'invalid_occurred_at' });
        continue;
      }
      valid.push(env);
    }

    if (valid.length === 0) {
      return { accepted_event_ids: [], rejected };
    }

    await this.uow.execute(async (tx) => {
      // Multi-row insert with ON CONFLICT for idempotency. PostgreSQL parameter
      // limit is 65,535; with 9 columns per row we have plenty of headroom
      // (batch capped at 200 events).
      const params: unknown[] = [];
      const tuples: string[] = [];
      for (let i = 0; i < valid.length; i += 1) {
        const env = valid[i]!;
        const base = i * 11;
        tuples.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::analytics_event_category, $${base + 5}, $${base + 6}::jsonb, $${base + 7}, timezone('utc', now()), $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`,
        );
        params.push(
          env.event_id,
          userId,
          env.client_session_id,
          env.category,
          env.name,
          JSON.stringify(env.properties ?? {}),
          env.occurred_at,
          env.app_version,
          env.os,
          env.os_version,
          env.locale,
        );
      }
      await tx.query(
        `insert into public.analytics_events
          (event_id, user_id, client_session_id, category, event_name, properties, occurred_at, received_at, app_version, os, os_version, client_locale)
         values ${tuples.join(', ')}
         on conflict (event_id) do nothing`,
        params,
      );
    });

    this.logger.debug(`Ingested ${valid.length} events for user ${userId} (rejected ${rejected.length})`);
    return {
      accepted_event_ids: valid.map((e) => e.event_id),
      rejected,
    };
  }
}
