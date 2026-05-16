import type {
  ExecutionAdaptationResult,
  NextWorkoutPatch,
  WorkoutExecutionInput,
} from './domain/execution.types';
import { AdaptiveVolumeEngine } from './engines/AdaptiveVolumeEngine';
import { DeloadDecisionEngine } from './engines/DeloadDecisionEngine';
import { ExercisePerformanceTracker } from './engines/ExercisePerformanceTracker';
import { FatigueAccumulationModel } from './engines/FatigueAccumulationModel';
import { PersonalRecordDetector } from './engines/PersonalRecordDetector';
import { ProgressionEngine } from './engines/ProgressionEngine';
import { ReadinessEngine } from './engines/ReadinessEngine';
import { RecoveryAnalysisEngine } from './engines/RecoveryAnalysisEngine';
import { StallDetectionEngine } from './engines/StallDetectionEngine';

/** Application service for real-world execution feedback and next-prescription patches. */
export class WorkoutExecutionEngine {
  private readonly readiness = new ReadinessEngine();
  private readonly performance = new ExercisePerformanceTracker();
  private readonly recovery = new RecoveryAnalysisEngine();
  private readonly fatigue = new FatigueAccumulationModel();
  private readonly stalls = new StallDetectionEngine();
  private readonly prs = new PersonalRecordDetector();
  private readonly progression = new ProgressionEngine();
  private readonly volume = new AdaptiveVolumeEngine();
  private readonly deload = new DeloadDecisionEngine();

  processCompletedWorkout(input: WorkoutExecutionInput): ExecutionAdaptationResult {
    const readiness = this.readiness.evaluate(input);
    const comparison = this.performance.compareTargetVsPerformance(input);
    const recovery = this.recovery.analyze(input, readiness);
    const fatigue = this.fatigue.evaluate(input);
    const stall = this.stalls.detect(input, comparison, readiness, fatigue);
    const personalRecords = this.prs.detect(input);
    const progressions = this.progression.calculate(input, comparison, readiness, stall);
    const volumeAdjustments = this.volume.adapt(input, comparison, readiness, recovery, stall);
    const deload = this.deload.decide(input, readiness, fatigue, comparison, stall);
    const nextWorkoutPatch = buildNextWorkoutPatch(progressions, volumeAdjustments);

    return {
      readiness,
      comparison,
      recovery,
      fatigue,
      stall,
      personalRecords,
      progressions,
      volumeAdjustments,
      deload,
      nextWorkoutPatch,
    };
  }
}

function buildNextWorkoutPatch(
  progressions: ExecutionAdaptationResult['progressions'],
  volume: ExecutionAdaptationResult['volumeAdjustments'],
): NextWorkoutPatch {
  return {
    exercisePatches: progressions.map((p) => ({
      exerciseSlug: p.exerciseSlug,
      replaceExercise: p.action === 'replace_exercise',
      setPatches: [buildSetPatch(p)],
    })),
    volumeSetDeltasByMuscle: Object.fromEntries(volume.map((v) => [v.muscleGroup, v.setDelta])),
    frequencyDeltasByMuscle: Object.fromEntries(volume.map((v) => [v.muscleGroup, v.frequencyDelta])),
  };
}

function buildSetPatch(
  p: ExecutionAdaptationResult['progressions'][number],
): NextWorkoutPatch['exercisePatches'][number]['setPatches'][number] {
  const patch: {
    repsMin?: number;
    repsMax?: number;
    intensity?: { kind: 'rpe' | 'rir'; target: number; lastSetModifier: number };
  } = {};
  if (p.nextRepsMin != null) patch.repsMin = p.nextRepsMin;
  if (p.nextRepsMax != null) patch.repsMax = p.nextRepsMax;
  if (p.nextRpeTarget != null) {
    patch.intensity = { kind: 'rpe', target: p.nextRpeTarget, lastSetModifier: 0 };
  } else if (p.nextRirTarget != null) {
    patch.intensity = { kind: 'rir', target: p.nextRirTarget, lastSetModifier: 0 };
  }
  return patch;
}
