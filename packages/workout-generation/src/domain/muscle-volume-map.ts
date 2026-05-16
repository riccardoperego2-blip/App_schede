import type { MuscleCode } from '@shared/exerciseClassification';
import type { MuscleVolumeGroup } from './generation.types';

/** Maps catalog primary muscle → volume accounting bucket. */
export function muscleCodeToVolumeGroup(code: MuscleCode): MuscleVolumeGroup {
  switch (code) {
    case 'chest':
      return 'chest';
    case 'lats':
    case 'upper_back':
    case 'traps':
      return 'upper_back';
    case 'lower_back':
      return 'lower_back';
    case 'quads':
      return 'quads';
    case 'hamstrings':
      return 'hamstrings';
    case 'glutes':
      return 'glutes';
    case 'front_delts':
      return 'delts_anterior';
    case 'side_delts':
      return 'delts_lateral';
    case 'rear_delts':
      return 'delts_posterior';
    case 'biceps':
      return 'biceps';
    case 'triceps':
      return 'triceps';
    case 'forearms':
      return 'forearms';
    case 'calves':
      return 'calves';
    case 'abs':
    case 'obliques':
    case 'hip_flexors':
      return 'core';
    case 'tibialis_anterior':
      return 'calves';
    case 'adductors':
      return 'hamstrings';
    default:
      return 'core';
  }
}

export function mergeMusclePrioritiesForSelection(
  targets: Readonly<Partial<Record<MuscleVolumeGroup, number>>>,
): Partial<Record<MuscleCode, number>> {
  const out: Partial<Record<MuscleCode, number>> = {};
  const entries = Object.entries(targets) as [MuscleVolumeGroup, number][];
  for (const [g, w] of entries) {
    if (w == null || w <= 0) continue;
    const codes = volumeGroupToPrimaryCodes(g);
    for (const c of codes) {
      out[c] = (out[c] ?? 0) + w / codes.length;
    }
  }
  return out;
}

function volumeGroupToPrimaryCodes(g: MuscleVolumeGroup): readonly MuscleCode[] {
  switch (g) {
    case 'chest':
      return ['chest'];
    case 'upper_back':
      return ['lats', 'upper_back', 'traps'];
    case 'lower_back':
      return ['lower_back'];
    case 'quads':
      return ['quads'];
    case 'hamstrings':
      return ['hamstrings'];
    case 'glutes':
      return ['glutes'];
    case 'delts_anterior':
      return ['front_delts'];
    case 'delts_lateral':
      return ['side_delts'];
    case 'delts_posterior':
      return ['rear_delts'];
    case 'biceps':
      return ['biceps'];
    case 'triceps':
      return ['triceps'];
    case 'forearms':
      return ['forearms'];
    case 'calves':
      return ['calves'];
    case 'core':
      return ['abs', 'obliques'];
    default:
      return [];
  }
}
