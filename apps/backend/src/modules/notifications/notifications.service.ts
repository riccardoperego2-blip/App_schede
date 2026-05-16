import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { DomainEvent } from '../../core/events/domain-event-bus';
import { PgUnitOfWork } from '../../core/supabase/pg-unit-of-work';

@Injectable()
export class NotificationsService {
  constructor(private readonly uow: PgUnitOfWork) {}

  @OnEvent('workout.completed', { async: true })
  async notifyWorkoutCompleted(event: DomainEvent): Promise<void> {
    if (!event.userId) return;
    await this.uow.execute(async (tx) => {
      await tx.query(
        `insert into public.notifications (user_id, kind, channel, title, body, payload)
         values ($1, 'system', 'in_app', $2, $3, $4::jsonb)`,
        [
          event.userId,
          'Allenamento completato',
          'Progressione e readiness aggiornate.',
          JSON.stringify(event.payload),
        ],
      );
    });
  }

  @OnEvent('workout.plan.generated', { async: true })
  async notifyPlanGenerated(event: DomainEvent): Promise<void> {
    if (!event.userId) return;
    await this.uow.execute(async (tx) => {
      await tx.query(
        `insert into public.notifications (user_id, kind, channel, title, body, payload)
         values ($1, 'plan_updated', 'in_app', $2, $3, $4::jsonb)`,
        [event.userId, 'Nuova scheda pronta', 'La tua scheda è stata generata.', JSON.stringify(event.payload)],
      );
    });
  }
}
