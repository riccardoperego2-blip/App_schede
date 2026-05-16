export type {
  AdaptiveVolumeDecision,
  BodyWeightTrend,
  CompletedSetLog,
  CompletedWorkout,
  DeloadDecisionExecution,
  ExerciseLog,
  ExercisePerformanceSummary,
  ExecutionAdaptationResult,
  ExecutionRepository,
  FatigueAccumulation,
  HistoricalExercisePerformance,
  NextWorkoutPatch,
  PerformanceComparison,
  PersonalRecord,
  ProgressionRecommendation,
  ReadinessBand,
  ReadinessScore,
  RecoveryAnalysis,
  StallDecision,
  StallType,
  UserRecoveryMetrics,
  WorkoutExecutionInput,
  WorkoutHistory,
} from './domain/execution.types';

export { WorkoutExecutionEngine } from './WorkoutExecutionEngine';
export { AdaptiveVolumeEngine } from './engines/AdaptiveVolumeEngine';
export { DeloadDecisionEngine } from './engines/DeloadDecisionEngine';
export { ExercisePerformanceTracker } from './engines/ExercisePerformanceTracker';
export { FatigueAccumulationModel } from './engines/FatigueAccumulationModel';
export { PersonalRecordDetector } from './engines/PersonalRecordDetector';
export { ProgressionEngine } from './engines/ProgressionEngine';
export { ReadinessEngine } from './engines/ReadinessEngine';
export { RecoveryAnalysisEngine } from './engines/RecoveryAnalysisEngine';
export { StallDetectionEngine } from './engines/StallDetectionEngine';
export { InMemoryExecutionRepository } from './repositories/InMemoryExecutionRepository';
