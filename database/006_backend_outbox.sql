-- Backend application layer support: transactional outbox for domain events.
BEGIN;

CREATE TABLE IF NOT EXISTS public.application_events (
  id             bigserial PRIMARY KEY,
  event_type     text NOT NULL,
  aggregate_id   uuid NOT NULL,
  user_id        uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  published_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_application_events_unpublished
  ON public.application_events (created_at)
  WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_application_events_user_time
  ON public.application_events (user_id, occurred_at DESC);

COMMIT;
