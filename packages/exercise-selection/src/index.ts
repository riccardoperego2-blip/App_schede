/**
 * @schede/exercise-selection — deterministic exercise selection (application + domain engines).
 */
export type {
  SelectionInput,
  SelectionEngineConfig,
  WorkoutSelectionResult,
  SelectedExerciseSlot,
  InjuryConstraint,
  WeeklyVolumeTargets,
  UserProfileSelection,
  TrainingSplit,
  WorkoutGoal,
  ExperienceLevel,
  FatigueReport,
  SlotRole,
} from './domain/selection.types';

export { DEFAULT_SELECTION_CONFIG, mapWorkoutGoalToFitnessCodes } from './selection.config';
export { ExerciseSelectionService } from './ExerciseSelectionService';
export { ExerciseScoringEngine } from './engines/ExerciseScoringEngine';
export { FatigueCalculator } from './engines/FatigueCalculator';
export { MovementPatternBalancer } from './engines/MovementPatternBalancer';
export { OverlapDetectionSystem } from './engines/OverlapDetectionSystem';
export { ExerciseSubstitutionEngine } from './engines/ExerciseSubstitutionEngine';
export { SessionConstraintSolver } from './engines/SessionConstraintSolver';
export type { ExerciseRepository } from './ports/ExerciseRepository';
export { ExerciseRepositoryBase } from './repositories/ExerciseRepositoryBase';
export { InMemoryExerciseRepository } from './repositories/InMemoryExerciseRepository';
export { NodeFsJsonExerciseRepository } from './infrastructure/NodeFsJsonExerciseRepository';
