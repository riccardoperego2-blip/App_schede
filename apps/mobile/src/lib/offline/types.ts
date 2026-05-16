import type { CompleteWorkoutPayload } from '../api/contracts';

export type MutationKind =
  | 'workout.complete'
  | 'profile.update'
  | 'measurement.create';

export interface BaseMutation<K extends MutationKind, P> {
  readonly id: string;
  readonly kind: K;
  readonly payload: P;
  readonly enqueuedAt: string;
  readonly attempt: number;
  readonly nextAttemptAt: string;
  readonly idempotencyKey: string;
}

export type WorkoutCompleteMutation = BaseMutation<'workout.complete', CompleteWorkoutPayload>;
export type ProfileUpdateMutation = BaseMutation<
  'profile.update',
  Partial<{ displayName: string; avatarUrl: string | null }>
>;
export type MeasurementCreateMutation = BaseMutation<
  'measurement.create',
  { measuredAt: string; weightKg?: number; bodyFatPct?: number; notes?: string }
>;

export type QueuedMutation =
  | WorkoutCompleteMutation
  | ProfileUpdateMutation
  | MeasurementCreateMutation;
