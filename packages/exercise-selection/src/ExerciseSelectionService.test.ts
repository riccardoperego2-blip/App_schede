import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ExerciseCatalogEntry } from '../../../shared/exerciseClassification';
import type { SelectedExerciseSlot, SelectionInput, SelectionTraceEntry } from './domain/selection.types';
import { ExerciseSelectionService } from './ExerciseSelectionService';
import { InMemoryExerciseRepository } from './repositories/InMemoryExerciseRepository';

function ex(
  o: Pick<
    ExerciseCatalogEntry,
    | 'slug'
    | 'name'
    | 'movement_pattern'
    | 'equipment'
    | 'primary_muscle'
    | 'exercise_type'
  > &
    Partial<ExerciseCatalogEntry>,
): ExerciseCatalogEntry {
  const tail = createHash('sha256').update(o.slug).digest('hex').slice(0, 12);
  const base: ExerciseCatalogEntry = {
    id: `00000000-0000-4000-8000-${tail}`,
    slug: o.slug,
    name: o.name,
    primary_muscle: o.primary_muscle,
    secondary_muscles: o.secondary_muscles ?? [],
    movement_pattern: o.movement_pattern,
    equipment: o.equipment,
    difficulty: o.difficulty ?? 'intermediate',
    fatigue_score: o.fatigue_score ?? 6,
    stimulus_to_fatigue_ratio: o.stimulus_to_fatigue_ratio ?? 1.1,
    unilateral: o.unilateral ?? false,
    bilateral: o.bilateral ?? !(o.unilateral ?? false),
    stability_requirement: o.stability_requirement ?? 'moderate',
    skill_requirement: o.skill_requirement ?? 'moderate',
    force_curve: o.force_curve ?? 'descending',
    exercise_type: o.exercise_type,
    body_region: o.body_region ?? 'lower',
    tags: o.tags ?? [],
    compatible_goals: o.compatible_goals ?? ['strength', 'muscle_gain', 'general_fitness'],
    injury_risk: o.injury_risk ?? 'moderate',
    estimated_setup_time_sec: o.estimated_setup_time_sec ?? 120,
    estimated_session_cost: o.estimated_session_cost ?? 'medium',
    tempo_compatibility: o.tempo_compatibility ?? 'high',
  };
  return { ...base, ...o, secondary_muscles: o.secondary_muscles ?? base.secondary_muscles };
}

const CATALOG: readonly ExerciseCatalogEntry[] = [
  ex({
    slug: 'barbell_back_squat',
    name: 'Squat',
    movement_pattern: 'squat',
    equipment: 'barbell',
    primary_muscle: 'quads',
    exercise_type: 'compound',
    fatigue_score: 9,
    tags: ['knee_dominant', 'axial_load'],
    body_region: 'lower',
  }),
  ex({
    slug: 'front_squat',
    name: 'Front Squat',
    movement_pattern: 'squat',
    equipment: 'barbell',
    primary_muscle: 'quads',
    exercise_type: 'compound',
    fatigue_score: 9,
    tags: ['knee_dominant', 'axial_load'],
    body_region: 'lower',
  }),
  ex({
    slug: 'leg_press_45',
    name: 'Leg Press',
    movement_pattern: 'squat',
    equipment: 'machine',
    primary_muscle: 'quads',
    exercise_type: 'compound',
    fatigue_score: 5,
    tags: ['knee_dominant'],
    body_region: 'lower',
  }),
  ex({
    slug: 'romanian_deadlift',
    name: 'RDL',
    movement_pattern: 'hinge',
    equipment: 'barbell',
    primary_muscle: 'hamstrings',
    exercise_type: 'compound',
    fatigue_score: 6,
    tags: ['hip_dominant', 'axial_load'],
    body_region: 'lower',
  }),
  ex({
    slug: 'dumbbell_row',
    name: 'DB Row',
    movement_pattern: 'horizontal_pull',
    equipment: 'dumbbell',
    primary_muscle: 'lats',
    exercise_type: 'compound',
    fatigue_score: 5,
    body_region: 'upper',
  }),
  ex({
    slug: 'flat_bench_press',
    name: 'Bench',
    movement_pattern: 'horizontal_push',
    equipment: 'barbell',
    primary_muscle: 'chest',
    exercise_type: 'compound',
    fatigue_score: 7,
    tags: ['axial_load'],
    body_region: 'upper',
  }),
  ex({
    slug: 'lat_pulldown',
    name: 'Pulldown',
    movement_pattern: 'vertical_pull',
    equipment: 'machine',
    primary_muscle: 'lats',
    exercise_type: 'compound',
    fatigue_score: 4,
    body_region: 'upper',
  }),
  ex({
    slug: 'leg_curl_seated',
    name: 'Leg curl',
    movement_pattern: 'hinge',
    equipment: 'machine',
    primary_muscle: 'hamstrings',
    exercise_type: 'isolation',
    fatigue_score: 3,
    body_region: 'lower',
  }),
  ex({
    slug: 'lateral_raise_alzate',
    name: 'Raises',
    movement_pattern: 'other',
    equipment: 'dumbbell',
    primary_muscle: 'side_delts',
    exercise_type: 'isolation',
    fatigue_score: 2,
    body_region: 'upper',
  }),
  ex({
    slug: 'handstand_push_up',
    name: 'HSPU',
    movement_pattern: 'vertical_push',
    equipment: 'bodyweight',
    primary_muscle: 'front_delts',
    exercise_type: 'compound',
    fatigue_score: 9,
    difficulty: 'elite',
    skill_requirement: 'very_high',
    stability_requirement: 'very_high',
    body_region: 'upper',
  }),
  ex({
    slug: 'goblet_squat',
    name: 'Goblet',
    movement_pattern: 'squat',
    equipment: 'dumbbell',
    primary_muscle: 'quads',
    exercise_type: 'compound',
    fatigue_score: 4,
    tags: ['home_gym', 'knee_dominant'],
    body_region: 'lower',
  }),
  ex({
    slug: 'band_pull_apart',
    name: 'Pull apart',
    movement_pattern: 'horizontal_pull',
    equipment: 'band',
    primary_muscle: 'rear_delts',
    exercise_type: 'isolation',
    fatigue_score: 2,
    tags: ['home_gym'],
    body_region: 'upper',
  }),
];

function baseInput(over: Partial<SelectionInput> = {}): SelectionInput {
  const base: SelectionInput = {
    userProfile: { userId: 'u1' },
    workoutGoal: 'strength',
    split: 'full_body',
    sessionDurationMinutes: 75,
    availableEquipment: new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'band']),
    injuries: [],
    experienceLevel: 'intermediate',
    preferredExercises: new Set(),
    excludedExercises: new Set(),
  };
  return { ...base, ...over };
}

describe('ExerciseSelectionService', () => {
  it('returns deterministic ordering for identical input', async () => {
    const repo = new InMemoryExerciseRepository(CATALOG);
    const svc = new ExerciseSelectionService(repo);
    const input = baseInput();
    const a = await svc.selectWorkout(input);
    const b = await svc.selectWorkout(input);
    expect(a.slots.map((s: SelectedExerciseSlot) => s.exercise.slug)).toEqual(b.slots.map((s: SelectedExerciseSlot) => s.exercise.slug));
  });

  it('does not select elite HSPU for beginner experience', async () => {
    const repo = new InMemoryExerciseRepository(CATALOG);
    const svc = new ExerciseSelectionService(repo);
    const res = await svc.selectWorkout(
      baseInput({ experienceLevel: 'beginner', sessionDurationMinutes: 90 }),
    );
    const slugs = res.slots.map((s: SelectedExerciseSlot) => s.exercise.slug);
    expect(slugs).not.toContain('handstand_push_up');
  });

  it('respects knee-dominant avoidance via injury tags', async () => {
    const repo = new InMemoryExerciseRepository(CATALOG);
    const svc = new ExerciseSelectionService(repo);
    const res = await svc.selectWorkout(
      baseInput({
        injuries: [{ code: 'patella', avoidTags: ['knee_dominant'] }],
      }),
    );
    for (const s of res.slots) {
      expect(s.exercise.tags.includes('knee_dominant')).toBe(false);
    }
  });

  it('home gym equipment filters to available modalities', async () => {
    const repo = new InMemoryExerciseRepository(CATALOG);
    const svc = new ExerciseSelectionService(repo);
    const res = await svc.selectWorkout(
      baseInput({
        availableEquipment: new Set(['dumbbell', 'band', 'bodyweight', 'kettlebell']),
        sessionDurationMinutes: 60,
      }),
    );
    for (const s of res.slots) {
      expect(['dumbbell', 'band', 'bodyweight', 'kettlebell'].includes(s.exercise.equipment)).toBe(true);
    }
  });

  it('substitution returns a deterministic alternative', async () => {
    const repo = new InMemoryExerciseRepository(CATALOG);
    const svc = new ExerciseSelectionService(repo);
    const sub = await svc.suggestSubstitution(
      'barbell_back_squat',
      baseInput({ availableEquipment: new Set(['dumbbell', 'band', 'bodyweight']) }),
      new Set(),
    );
    expect(sub?.slug).toBe('goblet_squat');
  });
});

describe('Edge cases', () => {
  it('emits trace when primary compounds missing from catalog', async () => {
    const onlyIsolation = CATALOG.filter((e) => e.exercise_type === 'isolation');
    const repo = new InMemoryExerciseRepository(onlyIsolation);
    const svc = new ExerciseSelectionService(repo);
    const res = await svc.selectWorkout(baseInput({ sessionDurationMinutes: 60 }));
    expect(res.trace.some((t: SelectionTraceEntry) => t.phase.startsWith('slot_unfilled'))).toBe(true);
  });
});
