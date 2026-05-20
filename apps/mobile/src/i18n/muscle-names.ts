import type { AppLanguage } from './types';

const MUSCLE_NAMES: Record<string, { readonly it: string; readonly en: string }> = {
  chest: { it: 'Petto', en: 'Chest' },
  back: { it: 'Schiena', en: 'Back' },
  quads: { it: 'Quadricipiti', en: 'Quads' },
  hamstrings: { it: 'Femorali', en: 'Hamstrings' },
  shoulders: { it: 'Spalle', en: 'Shoulders' },
  biceps: { it: 'Bicipiti', en: 'Biceps' },
  triceps: { it: 'Tricipiti', en: 'Triceps' },
  glutes: { it: 'Glutei', en: 'Glutes' },
  calves: { it: 'Polpacci', en: 'Calves' },
  core: { it: 'Core', en: 'Core' },
  lats: { it: 'Dorsali', en: 'Lats' },
  traps: { it: 'Trapezi', en: 'Traps' },
  abs: { it: 'Addominali', en: 'Abs' },
  arms: { it: 'Braccia', en: 'Arms' },
  legs: { it: 'Gambe', en: 'Legs' },
  other: { it: 'Altro', en: 'Other' },
};

function normalizeMuscleKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function humanizeMuscle(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function translateMuscleName(muscleGroup: string, lang: AppLanguage): string {
  const key = normalizeMuscleKey(muscleGroup);
  const entry = MUSCLE_NAMES[key];
  if (entry) return entry[lang];
  return humanizeMuscle(muscleGroup);
}
