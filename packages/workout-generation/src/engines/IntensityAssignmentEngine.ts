import type { ExperienceLevel, TrainingGoal } from '../domain/generation.types';
import type { ExerciseCatalogEntry } from '@shared/exerciseClassification';
import type { SlotRole } from '@schede/exercise-selection';
import type { IntensityPrescription, PlannedSet } from '../domain/generation.types';

export interface RepRange {
  readonly min: number;
  readonly max: number;
}

export function assignRepRanges(
  goal: TrainingGoal,
  exercise: ExerciseCatalogEntry,
  slotRole: SlotRole,
  orderIndex: number,
): RepRange {
  if (goal === 'strength') {
    if (slotRole === 'primary' && exercise.exercise_type === 'compound') {
      return orderIndex === 0 ? { min: 2, max: 5 } : { min: 3, max: 6 };
    }
    if (exercise.exercise_type === 'isolation') return { min: 8, max: 12 };
    return { min: 5, max: 8 };
  }
  if (goal === 'hypertrophy') {
    if (slotRole === 'primary' && exercise.exercise_type === 'compound') {
      return { min: 5, max: 10 };
    }
    if (slotRole === 'isolation' || exercise.exercise_type === 'isolation') {
      return { min: 10, max: 18 };
    }
    return { min: 8, max: 15 };
  }
  if (goal === 'fat_loss') {
    return exercise.exercise_type === 'compound'
      ? { min: 6, max: 12 }
      : { min: 12, max: 20 };
  }
  if (goal === 'rehab') {
    return { min: 10, max: 20 };
  }
  return { min: 6, max: 12 };
}

export function assignRPE(
  goal: TrainingGoal,
  exercise: ExerciseCatalogEntry,
  slotRole: SlotRole,
  setIndex: number,
  totalSets: number,
): IntensityPrescription {
  const last = setIndex === totalSets;
  if (goal === 'strength') {
    const base = slotRole === 'primary' ? 8.0 : 7.0;
    return {
      kind: 'rpe',
      target: base + (last ? 0.5 : 0),
      lastSetModifier: last ? 0.5 : 0,
    };
  }
  /** Hypertrophy / general: RIR-first autoregulation */
  const baseRir =
    exercise.exercise_type === 'compound' ? (slotRole === 'primary' ? 2 : 2.5) : 1.5;
  const rir = Math.max(0, baseRir - (last ? 1 : 0));
  return { kind: 'rir', target: rir, lastSetModifier: last ? -1 : 0 };
}

export function assignRestTimes(
  goal: TrainingGoal,
  exercise: ExerciseCatalogEntry,
  slotRole: SlotRole,
): number {
  const compound = exercise.exercise_type === 'compound';
  if (goal === 'strength') {
    if (compound && slotRole === 'primary') return 195;
    if (compound) return 165;
    return 90;
  }
  if (goal === 'hypertrophy') {
    if (compound && slotRole === 'primary') return 135;
    if (compound) return 105;
    return 75;
  }
  if (goal === 'fat_loss') {
    return compound ? 75 : 45;
  }
  return compound ? 120 : 75;
}

export function buildPlannedSets(
  goal: TrainingGoal,
  exercise: ExerciseCatalogEntry,
  slotRole: SlotRole,
  weeklySetsForMuscle: number,
  frequencyHits: number,
  orderIndex: number,
  experience: ExperienceLevel,
): readonly PlannedSet[] {
  const sets = computeWorkingSets(
    exercise,
    slotRole,
    weeklySetsForMuscle,
    frequencyHits,
    experience,
  );
  const reps = assignRepRanges(goal, exercise, slotRole, orderIndex);
  const rest = assignRestTimes(goal, exercise, slotRole);
  const out: PlannedSet[] = [];
  for (let i = 1; i <= sets; i++) {
    out.push({
      setIndex: i,
      repsMin: reps.min,
      repsMax: reps.max,
      intensity: assignRPE(goal, exercise, slotRole, i, sets),
      restSeconds: rest,
    });
  }
  return out;
}

function computeWorkingSets(
  exercise: ExerciseCatalogEntry,
  slotRole: SlotRole,
  weeklySetsForMuscle: number,
  frequencyHits: number,
  experience: ExperienceLevel,
): number {
  const hits = Math.max(1, frequencyHits);
  const perSession = Math.max(2, Math.round(weeklySetsForMuscle / hits));
  let cap = slotRole === 'primary' ? 5 : slotRole === 'complementary' ? 4 : 3;
  if (experience === 'beginner') cap = Math.min(cap, 4);
  if (exercise.exercise_type === 'isolation') cap = Math.min(cap, 4);
  return Math.min(cap, Math.max(2, perSession));
}
