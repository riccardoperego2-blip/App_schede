import { describe, expect, it } from 'vitest';
import type { GeneratedWorkoutDay } from '@schede/workout-generation';
import { WorkoutExecutionEngine } from './WorkoutExecutionEngine';
import type { WorkoutExecutionInput } from './domain/execution.types';

const plannedWorkout: GeneratedWorkoutDay = {
  weekIndex: 1,
  dayIndex: 1,
  label: 'Upper Volume',
  focusMuscleGroups: ['chest', 'upper_back', 'triceps'],
  systemicFatigueEstimate: 34,
  selectionTrace: [],
  exercises: [
    {
      order: 1,
      slug: 'flat_bench_press',
      name: 'Bench Press',
      slotRole: 'primary',
      movementPattern: 'horizontal_push',
      primaryMuscle: 'chest',
      progressionHint: 'Progress reps before load.',
      sets: [
        { setIndex: 1, repsMin: 6, repsMax: 10, intensity: { kind: 'rir', target: 2, lastSetModifier: 0 }, restSeconds: 135 },
        { setIndex: 2, repsMin: 6, repsMax: 10, intensity: { kind: 'rir', target: 2, lastSetModifier: 0 }, restSeconds: 135 },
        { setIndex: 3, repsMin: 6, repsMax: 10, intensity: { kind: 'rir', target: 1, lastSetModifier: -1 }, restSeconds: 135 },
      ],
    },
    {
      order: 2,
      slug: 'dumbbell_row',
      name: 'DB Row',
      slotRole: 'complementary',
      movementPattern: 'horizontal_pull',
      primaryMuscle: 'upper_back',
      progressionHint: 'Progress reps before load.',
      sets: [
        { setIndex: 1, repsMin: 8, repsMax: 12, intensity: { kind: 'rir', target: 2, lastSetModifier: 0 }, restSeconds: 105 },
        { setIndex: 2, repsMin: 8, repsMax: 12, intensity: { kind: 'rir', target: 2, lastSetModifier: 0 }, restSeconds: 105 },
      ],
    },
  ],
};

function baseInput(overrides: Partial<WorkoutExecutionInput> = {}): WorkoutExecutionInput {
  const base: WorkoutExecutionInput = {
    plannedWorkout,
    completedWorkout: {
      workoutId: 'w1',
      completedAt: '2026-05-13T13:00:00.000Z',
      durationMinutes: 66,
      sessionRpe: 7,
      completedExerciseSlugs: ['flat_bench_press', 'dumbbell_row'],
    },
    exerciseLogs: [
      {
        exerciseSlug: 'flat_bench_press',
        primaryMuscle: 'chest',
        sets: [
          { setIndex: 1, targetRepsMin: 6, targetRepsMax: 10, completedReps: 10, loadKg: 100, actualRir: 2, completed: true },
          { setIndex: 2, targetRepsMin: 6, targetRepsMax: 10, completedReps: 10, loadKg: 100, actualRir: 2, completed: true },
          { setIndex: 3, targetRepsMin: 6, targetRepsMax: 10, completedReps: 10, loadKg: 100, actualRir: 1, completed: true },
        ],
      },
      {
        exerciseSlug: 'dumbbell_row',
        primaryMuscle: 'upper_back',
        sets: [
          { setIndex: 1, targetRepsMin: 8, targetRepsMax: 12, completedReps: 11, loadKg: 40, actualRir: 2, completed: true },
          { setIndex: 2, targetRepsMin: 8, targetRepsMax: 12, completedReps: 11, loadKg: 40, actualRir: 2, completed: true },
        ],
      },
    ],
    userRecoveryMetrics: { hrvDeltaPct: 4, restingHeartRateDelta: -1, stressLevel: 4, appetiteScore: 4 },
    bodyWeightTrend: { direction: 'flat', weeklyChangePct: 0.1 },
    sleepQuality: 8,
    soreness: 3,
    fatigueLevel: 4,
    adherenceScore: 0.95,
    workoutHistory: {
      recentSessions: [{ completedAt: '2026-05-11', sessionRpe: 7, adherenceScore: 0.95, systemicFatigueEstimate: 30 }],
      exerciseHistory: [
        { exerciseSlug: 'flat_bench_press', completedAt: '2026-05-06', bestLoadKg: 97.5, bestEstimated1RmKg: 130, totalVolumeKg: 2800, averageRpe: 8, failedSets: 0 },
      ],
    },
    trainingGoal: 'hypertrophy',
    experienceLevel: 'intermediate',
    progressionModel: 'double_progression_reps_then_load',
  };
  return { ...base, ...overrides };
}

describe('WorkoutExecutionEngine', () => {
  it('applies double progression when all sets hit top of rep range', () => {
    const result = new WorkoutExecutionEngine().processCompletedWorkout(baseInput());
    const bench = result.progressions.find((p) => p.exerciseSlug === 'flat_bench_press');
    expect(bench?.action).toBe('increase_load');
    expect(bench?.nextLoadKg).toBeGreaterThan(100);
  });

  it('detects readiness red and schedules deload', () => {
    const result = new WorkoutExecutionEngine().processCompletedWorkout(
      baseInput({
        sleepQuality: 3,
        soreness: 9,
        fatigueLevel: 9,
        userRecoveryMetrics: { hrvDeltaPct: -25, restingHeartRateDelta: 10, stressLevel: 9, appetiteScore: 1 },
      }),
    );
    expect(result.readiness.band).toBe('red');
    expect(result.deload.shouldDeload).toBe(true);
    expect(result.deload.trigger).toBe('readiness_red');
  });

  it('replaces painful exercise instead of progressing load', () => {
    const painful = baseInput({
      exerciseLogs: [
        {
          exerciseSlug: 'flat_bench_press',
          primaryMuscle: 'chest',
          sets: [
            { setIndex: 1, targetRepsMin: 6, targetRepsMax: 10, completedReps: 7, loadKg: 100, actualRpe: 9, painScore: 7, completed: true },
          ],
        },
      ],
    });
    const result = new WorkoutExecutionEngine().processCompletedWorkout(painful);
    expect(result.stall.type).toBe('pain_limited');
    expect(result.progressions[0]?.action).toBe('replace_exercise');
  });

  it('detects personal records from estimated 1RM and session volume', () => {
    const result = new WorkoutExecutionEngine().processCompletedWorkout(baseInput());
    expect(result.personalRecords.some((p) => p.exerciseSlug === 'flat_bench_press')).toBe(true);
  });

  it('is deterministic for identical input', () => {
    const engine = new WorkoutExecutionEngine();
    const a = engine.processCompletedWorkout(baseInput());
    const b = engine.processCompletedWorkout(baseInput());
    expect(a).toEqual(b);
  });
});
