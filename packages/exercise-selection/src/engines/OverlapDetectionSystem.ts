import type { ExerciseCatalogEntry } from '../../../../shared/exerciseClassification';
import type { OverlapEngineConfig } from '../domain/selection.types';
import { biomechanicalSignature, patternMuscleKey } from '../domain/biomechanical-signature';

export interface OverlapContext {
  readonly selected: readonly ExerciseCatalogEntry[];
}

/**
 * Quantifies biomechanical redundancy between a candidate and the current session set.
 * Higher penalty ⇒ worse fit (subtracted from score).
 */
export class OverlapDetectionSystem {
  constructor(private readonly cfg: OverlapEngineConfig) {}

  computePenalty(candidate: ExerciseCatalogEntry, ctx: OverlapContext): number {
    let penalty = 0;
    const sig = biomechanicalSignature(candidate);
    const pmKey = patternMuscleKey(candidate);

    for (const s of ctx.selected) {
      if (biomechanicalSignature(s) === sig) {
        penalty += 50;
      }
      if (patternMuscleKey(s) === pmKey) {
        penalty += candidate.exercise_type === 'compound' && s.exercise_type === 'compound' ? 18 : 8;
      }
      if (s.primary_muscle === candidate.primary_muscle) {
        const bothCompound =
          s.exercise_type === 'compound' && candidate.exercise_type === 'compound';
        penalty += bothCompound
          ? this.cfg.primaryMuscleCompoundOverlapPenalty
          : this.cfg.primaryMuscleIsolationOverlapPenalty;
      }
    }

    const patternCount = ctx.selected.filter((s) => s.movement_pattern === candidate.movement_pattern)
      .length;
    if (patternCount > this.cfg.duplicatePatternSoftCap) {
      penalty +=
        (patternCount - this.cfg.duplicatePatternSoftCap) *
        this.cfg.duplicatePatternPenaltyPerExtra;
    }

    const kneeCount = [...ctx.selected, candidate].filter((e) =>
      e.tags.includes(this.cfg.kneeDominantTag),
    ).length;
    if (kneeCount > 2) {
      penalty += (kneeCount - 2) * 6;
    }

    return penalty;
  }

  hasHardConflict(candidate: ExerciseCatalogEntry, ctx: OverlapContext): boolean {
    /** Hard block: identical slug already */
    if (ctx.selected.some((s) => s.slug === candidate.slug)) return true;
    return false;
  }
}
