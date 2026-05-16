jest.mock('../src/lib/api/sdk', () => ({
  api: {
    workouts: {
      complete: jest.fn(),
    },
    profile: {
      update: jest.fn(),
    },
  },
}));

import { offlineQueue } from '../src/lib/offline/queue';
import { api } from '../src/lib/api/sdk';
import { ApiError } from '../src/lib/api/errors';
import type { QueuedMutation, WorkoutCompleteMutation } from '../src/lib/offline/types';

const completeMock = api.workouts.complete as jest.Mock;

function makeWorkoutMutation(id: string): WorkoutCompleteMutation {
  return {
    id,
    kind: 'workout.complete',
    payload: {
      workoutDayId: 'day-1',
      completedAt: '2026-05-13T10:00:00Z',
      durationMinutes: 50,
      exerciseLogs: [],
      sleepQuality: 7,
      soreness: 4,
      fatigueLevel: 5,
      adherenceScore: 0.95,
      trainingGoal: 'hypertrophy',
      experienceLevel: 'intermediate',
      progressionModel: 'double_progression_reps_then_load',
    },
    enqueuedAt: '2026-05-13T10:00:00Z',
    attempt: 0,
    nextAttemptAt: '2026-05-13T10:00:00Z',
    idempotencyKey: `workout:day-1:2026-05-13T10:00:00Z`,
  };
}

function reset(): void {
  offlineQueue.list().forEach((m: QueuedMutation) => offlineQueue.remove(m.id));
  completeMock.mockReset();
}

describe('offline queue', () => {
  beforeEach(reset);

  it('flushes successful mutations and removes them', async () => {
    completeMock.mockResolvedValueOnce({ sessionId: 's-1', adaptation: {} });
    offlineQueue.enqueue(makeWorkoutMutation('m-1'));
    const result = await offlineQueue.flush();
    expect(result.succeeded).toBe(1);
    expect(offlineQueue.list()).toHaveLength(0);
    expect(completeMock).toHaveBeenCalledTimes(1);
  });

  it('reschedules retryable failures with backoff', async () => {
    completeMock.mockRejectedValueOnce(
      new ApiError({ kind: 'network', status: null, message: 'down' }),
    );
    offlineQueue.enqueue(makeWorkoutMutation('m-2'));
    await offlineQueue.flush();
    const queued = offlineQueue.list();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.attempt).toBe(1);
    expect(Date.parse(queued[0]?.nextAttemptAt ?? '')).toBeGreaterThan(Date.now());
  });

  it('drops non-retryable errors', async () => {
    completeMock.mockRejectedValueOnce(
      new ApiError({ kind: 'validation', status: 422, message: 'bad' }),
    );
    offlineQueue.enqueue(makeWorkoutMutation('m-3'));
    await offlineQueue.flush();
    expect(offlineQueue.list()).toHaveLength(0);
  });

  it('skips mutations whose nextAttemptAt is in the future', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    offlineQueue.enqueue({ ...makeWorkoutMutation('m-4'), nextAttemptAt: future });
    const result = await offlineQueue.flush();
    expect(result.processed).toBe(0);
    expect(offlineQueue.list()).toHaveLength(1);
    expect(completeMock).not.toHaveBeenCalled();
  });
});
