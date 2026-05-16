import { mmkvJson } from '../storage/mmkv';
import type { AnalyticsEventEnvelope } from './events';

const QUEUE_KEY = 'schede.analytics.queue.v1';
const MAX_QUEUE_LENGTH = 1_000;

/**
 * Persistent FIFO buffer for analytics envelopes.
 *
 * Backed by MMKV (sync, native) so flushes are crash-safe and survive
 * force-quit. The buffer is bounded — under sustained backpressure we
 * drop the oldest events first, because for product analytics the most
 * recent events are far more valuable than ancient ones.
 */
export class AnalyticsQueue {
  list(): AnalyticsEventEnvelope[] {
    return mmkvJson.get<AnalyticsEventEnvelope[]>(QUEUE_KEY) ?? [];
  }

  size(): number {
    return this.list().length;
  }

  enqueueMany(envelopes: ReadonlyArray<AnalyticsEventEnvelope>): { dropped: number } {
    if (envelopes.length === 0) return { dropped: 0 };
    const current = this.list();
    const merged = current.concat(envelopes);
    let dropped = 0;
    let next = merged;
    if (merged.length > MAX_QUEUE_LENGTH) {
      dropped = merged.length - MAX_QUEUE_LENGTH;
      next = merged.slice(dropped);
    }
    mmkvJson.set(QUEUE_KEY, next);
    return { dropped };
  }

  /** Reserve up to `batchSize` events for an in-flight POST. */
  reserveBatch(batchSize: number): AnalyticsEventEnvelope[] {
    const current = this.list();
    return current.slice(0, batchSize);
  }

  /** Remove envelopes by id once their batch was accepted by the backend. */
  ack(acceptedIds: ReadonlyArray<string>): void {
    if (acceptedIds.length === 0) return;
    const accepted = new Set(acceptedIds);
    const next = this.list().filter((env) => !accepted.has(env.event_id));
    mmkvJson.set(QUEUE_KEY, next);
  }

  clear(): void {
    mmkvJson.remove(QUEUE_KEY);
  }
}

export const analyticsQueue = new AnalyticsQueue();
