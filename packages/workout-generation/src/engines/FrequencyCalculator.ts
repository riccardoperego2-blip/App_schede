import type { TrainingSplit } from '@schede/exercise-selection';
import type { MuscleVolumeGroup } from '../domain/generation.types';
import { MUSCLE_VOLUME_GROUPS } from '../domain/generation.types';

/** SRA-aware hits per muscle group per week given split + committed days. */
export function calculateFrequency(
  split: TrainingSplit,
  trainingDays: number,
): Readonly<Record<MuscleVolumeGroup, number>> {
  const d = Math.min(7, Math.max(1, trainingDays));
  const out = {} as Record<MuscleVolumeGroup, number>;
  for (const g of MUSCLE_VOLUME_GROUPS) {
    out[g] = baseHitsForGroup(split, d, g);
  }
  return out;
}

function baseHitsForGroup(
  split: TrainingSplit,
  days: number,
  g: MuscleVolumeGroup,
): number {
  if (split === 'full_body') {
    return days;
  }
  if (split === 'upper_lower') {
    const upperDays = Math.ceil(days / 2);
    const lowerDays = Math.floor(days / 2);
    if (isLowerDominant(g)) return lowerDays;
    if (isUpperDominant(g)) return upperDays;
    return Math.max(upperDays, lowerDays);
  }
  if (split === 'push_pull_legs') {
    if (isPush(g)) return days >= 5 ? 2 : 1;
    if (isPull(g)) return days >= 5 ? 2 : 1;
    if (isLegs(g)) return days >= 6 ? 2 : 1;
    return 1;
  }
  if (split === 'bro_split') {
    return g === 'chest' && days >= 5 ? 1 : g === 'chest' ? 1 : frequencyBroSplit(g, days);
  }
  if (split === 'powerlifting_focus') {
    if (g === 'quads' || g === 'hamstrings' || g === 'glutes' || g === 'lower_back') return 2;
    if (g === 'chest' || g === 'upper_back' || g === 'triceps') return Math.min(2, days - 2);
    return 1;
  }
  /** athlete_hybrid */
  if (isLegs(g)) return Math.ceil(days * 0.35);
  if (isUpperDominant(g) || isPush(g)) return Math.ceil(days * 0.4);
  return Math.ceil(days * 0.25);
}

function frequencyBroSplit(g: MuscleVolumeGroup, days: number): number {
  const map: Partial<Record<MuscleVolumeGroup, number>> = {
    chest: 1,
    delts_anterior: 1,
    delts_lateral: 1,
    triceps: 1,
    upper_back: 1,
    biceps: 1,
    delts_posterior: 1,
    quads: 1,
    hamstrings: 1,
    calves: 1,
    core: Math.min(2, Math.max(1, Math.floor(days / 4))),
    glutes: 1,
    lower_back: 1,
    forearms: 1,
  };
  void days;
  return map[g] ?? 1;
}

function isPush(g: MuscleVolumeGroup): boolean {
  return (
    g === 'chest' ||
    g === 'delts_anterior' ||
    g === 'delts_lateral' ||
    g === 'triceps'
  );
}

function isPull(g: MuscleVolumeGroup): boolean {
  return g === 'upper_back' || g === 'biceps' || g === 'forearms' || g === 'delts_posterior';
}

function isLegs(g: MuscleVolumeGroup): boolean {
  return g === 'quads' || g === 'hamstrings' || g === 'glutes' || g === 'calves' || g === 'lower_back';
}

function isLowerDominant(g: MuscleVolumeGroup): boolean {
  return isLegs(g) || g === 'core';
}

function isUpperDominant(g: MuscleVolumeGroup): boolean {
  return !isLowerDominant(g);
}
