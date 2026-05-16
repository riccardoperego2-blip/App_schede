        import type { MovementPattern } from '../../../../shared/exerciseClassification';
import type { PatternBalancerConfig, TrainingSplit } from '../domain/selection.types';
import { histogramPatterns } from '../domain/biomechanical-signature';

/**
 * Compares live pattern histogram vs split-specific target weights.
 * Returns a **bonus** (positive) for underrepresented patterns, **penalty** (negative contribution) when over-concentrated.
 */
export class MovementPatternBalancer {
  constructor(private readonly cfg: PatternBalancerConfig) {}

  /**
   * Score adjustment for adding `pattern` given current selection histogram.
   */
  patternAdjustment(
    split: TrainingSplit,
    pattern: MovementPattern,
    selectedSoFar: Readonly<Partial<Record<MovementPattern, number>>>,
  ): number {
    const targets = this.cfg.splitPatternTargets[split];
    if (!targets) return 0;

    const hist = { ...selectedSoFar };
    hist[pattern] = (hist[pattern] ?? 0) + 1;

    const targetSum = Object.values(targets).reduce((a, b) => a + (b ?? 0), 0) || 1;
    const histSum = Object.values(hist).reduce((a, b) => a + (b ?? 0), 0) || 1;

    let bonus = 0;
    let penalty = 0;

    for (const p of Object.keys(targets) as MovementPattern[]) {
      const tw = targets[p] ?? 0;
      if (tw <= 0) continue;
      const idealShare = tw / targetSum;
      const actualShare = (hist[p] ?? 0) / histSum;
      const delta = idealShare - actualShare;
      if (p === pattern) {
        if (delta > 0.05) bonus += delta * this.cfg.imbalancePenaltyScale * 8;
        if (delta < -0.08) penalty += -delta * this.cfg.imbalancePenaltyScale * 10;
      }
    }

    return bonus - penalty;
  }

  mergeHistogram(
    base: Readonly<Partial<Record<MovementPattern, number>>>,
    add: MovementPattern,
  ): Partial<Record<MovementPattern, number>> {
    const h = { ...base };
    h[add] = (h[add] ?? 0) + 1;
    return h;
  }

  fromExercises(
    list: readonly { movement_pattern: MovementPattern }[],
  ): Partial<Record<MovementPattern, number>> {
    return histogramPatterns(list);
  }
}
