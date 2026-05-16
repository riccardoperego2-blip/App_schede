import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { ExerciseCatalogEntry } from '@shared/exerciseClassification';
import { ExerciseSelectionService, InMemoryExerciseRepository } from '@schede/exercise-selection';
import type { PlannedExercise, WorkoutGenerationInput } from './domain/generation.types';
import { WorkoutGenerationEngine } from './WorkoutGenerationEngine';
import { chooseOptimalSplit } from './engines/SplitSelectionEngine';
import { calculateVolumeLandmarks } from './engines/VolumeLandmarksCalculator';
import { calculateFrequency } from './engines/FrequencyCalculator';
import { distributeWeeklyVolume } from './engines/VolumeDistributionEngine';
import { recoveryManagementSystem } from './engines/RecoveryManagementSystem';

function ex(
  o: Pick<
    ExerciseCatalogEntry,
    'slug' | 'name' | 'movement_pattern' | 'equipment' | 'primary_muscle' | 'exercise_type'
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

const MIN_CATALOG: readonly ExerciseCatalogEntry[] = [
  ex({
    slug: 'barbell_back_squat',
    name: 'Squat',
    movement_pattern: 'squat',
    equipment: 'barbell',
    primary_muscle: 'quads',
    exercise_type: 'compound',
    fatigue_score: 8,
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
    tags: ['hip_dominant'],
    body_region: 'lower',
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
    slug: 'dumbbell_row',
    name: 'Row',
    movement_pattern: 'horizontal_pull',
    equipment: 'dumbbell',
    primary_muscle: 'lats',
    exercise_type: 'compound',
    fatigue_score: 5,
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
    name: 'Curl',
    movement_pattern: 'hinge',
    equipment: 'machine',
    primary_muscle: 'hamstrings',
    exercise_type: 'isolation',
    fatigue_score: 3,
    body_region: 'lower',
  }),
  ex({
    slug: 'lateral_raise_alzate',
    name: 'Raise',
    movement_pattern: 'other',
    equipment: 'dumbbell',
    primary_muscle: 'side_delts',
    exercise_type: 'isolation',
    fatigue_score: 2,
    body_region: 'upper',
  }),
  ex({
    slug: 'cable_crunch',
    name: 'Crunch',
    movement_pattern: 'core_anti_extension',
    equipment: 'cable',
    primary_muscle: 'abs',
    exercise_type: 'isolation',
    fatigue_score: 3,
    body_region: 'core',
  }),
];

function baseGen(over: Partial<WorkoutGenerationInput> = {}): WorkoutGenerationInput {
  const eq = new Set(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'] as const);
  const base: WorkoutGenerationInput = {
    userProfile: { userId: 'u1' },
    trainingGoal: 'hypertrophy',
    experienceLevel: 'intermediate',
    trainingDays: 4,
    sessionDurationMinutes: 70,
    availableEquipment: eq,
    injuries: [],
    recoveryCapacity: 4,
    preferredExercises: new Set(),
    excludedExercises: new Set(),
    weakMuscleGroups: [],
    priorityMuscleGroups: [],
  };
  return { ...base, ...over };
}

describe('WorkoutGenerationEngine', () => {
  it('is deterministic for identical input (split + week1 slugs)', async () => {
    const repo = new InMemoryExerciseRepository(MIN_CATALOG);
    const selection = new ExerciseSelectionService(repo);
    const engine = new WorkoutGenerationEngine({ exerciseSelection: selection });
    const input = baseGen();
    const a = await engine.generateWorkoutPlan(input);
    const b = await engine.generateWorkoutPlan(input);
    expect(a.split).toBe(b.split);
    expect(a.weeks[0]!.days[0]!.exercises.map((e: PlannedExercise) => e.slug)).toEqual(
      b.weeks[0]!.days[0]!.exercises.map((e: PlannedExercise) => e.slug),
    );
  });

  it('marks final mesocycle week as deload with reduced volume multiplier', async () => {
    const repo = new InMemoryExerciseRepository(MIN_CATALOG);
    const selection = new ExerciseSelectionService(repo);
    const engine = new WorkoutGenerationEngine({ exerciseSelection: selection });
    const plan = await engine.generateWorkoutPlan(baseGen({ mesocycleWeeks: 4 }));
    const last = plan.weeks[plan.weeks.length - 1]!;
    expect(last.isDeload).toBe(true);
    expect(last.deload.volumeMultiplier).toBeLessThan(1);
  });

  it('chooseOptimalSplit picks upper_lower for 4-day hypertrophy intermediate', () => {
    const split = chooseOptimalSplit(
      baseGen({ trainingDays: 4, trainingGoal: 'hypertrophy', experienceLevel: 'intermediate' }),
    );
    expect(split).toBe('upper_lower');
  });

  it('recovery capacity 1 caps effective training days', async () => {
    const repo = new InMemoryExerciseRepository(MIN_CATALOG);
    const selection = new ExerciseSelectionService(repo);
    const engine = new WorkoutGenerationEngine({ exerciseSelection: selection });
    const plan = await engine.generateWorkoutPlan(baseGen({ trainingDays: 6, recoveryCapacity: 1 }));
    expect(plan.recoveryReport.frequencyCap).toBeLessThan(6);
    expect(plan.weeks[0]!.days.length).toBeLessThanOrEqual(plan.recoveryReport.frequencyCap);
  });
});

describe('Volume + frequency primitives', () => {
  it('respects MRV cap when distributing weekly volume', () => {
    const lm = calculateVolumeLandmarks('intermediate', 'hypertrophy');
    const dist = distributeWeeklyVolume({
      landmarks: lm,
      recoveryCapacity: 5,
      trainingGoal: 'hypertrophy',
      weakMuscleGroups: ['chest'],
      priorityMuscleGroups: [],
      volumeMultiplier: 1,
    });
    expect(dist.chest).toBeLessThanOrEqual(lm.chest.mrv + 0.001);
  });

  it('calculateFrequency returns >=1 for major groups on full_body', () => {
    const f = calculateFrequency('full_body', 3);
    expect(f.quads).toBe(3);
    expect(f.chest).toBe(3);
  });
});

describe('recoveryManagementSystem', () => {
  it('reduces allowed frequency for low recovery', () => {
    const low = recoveryManagementSystem(1, 6);
    const high = recoveryManagementSystem(5, 6);
    expect(low.frequencyCap).toBeLessThan(high.frequencyCap);
  });
});
