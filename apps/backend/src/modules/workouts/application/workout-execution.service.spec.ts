import type { User } from '@supabase/supabase-js';
import { WorkoutExecutionService } from './workout-execution.service';
import type { WorkoutRepository } from '../infrastructure/workout.repository';
import type { DomainEventBus } from '../../../core/events/domain-event-bus';
import type { PgUnitOfWork } from '../../../core/supabase/pg-unit-of-work';
import type { CompleteWorkoutDto } from '../api/dto/complete-workout.dto';

describe('WorkoutExecutionService', () => {
  it('runs completion inside unit of work and appends outbox event', async () => {
    const tx = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const uow = { execute: jest.fn((handler) => handler(tx)) } as unknown as PgUnitOfWork;
    const repo = {
      loadPlannedWorkout: jest.fn().mockResolvedValue({
        weekIndex: 1,
        dayIndex: 0,
        label: 'Upper',
        focusMuscleGroups: ['chest'],
        systemicFatigueEstimate: 0,
        selectionTrace: [],
        exercises: [
          {
            order: 1,
            slug: 'flat_bench_press',
            name: 'Bench',
            slotRole: 'primary',
            movementPattern: 'horizontal_push',
            primaryMuscle: 'chest',
            progressionHint: '',
            sets: [
              { setIndex: 1, repsMin: 6, repsMax: 10, intensity: { kind: 'rir', target: 2, lastSetModifier: 0 }, restSeconds: 120 },
            ],
          },
        ],
      }),
      loadWorkoutHistory: jest.fn().mockResolvedValue({ recentSessions: [], exerciseHistory: [] }),
      saveCompletedWorkout: jest.fn().mockResolvedValue('session-id'),
    } as unknown as WorkoutRepository;
    const events = { appendToOutbox: jest.fn() } as unknown as DomainEventBus;
    const service = new WorkoutExecutionService(uow, repo, events);

    const dto: CompleteWorkoutDto = {
      workoutDayId: 'day-id',
      completedAt: new Date().toISOString(),
      durationMinutes: 55,
      sessionRpe: 7,
      exerciseLogs: [
        {
          exerciseSlug: 'flat_bench_press',
          primaryMuscle: 'chest',
          sets: [
            { setIndex: 1, targetRepsMin: 6, targetRepsMax: 10, completedReps: 10, loadKg: 100, actualRir: 2, completed: true },
          ],
        },
      ],
      sleepQuality: 8,
      soreness: 3,
      fatigueLevel: 4,
      adherenceScore: 1,
      trainingGoal: 'hypertrophy',
      experienceLevel: 'intermediate',
      progressionModel: 'double_progression_reps_then_load',
    };

    const result = await service.complete({ id: 'user-id' } as User, dto);
    expect(result.sessionId).toBe('session-id');
    expect(uow.execute).toHaveBeenCalledTimes(1);
    expect(events.appendToOutbox).toHaveBeenCalledWith(tx, expect.objectContaining({ type: 'workout.completed' }));
  });
});
