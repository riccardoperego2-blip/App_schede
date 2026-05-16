import type { ExerciseCatalogEntry } from '../../../../shared/exerciseClassification';
import type {
  FatigueEngineConfig,
  FatigueReport,
} from '../domain/selection.types';
import { isHeavyAxialCompound } from '../domain/biomechanical-signature';

/**
 * Translates catalog fatigue primitives into a **systemic session load** estimate.
 * Deterministic: same exercises → same numbers.
 */
export class FatigueCalculator {
  constructor(private readonly config: FatigueEngineConfig) {}

  sessionCostMultiplier(cost: ExerciseCatalogEntry['estimated_session_cost']): number {
    return this.config.sessionCostWeight[cost] ?? 1;
  }

  weightedFatigueUnit(ex: ExerciseCatalogEntry): number {
    const base = ex.fatigue_score * this.sessionCostMultiplier(ex.estimated_session_cost);
    return base;
  }

  buildReport(exercises: readonly ExerciseCatalogEntry[], axialTag: string): FatigueReport {
    let rawSum = 0;
    let weightedSum = 0;
    let axialCompoundCount = 0;
    for (const ex of exercises) {
      rawSum += ex.fatigue_score;
      weightedSum += this.weightedFatigueUnit(ex);
      if (isHeavyAxialCompound(ex, axialTag)) axialCompoundCount += 1;
    }
    const axialPenalty =
      Math.max(0, axialCompoundCount - 1) * this.config.axialLoadCompoundPenalty;
    const systemicEstimate = weightedSum + axialPenalty;
    return { rawSum, weightedSum, axialCompoundCount, systemicEstimate };
  }

  wouldExceedCap(
    current: readonly ExerciseCatalogEntry[],
    candidate: ExerciseCatalogEntry,
    cap: number,
    axialTag: string,
  ): boolean {
    const next = [...current, candidate];
    return this.buildReport(next, axialTag).systemicEstimate > cap;
  }
}
