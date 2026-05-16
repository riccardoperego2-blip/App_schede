import type { ExerciseCatalogEntry } from '../../../../shared/exerciseClassification';
import type { SelectionInput } from '../domain/selection.types';
import { biomechanicalSignature, exerciseMatchesEquipment } from '../domain/biomechanical-signature';
import { mapWorkoutGoalToFitnessCodes } from '../selection.config';

export interface SubstitutionResult {
  readonly replacement: ExerciseCatalogEntry | undefined;
  readonly ranked: readonly { exercise: ExerciseCatalogEntry; substitutionScore: number }[];
}

/**
 * Deterministic replacement finder: ranks candidates by **biomechanical proximity**
 * to the target exercise, then by SFR, then slug.
 */
export class ExerciseSubstitutionEngine {
  substitute(
    target: ExerciseCatalogEntry,
    input: Pick<
      SelectionInput,
      | 'availableEquipment'
      | 'experienceLevel'
      | 'injuries'
      | 'excludedExercises'
      | 'workoutGoal'
    >,
    catalog: readonly ExerciseCatalogEntry[],
    excludeSlugs: ReadonlySet<string> = new Set(),
  ): SubstitutionResult {
    const goals = new Set(mapWorkoutGoalToFitnessCodes(input.workoutGoal));
    const ranked = catalog
      .filter((e) => e.slug !== target.slug)
      .filter((e) => !excludeSlugs.has(e.slug))
      .filter((e) => !input.excludedExercises.has(e.slug))
      .filter((e) => exerciseMatchesEquipment(e, input.availableEquipment))
      .map((e) => ({
        exercise: e,
        substitutionScore: this.proximityScore(target, e, input, goals),
      }))
      .sort((a, b) => {
        if (b.substitutionScore !== a.substitutionScore) {
          return b.substitutionScore - a.substitutionScore;
        }
        if (b.exercise.stimulus_to_fatigue_ratio !== a.exercise.stimulus_to_fatigue_ratio) {
          return b.exercise.stimulus_to_fatigue_ratio - a.exercise.stimulus_to_fatigue_ratio;
        }
        return a.exercise.slug.localeCompare(b.exercise.slug);
      });

    return { replacement: ranked[0]?.exercise, ranked };
  }

  private proximityScore(
    target: ExerciseCatalogEntry,
    cand: ExerciseCatalogEntry,
    input: Pick<SelectionInput, 'experienceLevel' | 'injuries' | 'workoutGoal'>,
    goals: ReadonlySet<string>,
  ): number {
    let s = 0;
    if (cand.movement_pattern === target.movement_pattern) s += 40;
    if (cand.primary_muscle === target.primary_muscle) s += 35;
    const sharedTags = target.tags.filter((t) => cand.tags.includes(t));
    s += sharedTags.length * 6;
    if (cand.equipment === target.equipment) s += 12;
    if (cand.body_region === target.body_region) s += 6;
    if (cand.exercise_type === target.exercise_type) s += 10;
    if (biomechanicalSignature(cand) !== biomechanicalSignature(target)) {
      s += 2;
    } else {
      s -= 30;
    }
    s += cand.stimulus_to_fatigue_ratio * 8;
    if (cand.skill_requirement === 'low' || cand.skill_requirement === 'moderate') s += 4;
    for (const cg of cand.compatible_goals) {
      if (goals.has(cg)) s += 5;
    }
    let viol = 0;
    for (const inj of input.injuries) {
      if (inj.avoidPrimaryMuscles?.includes(cand.primary_muscle)) viol += 400;
      if (inj.avoidMovementPatterns?.includes(cand.movement_pattern)) viol += 350;
      if (inj.avoidTags) {
        for (const t of inj.avoidTags) {
          if (cand.tags.includes(t)) viol += 120;
        }
      }
      if (inj.maxInjuryRisk === 'low' && cand.injury_risk === 'high') viol += 500;
    }
    if (viol >= 300) return -1e6;
    return s;
  }
}
