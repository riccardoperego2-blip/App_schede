import { http } from '../api/http-client';
import { ApiError } from '../api/errors';
import type { AnalyticsEventEnvelope } from './events';

export interface IngestResponse {
  readonly accepted_event_ids: string[];
  readonly rejected: Array<{ event_id: string; reason: string }>;
}

export interface AnalyticsTransport {
  send(batch: ReadonlyArray<AnalyticsEventEnvelope>): Promise<IngestResponse>;
}

/**
 * Default HTTP transport. Talks to `POST /v1/analytics/events` on the NestJS
 * backend. We deliberately do not piggy-back analytics on the offline mutation
 * queue: analytics events are append-only and high-volume, with a different
 * loss tolerance than business mutations.
 */
export const httpAnalyticsTransport: AnalyticsTransport = {
  async send(batch) {
    if (batch.length === 0) {
      return { accepted_event_ids: [], rejected: [] };
    }
    try {
      return await http.post<IngestResponse>('/analytics/events', { events: batch });
    } catch (error) {
      if (error instanceof ApiError && !error.isRetryable) {
        // Non-retryable: the batch is malformed or auth is gone.
        // Mark everything accepted so we don't loop forever on a poison pill.
        return { accepted_event_ids: batch.map((e) => e.event_id), rejected: [] };
      }
      throw error;
    }
  },
};
