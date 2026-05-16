import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { DbExecutor } from '../supabase/pg-unit-of-work';

export interface DomainEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  readonly type: string;
  readonly aggregateId: string;
  readonly userId?: string;
  readonly payload: TPayload;
  readonly occurredAt: string;
}

@Injectable()
export class DomainEventBus {
  constructor(private readonly emitter: EventEmitter2) {}

  publish(event: DomainEvent): void {
    this.emitter.emit(event.type, event);
  }

  async appendToOutbox(tx: DbExecutor, event: DomainEvent): Promise<void> {
    await tx.query(
      `insert into public.application_events
        (event_type, aggregate_id, user_id, payload, occurred_at)
       values ($1, $2, $3, $4::jsonb, $5)`,
      [event.type, event.aggregateId, event.userId ?? null, JSON.stringify(event.payload), event.occurredAt],
    );
  }
}
