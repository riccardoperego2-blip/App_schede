import { useWorkoutSessionStore, workoutSelectors } from '../src/stores/workout-session.store';
import type { PlannedWorkoutDetail } from '../src/lib/api/contracts';

const planned: PlannedWorkoutDetail = {
  workoutDayId: 'day-1',
  weekNumber: 1,
  dayLabel: 'Upper',
  isDeload: false,
  notes: null,
  exercises: [
    {
      id: 'ex-1',
      slug: 'bench_press',
      name: 'Bench Press',
      primaryMuscle: 'chest',
      orderIndex: 0,
      restSeconds: 90,
      tempoCode: null,
      notes: null,
      sets: [
        {
          setIndex: 1,
          targetRepsMin: 6,
          targetRepsMax: 8,
          targetLoadKg: 80,
          targetRpe: 8,
          targetRir: 2,
          restSeconds: 90,
        },
        {
          setIndex: 2,
          targetRepsMin: 6,
          targetRepsMax: 8,
          targetLoadKg: 80,
          targetRpe: 8,
          targetRir: 2,
          restSeconds: 90,
        },
      ],
    },
  ],
};

describe('workout session store', () => {
  beforeEach(() => {
    useWorkoutSessionStore.getState().cancel();
  });

  it('initializes draft from planned workout', () => {
    useWorkoutSessionStore.getState().start('plan-1', planned);
    const state = useWorkoutSessionStore.getState();
    expect(state.status).toBe('running');
    expect(state.exercises).toHaveLength(1);
    expect(state.exercises[0]?.sets).toHaveLength(2);
    expect(state.workoutDayId).toBe('day-1');
  });

  it('completes a set, computes adherence and volume', () => {
    useWorkoutSessionStore.getState().start('plan-1', planned);
    useWorkoutSessionStore.getState().completeSet('ex-1', 1, { reps: 7, loadKg: 80 });
    const state = useWorkoutSessionStore.getState();
    expect(workoutSelectors.completedSetCount(state)).toBe(1);
    expect(workoutSelectors.plannedSetCount(state)).toBe(2);
    expect(workoutSelectors.adherenceScore(state)).toBe(0.5);
    expect(workoutSelectors.totalVolumeKg(state)).toBe(560);
  });

  it('serializes only completed sets to exercise logs', () => {
    useWorkoutSessionStore.getState().start('plan-1', planned);
    useWorkoutSessionStore.getState().completeSet('ex-1', 1, { reps: 8, loadKg: 80 });
    const logs = workoutSelectors.toExerciseLogs(useWorkoutSessionStore.getState());
    expect(logs).toHaveLength(1);
    expect(logs[0]?.sets).toHaveLength(1);
    expect(logs[0]?.sets[0]?.completedReps).toBe(8);
    expect(logs[0]?.sets[0]?.completed).toBe(true);
  });

  it('pause/resume tracks paused time', async () => {
    useWorkoutSessionStore.getState().start('plan-1', planned);
    useWorkoutSessionStore.getState().pause();
    await new Promise((r) => setTimeout(r, 10));
    useWorkoutSessionStore.getState().resume();
    const state = useWorkoutSessionStore.getState();
    expect(state.status).toBe('running');
    expect(state.totalPausedMs).toBeGreaterThan(0);
  });

  it('addSetTo clones the last planned set', () => {
    useWorkoutSessionStore.getState().start('plan-1', planned);
    useWorkoutSessionStore.getState().addSetTo('ex-1');
    const exercise = useWorkoutSessionStore.getState().exercises[0];
    expect(exercise?.sets).toHaveLength(3);
    expect(exercise?.sets[2]?.setIndex).toBe(3);
    expect(exercise?.sets[2]?.completed).toBe(false);
  });
});
