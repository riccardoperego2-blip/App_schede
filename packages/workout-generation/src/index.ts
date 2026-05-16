/**
 * @schede/workout-generation — mesocycle + session prescription (MEV/MAV/MRV, SRA, deload).
 */
export type {
  WorkoutGenerationInput,
  GeneratedWorkoutPlan,
  GeneratedWorkoutWeek,
  GeneratedWorkoutDay,
  PlannedExercise,
  PlannedSet,
  VolumeLandmarks,
  MuscleVolumeGroup,
  TrainingGoal,
  ProgressionModel,
  ExperienceLevel,
  RecoveryCapacityScore,
  ProgressionDecision,
  DeloadDecision,
  FatigueManagementReport,
  RecoveryManagementReport,
  TrainingHistorySummary,
} from './domain/generation.types';

export { MUSCLE_VOLUME_GROUPS } from './domain/generation.types';
export { WorkoutGenerationEngine } from './WorkoutGenerationEngine';
export { chooseOptimalSplit } from './engines/SplitSelectionEngine';
export { calculateVolumeLandmarks } from './engines/VolumeLandmarksCalculator';
export { calculateFrequency } from './engines/FrequencyCalculator';
export { distributeWeeklyVolume } from './engines/VolumeDistributionEngine';
export { DeloadEngine } from './engines/DeloadEngine';
export { progressionStrategySelector } from './engines/ProgressionStrategySelector';
export { fatigueManagementSystem } from './engines/FatigueManagementSystem';
export { recoveryManagementSystem } from './engines/RecoveryManagementSystem';
export {
  assignRepRanges,
  assignRPE,
  assignRestTimes,
  buildPlannedSets,
} from './engines/IntensityAssignmentEngine';
export { orderedDayTemplates } from './domain/day-templates';
export { muscleCodeToVolumeGroup, mergeMusclePrioritiesForSelection } from './domain/muscle-volume-map';
