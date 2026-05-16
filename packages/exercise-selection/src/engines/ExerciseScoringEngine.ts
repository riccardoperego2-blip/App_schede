import type { ExerciseCatalogEntry, MovementPattern } from '../../../../shared/exerciseClassification';
import type {
  SelectionEngineConfig,
  SelectionInput,
  ScoredExercise,
  SlotRole,
} from '../domain/selection.types';
import { mapWorkoutGoalToFitnessCodes, maxSkillRankForExperience, maxStabilityRankForExperience, skillRankOf } from '../selection.config';
import { exerciseMatchesEquipment } from '../domain/biomechanical-signature';
import type { OverlapDetectionSystem } from './OverlapDetectionSystem';
import type { MovementPatternBalancer } from './MovementPatternBalancer';
import type { FatigueCalculator } from './FatigueCalculator';

export interface ScoringContext {
  readonly input: SelectionInput;
  readonly role: SlotRole;
  readonly selectedSoFar: readonly ExerciseCatalogEntry[];
  readonly patternHistogram: Readonly<Partial<Record<MovementPattern, number>>>;
}

/**
 * Deterministic multi-criteria score. Tie-break: higher score, then lexicographic slug.
 */
export class ExerciseScoringEngine {
  constructor(
    private readonly config: SelectionEngineConfig,
    private readonly overlap: OverlapDetectionSystem,
    private readonly patterns: MovementPatternBalancer,
    private readonly fatigue: FatigueCalculator,
  ) {}

  score(ex: ExerciseCatalogEntry, ctx: ScoringContext): ScoredExercise {
    const b: Record<string, number> = {};
    const input = ctx.input;

    if (!exerciseMatchesEquipment(ex, input.availableEquipment)) {
      return { exercise: ex, totalScore: -1e9, breakdown: { equipment_block: -1e9 } };
    }

    if (input.excludedExercises.has(ex.slug)) {
      return { exercise: ex, totalScore: -1e9, breakdown: { excluded: -1e9 } };
    }

    const skillPenalty = this.skillStabilityPenalty(ex, input.experienceLevel);
    b.skill_stability_penalty = skillPenalty;

    const injuryMagnitude = this.injuryViolationMagnitude(ex, input.injuries);
    const injuryPenalty = -injuryMagnitude;
    b.injury_penalty = injuryPenalty;
    if (injuryMagnitude >= 300) {
      return { exercise: ex, totalScore: -1e9, breakdown: { ...b, hard_injury: -1e9 } };
    }

    const goalCodes = mapWorkoutGoalToFitnessCodes(input.workoutGoal);
    let goalFit = 0;
    for (const g of goalCodes) {
      if (ex.compatible_goals.includes(g)) goalFit += 14;
    }
    b.goal_alignment = goalFit;

    const gw = this.config.scoring.goalWeights[input.workoutGoal] ?? {};
    if (ctx.role === 'primary' && ex.exercise_type === 'compound') {
      b.role_compound_fit = gw.compound_bias ?? 6;
    } else if (ctx.role === 'isolation' && ex.exercise_type === 'isolation') {
      b.role_isolation_fit = gw.isolation_bias ?? 10;
    } else {
      b.role_neutral = 2;
    }

    if (input.workoutGoal === 'strength' && ex.tags.includes('competition_lift')) {
      b.competition_lift = gw.compound_bias ? gw.compound_bias * 0.25 : 3;
    }
    if (input.workoutGoal === 'fat_loss' && ex.exercise_type === 'conditioning') {
      b.conditioning = gw.conditioning_bias ?? 6;
    }
    if (input.workoutGoal === 'sport_performance' && ex.unilateral) {
      b.unilateral = gw.unilateral_bias ?? 5;
    }
    if (input.workoutGoal === 'rehab' && ex.injury_risk === 'low') {
      b.low_injury = gw.low_injury ?? 12;
    }

    const sfr = ex.stimulus_to_fatigue_ratio * this.config.scoring.sfrWeight;
    b.sfr_component = sfr;

    const fatiguePen =
      ex.fatigue_score * this.config.scoring.fatiguePenaltyWeight * this.fatigue.sessionCostMultiplier(ex.estimated_session_cost);
    b.fatigue_penalty = -fatiguePen;

    const overlapPen = this.overlap.computePenalty(ex, { selected: ctx.selectedSoFar });
    b.overlap_penalty = -overlapPen;

    const pat = this.patterns.patternAdjustment(
      input.split,
      ex.movement_pattern,
      ctx.patternHistogram,
    );
    b.pattern_balance = pat;

    if (input.preferredExercises.has(ex.slug)) {
      b.preferred = this.config.scoring.preferredExerciseBoost;
    }

    const muscleP = input.weeklyVolumeTargets?.musclePriority?.[ex.primary_muscle];
    if (muscleP != null && muscleP > 0) {
      b.volume_priority = muscleP * 20;
    }

    const total = Object.values(b).reduce((a, v) => a + v, 0);
    return { exercise: ex, totalScore: total, breakdown: b };
  }

  compareDeterministic(a: ScoredExercise, b: ScoredExercise): number {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return a.exercise.slug.localeCompare(b.exercise.slug);
  }

  private skillStabilityPenalty(ex: ExerciseCatalogEntry, level: SelectionInput['experienceLevel']): number {
    const maxS = maxSkillRankForExperience(level);
    const maxT = maxStabilityRankForExperience(level);
    const sr = skillRankOf(ex.skill_requirement);
    const tr = skillRankOf(ex.stability_requirement);
    let p = 0;
    if (sr > maxS) p += (sr - maxS) * 25;
    if (tr > maxT) p += (tr - maxT) * 18;
    if (level === 'beginner' && ex.difficulty === 'elite') p += 80;
    if (level === 'beginner' && ex.difficulty === 'advanced') p += 35;
    return -p;
  }

  private injuryViolationMagnitude(
    ex: ExerciseCatalogEntry,
    injuries: SelectionInput['injuries'],
  ): number {
    let p = 0;
    for (const inj of injuries) {
      if (inj.avoidPrimaryMuscles?.includes(ex.primary_muscle)) p += 400;
      if (inj.avoidMovementPatterns?.includes(ex.movement_pattern)) p += 350;
      if (inj.avoidTags) {
        for (const t of inj.avoidTags) {
          if (ex.tags.includes(t)) p += 120;
        }
      }
      if (inj.maxInjuryRisk === 'low' && ex.injury_risk === 'high') p += 500;
      if (inj.maxInjuryRisk === 'low' && ex.injury_risk === 'moderate') p += 80;
    }
    return p;
  }
}
