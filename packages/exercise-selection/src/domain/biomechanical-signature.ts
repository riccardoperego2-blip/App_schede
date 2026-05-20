import type { ExerciseCatalogEntry, MovementPattern } from '../../../../shared/exerciseClassification';

/** Deterministic biomechanical fingerprint for redundancy control. */
export function biomechanicalSignature(ex: ExerciseCatalogEntry): string {
  const tags = [...ex.tags].sort().join(',');
  return `${ex.movement_pattern}|${ex.primary_muscle}|${tags}`;
}

export function patternMuscleKey(ex: ExerciseCatalogEntry): string {
  return `${ex.movement_pattern}::${ex.primary_muscle}`;
}

export function isHeavyAxialCompound(ex: ExerciseCatalogEntry, axialTag: string): boolean {
  return (
    ex.exercise_type === 'compound' &&
    ex.tags.includes(axialTag)
  );
}

function isBodyweightOnlyEquipment(available: ReadonlySet<string>): boolean {
  if (!available.has('bodyweight')) return false;
  const heavy = ['barbell', 'dumbbell', 'machine', 'cable', 'kettlebell'] as const;
  return !heavy.some((e) => available.has(e));
}

export function exerciseMatchesEquipment(
  ex: ExerciseCatalogEntry,
  available: ReadonlySet<string>,
): boolean {
  if (isBodyweightOnlyEquipment(available)) {
    return ex.equipment === 'bodyweight' || (available.has('band') && ex.equipment === 'band');
  }

  if (available.has(ex.equipment)) return true;
  /** Home gym: bodyweight + band + dumbbell always if present in set */
  if (ex.tags.includes('home_gym')) {
    const home = ['bodyweight', 'band', 'dumbbell', 'kettlebell'] as const;
    if (home.some((e) => ex.equipment === e && available.has(e))) return true;
  }
  return false;
}

export function histogramPatterns(
  list: readonly { movement_pattern: MovementPattern }[],
): Partial<Record<MovementPattern, number>> {
  const h: Partial<Record<MovementPattern, number>> = {};
  for (const ex of list) {
    h[ex.movement_pattern] = (h[ex.movement_pattern] ?? 0) + 1;
  }
  return h;
}
