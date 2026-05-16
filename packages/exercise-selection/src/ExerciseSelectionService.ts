import type { ExerciseCatalogEntry } from '../../../shared/exerciseClassification';
import type { ExerciseRepository } from './ports/ExerciseRepository';
import type { SelectionEngineConfig, SelectionInput, WorkoutSelectionResult } from './domain/selection.types';
import { DEFAULT_SELECTION_CONFIG } from './selection.config';
import { FatigueCalculator } from './engines/FatigueCalculator';
import { OverlapDetectionSystem } from './engines/OverlapDetectionSystem';
import { MovementPatternBalancer } from './engines/MovementPatternBalancer';
import { ExerciseScoringEngine } from './engines/ExerciseScoringEngine';
import { SessionConstraintSolver } from './engines/SessionConstraintSolver';
import { ExerciseSubstitutionEngine } from './engines/ExerciseSubstitutionEngine';

function dbgSelection(...args: unknown[]): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console -- temporary plan-generation diagnostics
    console.log('[ExerciseSelectionService]', ...args);
  }
}

/**
 * Application service — orchestrates repository + domain engines (DDD application layer).
 *
 * **Pipeline**
 * 1. Load catalog (infrastructure port).
 * 2. `SessionConstraintSolver` fills slots greedily under fatigue + overlap + pattern balance.
 * 3. `ExerciseSubstitutionEngine` resolves equipment/injury swaps deterministically.
 */
export class ExerciseSelectionService {
  private readonly substitution = new ExerciseSubstitutionEngine();

  constructor(
    private readonly exerciseRepository: ExerciseRepository,
    private readonly config: SelectionEngineConfig = DEFAULT_SELECTION_CONFIG,
  ) {}

  async selectWorkout(input: SelectionInput): Promise<WorkoutSelectionResult> {
    dbgSelection('selectWorkout start', { epoch: input.selectionEpoch, goal: input.workoutGoal });
    const catalog = await this.exerciseRepository.loadCatalog();
    dbgSelection('selectWorkout catalog', { size: catalog.length });
    const solver = this.buildSolver();
    const out = solver.solve(input, catalog);
    dbgSelection('selectWorkout end', { slots: out.slots.length, fatigue: out.totalSystemicFatigue });
    return out;
  }

  async suggestSubstitution(
    targetSlug: string,
    input: SelectionInput,
    alreadySelectedSlugs: ReadonlySet<string>,
  ): Promise<ExerciseCatalogEntry | undefined> {
    const catalog = await this.exerciseRepository.loadCatalog();
    const target = await this.exerciseRepository.findBySlug(targetSlug);
    if (!target) return undefined;
    const exSet = new Set([...alreadySelectedSlugs, ...input.excludedExercises]);
    return this.substitution.substitute(target, input, catalog, exSet).replacement;
  }

  private buildSolver(): SessionConstraintSolver {
    const fatigue = new FatigueCalculator(this.config.fatigue);
    const overlap = new OverlapDetectionSystem(this.config.overlap);
    const patterns = new MovementPatternBalancer(this.config.patterns);
    const scoring = new ExerciseScoringEngine(this.config, overlap, patterns, fatigue);
    return new SessionConstraintSolver(this.config, fatigue, overlap, patterns, scoring);
  }
}
