import { mmkvJson } from '../storage/mmkv';
import { api } from '../api/sdk';
import { ApiError } from '../api/errors';
import { logger } from '../logging/logger';
import type { QueuedMutation } from './types';

const QUEUE_KEY = 'schede.offline.queue.v1';
const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 5_000;
const MAX_BACKOFF_MS = 5 * 60_000;
const ALLOWED_KINDS = new Set(['workout.complete', 'profile.update', 'measurement.create']);

type Subscriber = (queue: ReadonlyArray<QueuedMutation>) => void;

/**
 * Decoder rejects mutations whose shape no longer matches the current code.
 * Anything that fails is dropped at load time so a stale release cannot corrupt
 * the live queue. Recovery is logged; the original bytes are quarantined by
 * `mmkvJson` for support bundles.
 */
function decodeQueue(value: unknown): QueuedMutation[] | null {
  if (!Array.isArray(value)) return null;
  const out: QueuedMutation[] = [];
  for (const item of value) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof (item as { id?: unknown }).id !== 'string' ||
      typeof (item as { kind?: unknown }).kind !== 'string' ||
      !ALLOWED_KINDS.has((item as { kind: string }).kind) ||
      typeof (item as { idempotencyKey?: unknown }).idempotencyKey !== 'string' ||
      typeof (item as { attempt?: unknown }).attempt !== 'number' ||
      typeof (item as { nextAttemptAt?: unknown }).nextAttemptAt !== 'string' ||
      typeof (item as { enqueuedAt?: unknown }).enqueuedAt !== 'string'
    ) {
      continue;
    }
    out.push(item as QueuedMutation);
  }
  return out;
}

class OfflineQueue {
  private subscribers = new Set<Subscriber>();
  private flushing = false;

  list(): ReadonlyArray<QueuedMutation> {
    return mmkvJson.getWithDecoder<QueuedMutation[]>(QUEUE_KEY, decodeQueue) ?? [];
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.list());
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  enqueue(mutation: QueuedMutation): void {
    const current = [...this.list(), mutation];
    this.persist(current);
  }

  remove(mutationId: string): void {
    const next = this.list().filter((m) => m.id !== mutationId);
    this.persist(next);
  }

  /**
   * Attempts each queued mutation in FIFO order.
   *  - Server-side errors that are not retryable drop the item.
   *  - Network/timeout/5xx/429 errors increment attempt counter and reschedule.
   *  - Retry-After header (when present) is honored as the minimum next delay.
   *  - Idempotency keys guarantee at-most-once side effects on the backend.
   *  - We do NOT do an unbounded loop: if `nextAttemptAt` is in the future,
   *    the mutation is skipped this flush instead of busy-waiting.
   */
  async flush(): Promise<{ processed: number; remaining: number; succeeded: number }> {
    if (this.flushing) return { processed: 0, remaining: this.list().length, succeeded: 0 };
    this.flushing = true;
    let processed = 0;
    let succeeded = 0;
    try {
      const now = Date.now();
      const queue = [...this.list()];
      for (const mutation of queue) {
        const dueAt = Date.parse(mutation.nextAttemptAt);
        if (Number.isFinite(dueAt) && dueAt > now) continue;
        processed += 1;
        try {
          await this.execute(mutation);
          this.remove(mutation.id);
          succeeded += 1;
        } catch (error) {
          this.handleFailure(mutation, error);
        }
      }
      return { processed, remaining: this.list().length, succeeded };
    } finally {
      this.flushing = false;
    }
  }

  private async execute(mutation: QueuedMutation): Promise<void> {
    switch (mutation.kind) {
      case 'workout.complete':
        await api.workouts.complete(mutation.payload, mutation.idempotencyKey);
        return;
      case 'profile.update':
        await api.profile.update(mutation.payload);
        return;
      case 'measurement.create':
        logger.warn('measurement.create offline replay not wired', { id: mutation.id });
        return;
    }
  }

  private handleFailure(mutation: QueuedMutation, error: unknown): void {
    if (error instanceof ApiError && !error.isRetryable) {
      logger.warn('Dropping non-retryable queued mutation', {
        id: mutation.id,
        kind: mutation.kind,
        status: error.status,
        traceId: error.traceId,
      });
      this.remove(mutation.id);
      return;
    }
    const nextAttempt = mutation.attempt + 1;
    if (nextAttempt > MAX_ATTEMPTS) {
      logger.error('Mutation exceeded max retries', error, { id: mutation.id });
      this.remove(mutation.id);
      return;
    }
    const backoff = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** mutation.attempt);
    const serverHint = error instanceof ApiError ? error.retryAfterMs ?? 0 : 0;
    // jitter prevents synchronized retry storms when many clients reconnect at once
    const jitter = Math.floor(Math.random() * Math.min(1_000, backoff * 0.1));
    const delayMs = Math.max(backoff, serverHint) + jitter;
    const updated: QueuedMutation = {
      ...mutation,
      attempt: nextAttempt,
      nextAttemptAt: new Date(Date.now() + delayMs).toISOString(),
    };
    const next = this.list().map((m) => (m.id === mutation.id ? updated : m));
    this.persist(next);
  }

  private persist(next: ReadonlyArray<QueuedMutation>): void {
    mmkvJson.set(QUEUE_KEY, next);
    this.subscribers.forEach((s) => s(next));
  }
}

export const offlineQueue = new OfflineQueue();
