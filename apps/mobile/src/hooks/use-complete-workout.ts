import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/sdk';
import { ApiError } from '../lib/api/errors';
import { offlineQueue } from '../lib/offline/queue';
import { qk } from '../lib/api/query-keys';
import type {
  CompleteWorkoutPayload,
  CompleteWorkoutResponse,
} from '../lib/api/contracts';
import { logger } from '../lib/logging/logger';

function generateId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return (globalThis.crypto as Crypto).randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Optimistic workout completion mutation.
 *
 * Flow:
 *  1. We build an idempotency key tied to the workout day so server-side
 *     replays (including offline retries) collapse on the backend.
 *  2. We attempt the network call. On retryable failures (network, 5xx),
 *     we enqueue the payload in the offline queue and surface a "queued" result.
 *  3. On success or queued, we invalidate caches that depend on workout state.
 */
export function useCompleteWorkout() {
  const queryClient = useQueryClient();

  return useMutation<
    { status: 'synced'; result: CompleteWorkoutResponse } | { status: 'queued'; mutationId: string },
    Error,
    CompleteWorkoutPayload
  >({
    mutationKey: ['workouts', 'complete'],
    mutationFn: async (payload) => {
      const idempotencyKey = `workout:${payload.workoutDayId}:${payload.completedAt}`;
      try {
        const result = await api.workouts.complete(payload, idempotencyKey);
        return { status: 'synced', result };
      } catch (error) {
        if (error instanceof ApiError && error.isRetryable) {
          const mutationId = generateId();
          offlineQueue.enqueue({
            id: mutationId,
            kind: 'workout.complete',
            payload,
            enqueuedAt: new Date().toISOString(),
            attempt: 0,
            nextAttemptAt: new Date().toISOString(),
            idempotencyKey,
          });
          logger.info('Workout queued for offline sync', { mutationId });
          return { status: 'queued', mutationId };
        }
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: qk.workouts.history() });
      await queryClient.refetchQueries({ queryKey: qk.workouts.history() });
      void queryClient.invalidateQueries({ queryKey: qk.workouts.todays() });
      void queryClient.invalidateQueries({ queryKey: qk.dashboard() });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
      await queryClient.refetchQueries({ queryKey: ['analytics'] });
    },
  });
}
