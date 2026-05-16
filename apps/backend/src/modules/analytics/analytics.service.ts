import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { DomainEvent } from '../../core/events/domain-event-bus';
import { PgUnitOfWork } from '../../core/supabase/pg-unit-of-work';

/**
 * Captures domain events emitted by the application services and persists
 * them as analytics events. This is a *server-side* feed — the client SDK
 * ingests its own events through `AnalyticsController`.
 *
 * Server-side events carry the authority of the application layer (workout
 * actually saved, PR actually detected) and are therefore the source of
 * truth for retention and outcome metrics. Client-side events are kept
 * for funnel and friction analysis only.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly uow: PgUnitOfWork) {}

  @OnEvent('workout.*', { async: true })
  async captureWorkoutEvent(event: DomainEvent): Promise<void> {
    await this.uow.execute(async (tx) => {
      await tx.query(
        `insert into public.analytics_events
          (event_id, user_id, client_session_id, category, event_name, properties, occurred_at, received_at, app_version, os, os_version, client_locale)
         values ($1, $2, null, 'workout'::analytics_event_category, $3, $4::jsonb, $5, timezone('utc', now()), 'server', 'server', null, null)
         on conflict (event_id) do nothing`,
        [
          `server:${event.type}:${event.aggregateId}:${event.occurredAt}`,
          event.userId ?? null,
          event.type,
          JSON.stringify(event.payload),
          event.occurredAt,
        ],
      );
    });
  }

  @OnEvent('plan.*', { async: true })
  async capturePlanEvent(event: DomainEvent): Promise<void> {
    await this.uow.execute(async (tx) => {
      await tx.query(
        `insert into public.analytics_events
          (event_id, user_id, client_session_id, category, event_name, properties, occurred_at, received_at, app_version, os, os_version, client_locale)
         values ($1, $2, null, 'progression'::analytics_event_category, $3, $4::jsonb, $5, timezone('utc', now()), 'server', 'server', null, null)
         on conflict (event_id) do nothing`,
        [
          `server:${event.type}:${event.aggregateId}:${event.occurredAt}`,
          event.userId ?? null,
          event.type,
          JSON.stringify(event.payload),
          event.occurredAt,
        ],
      );
    });
  }
}
