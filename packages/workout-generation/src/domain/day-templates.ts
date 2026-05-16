import type { TrainingSplit } from '@schede/exercise-selection';
import type { MuscleVolumeGroup } from '../domain/generation.types';

export interface DayTemplate {
  readonly label: string;
  readonly focusMuscleGroups: readonly MuscleVolumeGroup[];
}

/**
 * Canonical session order for a split (coach ordering: pattern balance within week).
 */
export function orderedDayTemplates(
  split: TrainingSplit,
  trainingDays: number,
): readonly DayTemplate[] {
  const d = Math.min(7, Math.max(1, trainingDays));
  const full = templatesForSplit(split);
  return full.slice(0, d);
}

function templatesForSplit(split: TrainingSplit): readonly DayTemplate[] {
  switch (split) {
    case 'full_body':
      return [
        { label: 'Full Body A', focusMuscleGroups: ['quads', 'chest', 'upper_back', 'core'] },
        { label: 'Full Body B', focusMuscleGroups: ['hamstrings', 'glutes', 'chest', 'upper_back'] },
        { label: 'Full Body C', focusMuscleGroups: ['quads', 'delts_lateral', 'triceps', 'biceps'] },
        { label: 'Full Body D', focusMuscleGroups: ['hamstrings', 'upper_back', 'delts_posterior', 'core'] },
      ];
    case 'upper_lower':
      return [
        { label: 'Upper Strength', focusMuscleGroups: ['chest', 'upper_back', 'triceps', 'biceps'] },
        { label: 'Lower Strength', focusMuscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'] },
        { label: 'Upper Volume', focusMuscleGroups: ['chest', 'delts_lateral', 'upper_back', 'biceps'] },
        { label: 'Lower Volume', focusMuscleGroups: ['quads', 'hamstrings', 'glutes', 'lower_back'] },
      ];
    case 'push_pull_legs':
      return [
        { label: 'Push', focusMuscleGroups: ['chest', 'delts_anterior', 'delts_lateral', 'triceps'] },
        { label: 'Pull', focusMuscleGroups: ['upper_back', 'biceps', 'delts_posterior', 'forearms'] },
        { label: 'Legs', focusMuscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'] },
        { label: 'Push B', focusMuscleGroups: ['chest', 'triceps', 'delts_lateral'] },
        { label: 'Pull B', focusMuscleGroups: ['upper_back', 'biceps', 'delts_posterior'] },
        { label: 'Legs B', focusMuscleGroups: ['quads', 'hamstrings', 'glutes'] },
      ];
    case 'bro_split':
      return [
        { label: 'Chest', focusMuscleGroups: ['chest', 'delts_anterior'] },
        { label: 'Back', focusMuscleGroups: ['upper_back', 'lower_back', 'delts_posterior'] },
        { label: 'Shoulders', focusMuscleGroups: ['delts_anterior', 'delts_lateral', 'delts_posterior'] },
        { label: 'Legs', focusMuscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'] },
        { label: 'Arms', focusMuscleGroups: ['biceps', 'triceps', 'forearms'] },
      ];
    case 'powerlifting_focus':
      return [
        { label: 'Squat + accessories', focusMuscleGroups: ['quads', 'glutes', 'hamstrings', 'core'] },
        { label: 'Bench + upper', focusMuscleGroups: ['chest', 'triceps', 'upper_back'] },
        { label: 'Deadlift + posterior', focusMuscleGroups: ['hamstrings', 'glutes', 'lower_back', 'upper_back'] },
        { label: 'GPP / light', focusMuscleGroups: ['upper_back', 'delts_posterior', 'core'] },
      ];
    case 'athlete_hybrid':
      return [
        { label: 'Strength lower', focusMuscleGroups: ['quads', 'hamstrings', 'glutes'] },
        { label: 'Strength upper', focusMuscleGroups: ['chest', 'upper_back', 'triceps'] },
        { label: 'Power / unilateral', focusMuscleGroups: ['quads', 'hamstrings', 'calves', 'core'] },
        { label: 'Capacity', focusMuscleGroups: ['upper_back', 'delts_lateral', 'triceps'] },
      ];
    default:
      return [
        { label: 'Session A', focusMuscleGroups: ['chest', 'quads', 'upper_back'] },
        { label: 'Session B', focusMuscleGroups: ['hamstrings', 'glutes', 'delts_lateral'] },
      ];
  }
}
