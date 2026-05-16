import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { mmkv } from '../lib/storage/mmkv';
import { logger } from '../lib/logging/logger';
import type {
  CompletedSetPayload,
  ExerciseLogPayload,
  PlannedExercise,
  PlannedSet,
  PlannedWorkoutDetail,
} from '../lib/api/contracts';

const mmkvStorage: StateStorage = {
  getItem: (name) => mmkv.getString(name) ?? null,
  setItem: (name, value) => mmkv.set(name, value),
  removeItem: (name) => mmkv.delete(name),
};

/**
 * Reliability invariants on top of the workout-session store:
 *  - Sessions older than `STALE_SESSION_MS` are treated as orphaned at hydrate
 *    time and discarded (the user has clearly moved on; the data is unsafe to
 *    submit because the plan version may already be deprecated).
 *  - `start()` is idempotent for the same `workoutDayId`. Re-entering the
 *    workout screen does not wipe an in-progress session.
 *  - `completeSet()` is a no-op when the set is already completed. This
 *    protects against duplicate taps on slow renders and replay loops.
 *  - `addSetTo()` is capped at `MAX_SETS_PER_EXERCISE` to bound state growth.
 */
const STALE_SESSION_MS = 18 * 60 * 60 * 1000;
const MAX_SETS_PER_EXERCISE = 12;

export type SessionStatus = 'idle' | 'running' | 'resting' | 'paused' | 'completed';

export interface SetDraft {
  readonly setIndex: number;
  readonly targetRepsMin: number;
  readonly targetRepsMax: number;
  readonly targetLoadKg: number | null;
  readonly targetRpe: number | null;
  readonly targetRir: number | null;
  readonly restSeconds: number;
  completedReps: number;
  loadKg: number | null;
  actualRpe: number | null;
  painScore: number | null;
  completed: boolean;
  completedAt: string | null;
}

export interface ExerciseDraft {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly primaryMuscle: string;
  readonly orderIndex: number;
  readonly restSeconds: number;
  sets: SetDraft[];
  notes: string | null;
  expanded: boolean;
}

export interface SessionWellness {
  sleepQuality: number;
  soreness: number;
  fatigueLevel: number;
  sessionRpe: number | null;
}

interface WorkoutSessionState {
  workoutDayId: string | null;
  planVersionId: string | null;
  status: SessionStatus;
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedMs: number;
  activeExerciseId: string | null;
  activeSetIndex: number;
  restEndsAt: string | null;
  exercises: ExerciseDraft[];
  wellness: SessionWellness;
  notes: string | null;

  start: (planVersionId: string, workout: PlannedWorkoutDetail) => void;
  resume: () => void;
  pause: () => void;
  cancel: () => void;
  finish: () => void;

  setActiveSet: (exerciseId: string, setIndex: number) => void;
  completeSet: (
    exerciseId: string,
    setIndex: number,
    values: { reps: number; loadKg: number | null; rpe?: number | null; painScore?: number | null },
  ) => void;
  updateSet: (exerciseId: string, setIndex: number, patch: Partial<SetDraft>) => void;
  addSetTo: (exerciseId: string) => void;
  removeSetFrom: (exerciseId: string, setIndex: number) => void;
  startRest: (durationSeconds: number) => void;
  clearRest: () => void;
  toggleExerciseExpanded: (exerciseId: string) => void;
  setWellness: (patch: Partial<SessionWellness>) => void;
  setNotes: (notes: string) => void;
  exerciseNotes: (exerciseId: string, notes: string) => void;
}

function planSetToDraft(set: PlannedSet): SetDraft {
  return {
    setIndex: set.setIndex,
    targetRepsMin: set.targetRepsMin,
    targetRepsMax: set.targetRepsMax,
    targetLoadKg: set.targetLoadKg,
    targetRpe: set.targetRpe,
    targetRir: set.targetRir,
    restSeconds: set.restSeconds,
    completedReps: 0,
    loadKg: set.targetLoadKg,
    actualRpe: null,
    painScore: null,
    completed: false,
    completedAt: null,
  };
}

function plannedToDraft(exercise: PlannedExercise): ExerciseDraft {
  return {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    primaryMuscle: exercise.primaryMuscle,
    orderIndex: exercise.orderIndex,
    restSeconds: exercise.restSeconds,
    sets: exercise.sets.map(planSetToDraft),
    notes: exercise.notes ?? null,
    expanded: true,
  };
}

function updateExercise(
  state: WorkoutSessionState,
  exerciseId: string,
  updater: (exercise: ExerciseDraft) => ExerciseDraft,
): Partial<WorkoutSessionState> {
  return {
    exercises: state.exercises.map((e) => (e.id === exerciseId ? updater(e) : e)),
  };
}

export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  persist(
    (set, get) => ({
      workoutDayId: null,
      planVersionId: null,
      status: 'idle',
      startedAt: null,
      pausedAt: null,
      totalPausedMs: 0,
      activeExerciseId: null,
      activeSetIndex: 0,
      restEndsAt: null,
      exercises: [],
      wellness: { sleepQuality: 7, soreness: 4, fatigueLevel: 4, sessionRpe: null },
      notes: null,

      start: (planVersionId, workout) => {
        const current = get();
        // Idempotent: re-entering the screen on the same workout does not
        // wipe partial progress. The screen consumes the existing draft.
        if (
          current.workoutDayId === workout.workoutDayId &&
          current.status !== 'idle' &&
          current.status !== 'completed' &&
          current.exercises.length > 0
        ) {
          return;
        }
        const exercises = workout.exercises.map(plannedToDraft);
        set({
          workoutDayId: workout.workoutDayId,
          planVersionId,
          status: 'running',
          startedAt: new Date().toISOString(),
          pausedAt: null,
          totalPausedMs: 0,
          activeExerciseId: exercises[0]?.id ?? null,
          activeSetIndex: 0,
          restEndsAt: null,
          exercises,
          wellness: { sleepQuality: 7, soreness: 4, fatigueLevel: 4, sessionRpe: null },
          notes: null,
        });
      },

      resume: () => {
        const { pausedAt, totalPausedMs } = get();
        if (!pausedAt) return;
        const pausedDelta = Date.now() - Date.parse(pausedAt);
        set({ status: 'running', pausedAt: null, totalPausedMs: totalPausedMs + pausedDelta });
      },

      pause: () => {
        if (get().status !== 'running' && get().status !== 'resting') return;
        set({ status: 'paused', pausedAt: new Date().toISOString(), restEndsAt: null });
      },

      cancel: () => {
        logger.info('Workout session cancelled');
        set({
          workoutDayId: null,
          planVersionId: null,
          status: 'idle',
          startedAt: null,
          pausedAt: null,
          totalPausedMs: 0,
          activeExerciseId: null,
          activeSetIndex: 0,
          restEndsAt: null,
          exercises: [],
          wellness: { sleepQuality: 7, soreness: 4, fatigueLevel: 4, sessionRpe: null },
          notes: null,
        });
      },

      finish: () => set({ status: 'completed', restEndsAt: null }),

      setActiveSet: (exerciseId, setIndex) =>
        set({ activeExerciseId: exerciseId, activeSetIndex: setIndex }),

      completeSet: (exerciseId, setIndex, values) =>
        set((state) =>
          updateExercise(state, exerciseId, (exercise) => ({
            ...exercise,
            sets: exercise.sets.map((s) => {
              if (s.setIndex !== setIndex) return s;
              // Race-safe: already completed sets are immutable from this code path.
              // Edits must go through `updateSet`.
              if (s.completed) return s;
              return {
                ...s,
                completedReps: values.reps,
                loadKg: values.loadKg,
                actualRpe: values.rpe ?? s.actualRpe,
                painScore: values.painScore ?? s.painScore,
                completed: true,
                completedAt: new Date().toISOString(),
              };
            }),
          })),
        ),

      updateSet: (exerciseId, setIndex, patch) =>
        set((state) =>
          updateExercise(state, exerciseId, (exercise) => ({
            ...exercise,
            sets: exercise.sets.map((s) => (s.setIndex === setIndex ? { ...s, ...patch } : s)),
          })),
        ),

      addSetTo: (exerciseId) =>
        set((state) =>
          updateExercise(state, exerciseId, (exercise) => {
            if (exercise.sets.length >= MAX_SETS_PER_EXERCISE) return exercise;
            const last = exercise.sets[exercise.sets.length - 1];
            if (!last) return exercise;
            const newSet: SetDraft = {
              ...last,
              setIndex: last.setIndex + 1,
              completedReps: 0,
              actualRpe: null,
              painScore: null,
              completed: false,
              completedAt: null,
            };
            return { ...exercise, sets: [...exercise.sets, newSet] };
          }),
        ),

      removeSetFrom: (exerciseId, setIndex) =>
        set((state) =>
          updateExercise(state, exerciseId, (exercise) => ({
            ...exercise,
            sets: exercise.sets.filter((s) => s.setIndex !== setIndex),
          })),
        ),

      startRest: (durationSeconds) =>
        set({
          status: 'resting',
          restEndsAt: new Date(Date.now() + durationSeconds * 1000).toISOString(),
        }),

      clearRest: () => set({ restEndsAt: null, status: 'running' }),

      toggleExerciseExpanded: (exerciseId) =>
        set((state) =>
          updateExercise(state, exerciseId, (exercise) => ({
            ...exercise,
            expanded: !exercise.expanded,
          })),
        ),

      setWellness: (patch) =>
        set((state) => ({ wellness: { ...state.wellness, ...patch } })),

      setNotes: (notes) => set({ notes }),

      exerciseNotes: (exerciseId, notes) =>
        set((state) =>
          updateExercise(state, exerciseId, (exercise) => ({ ...exercise, notes })),
        ),
    }),
    {
      name: 'schede.workout-session.v1',
      version: 1,
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        workoutDayId: state.workoutDayId,
        planVersionId: state.planVersionId,
        status: state.status,
        startedAt: state.startedAt,
        pausedAt: state.pausedAt,
        totalPausedMs: state.totalPausedMs,
        activeExerciseId: state.activeExerciseId,
        activeSetIndex: state.activeSetIndex,
        exercises: state.exercises,
        wellness: state.wellness,
        notes: state.notes,
      }),
      /**
       * Migration hook for forward-compatible schema changes. Today we are at
       * v1; future migrations should be additive and run idempotently.
       */
      migrate: (persisted, _version): unknown => persisted,
      /**
       * Rehydration guard: stale or malformed drafts are discarded so the next
       * `start()` builds a clean session from the server-side plan.
       */
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          logger.error('Workout session hydration failed', error);
          return;
        }
        if (!state) return;
        if (state.status === 'completed' || state.status === 'idle') return;
        const startedAtMs = state.startedAt ? Date.parse(state.startedAt) : NaN;
        if (
          !Number.isFinite(startedAtMs) ||
          Date.now() - startedAtMs > STALE_SESSION_MS ||
          !Array.isArray(state.exercises) ||
          state.exercises.length === 0
        ) {
          logger.warn('Discarding stale workout session', {
            startedAt: state.startedAt,
            status: state.status,
            exerciseCount: state.exercises?.length ?? 0,
          });
          state.cancel();
        }
      },
    },
  ),
);

/**
 * Selector helpers. Co-located with the store to keep referential equality stable.
 */
export const workoutSelectors = {
  activeExercise(state: WorkoutSessionState): ExerciseDraft | null {
    if (!state.activeExerciseId) return null;
    return state.exercises.find((e) => e.id === state.activeExerciseId) ?? null;
  },
  completedSetCount(state: WorkoutSessionState): number {
    return state.exercises.reduce(
      (total, exercise) => total + exercise.sets.filter((s) => s.completed).length,
      0,
    );
  },
  plannedSetCount(state: WorkoutSessionState): number {
    return state.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  },
  totalVolumeKg(state: WorkoutSessionState): number {
    return state.exercises.reduce((volume, exercise) => {
      return (
        volume +
        exercise.sets.reduce((subtotal, set) => {
          if (!set.completed || !set.loadKg) return subtotal;
          return subtotal + set.loadKg * set.completedReps;
        }, 0)
      );
    }, 0);
  },
  adherenceScore(state: WorkoutSessionState): number {
    const planned = workoutSelectors.plannedSetCount(state);
    if (planned === 0) return 1;
    const completed = workoutSelectors.completedSetCount(state);
    return Math.min(1, completed / planned);
  },
  toExerciseLogs(state: WorkoutSessionState): ExerciseLogPayload[] {
    return state.exercises
      .map((exercise) => ({
        exerciseSlug: exercise.slug,
        primaryMuscle: exercise.primaryMuscle,
        ...(exercise.notes ? { notes: exercise.notes } : {}),
        sets: exercise.sets
          .filter((s) => s.completed)
          .map<CompletedSetPayload>((s) => ({
            setIndex: s.setIndex,
            targetRepsMin: s.targetRepsMin,
            targetRepsMax: s.targetRepsMax,
            completedReps: s.completedReps,
            ...(s.loadKg != null ? { loadKg: s.loadKg } : {}),
            ...(s.actualRpe != null ? { actualRpe: s.actualRpe } : {}),
            ...(s.painScore != null ? { painScore: s.painScore } : {}),
            completed: true,
          })),
      }))
      .filter((log) => log.sets.length > 0);
  },
};
