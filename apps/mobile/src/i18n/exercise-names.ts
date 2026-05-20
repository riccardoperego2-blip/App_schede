import type { AppLanguage } from './types';

type ExerciseEntry = { readonly it: string; readonly en: string };

const EXERCISE_NAMES: Record<string, ExerciseEntry> = {
  bench_press: { it: 'Panca piana', en: 'Bench press' },
  flat_bench_press: { it: 'Panca piana', en: 'Bench press' },
  'bench-press': { it: 'Panca piana', en: 'Bench press' },
  floor_press: { it: 'Floor press', en: 'Floor press' },
  incline_bench_press: { it: 'Panca inclinata', en: 'Incline bench press' },
  barbell_back_squat: { it: 'Squat bilanciere', en: 'Back squat' },
  squat: { it: 'Squat', en: 'Squat' },
  front_squat: { it: 'Front squat', en: 'Front squat' },
  goblet_squat: { it: 'Goblet squat', en: 'Goblet squat' },
  deadlift: { it: 'Stacco da terra', en: 'Deadlift' },
  romanian_deadlift: { it: 'Stacco rumeno', en: 'Romanian deadlift' },
  rdl: { it: 'Stacco rumeno', en: 'Romanian deadlift' },
  'romanian-deadlift': { it: 'Stacco rumeno', en: 'Romanian deadlift' },
  lat_pulldown: { it: 'Lat machine', en: 'Lat pulldown' },
  'lat-pulldown': { it: 'Lat machine', en: 'Lat pulldown' },
  leg_press_45: { it: 'Leg press 45°', en: '45° leg press' },
  'leg-press-45': { it: 'Leg press 45°', en: '45° leg press' },
  dumbbell_row: { it: 'Rematore manubrio', en: 'Dumbbell row' },
  'dumbbell-row': { it: 'Rematore manubrio', en: 'Dumbbell row' },
  barbell_row: { it: 'Rematore bilanciere', en: 'Barbell row' },
  leg_curl_seated: { it: 'Leg curl seduto', en: 'Seated leg curl' },
  lateral_raise_alzate: { it: 'Alzate laterali', en: 'Lateral raise' },
  cable_crunch: { it: 'Crunch ai cavi', en: 'Cable crunch' },
  band_pull_apart: { it: 'Band pull-apart', en: 'Band pull-apart' },
  handstand_push_up: { it: 'Handstand push-up', en: 'Handstand push-up' },
  overhead_press: { it: 'Lento avanti', en: 'Overhead press' },
  pull_up: { it: 'Trazioni', en: 'Pull-up' },
  chin_up: { it: 'Trazioni supine', en: 'Chin-up' },
  hip_thrust: { it: 'Hip thrust', en: 'Hip thrust' },
  calf_raise: { it: 'Polpacci', en: 'Calf raise' },
};

function normalizeExerciseKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function humanizeSlug(value: string): string {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function translateExerciseName(
  slugOrName: string,
  lang: AppLanguage,
  fallbackName?: string,
): string {
  const raw = slugOrName.trim();
  if (!raw) return fallbackName?.trim() || '—';

  const keys = [raw.toLowerCase(), normalizeExerciseKey(raw)];
  for (const key of keys) {
    const entry = EXERCISE_NAMES[key];
    if (entry) return entry[lang];
  }

  const normalizedFallback = fallbackName ? normalizeExerciseKey(fallbackName) : '';
  if (normalizedFallback) {
    const entry = EXERCISE_NAMES[normalizedFallback];
    if (entry) return entry[lang];
  }

  if (fallbackName?.trim()) return fallbackName.trim();
  return humanizeSlug(raw);
}
