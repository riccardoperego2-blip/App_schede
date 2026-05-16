import type { MuscleCode } from '@shared/exerciseClassification';
import type {
  ExerciseSelectionService,
  SelectedExerciseSlot,
  SelectionInput,
  UserProfileSelection,
  WorkoutGoal,
} from '@schede/exercise-selection';
import type {
  GeneratedWorkoutDay,
  GeneratedWorkoutPlan,
  GeneratedWorkoutWeek,
  MuscleVolumeGroup,
  PlannedExercise,
  TrainingGoal,
  WorkoutGenerationInput,
} from './domain/generation.types';
import { MUSCLE_VOLUME_GROUPS } from './domain/generation.types';
import { orderedDayTemplates } from './domain/day-templates';
import { mergeMusclePrioritiesForSelection, muscleCodeToVolumeGroup } from './domain/muscle-volume-map';
import { chooseOptimalSplit } from './engines/SplitSelectionEngine';
import { calculateVolumeLandmarks } from './engines/VolumeLandmarksCalculator';
import { calculateFrequency } from './engines/FrequencyCalculator';
import { distributeWeeklyVolume } from './engines/VolumeDistributionEngine';
import { DeloadEngine } from './engines/DeloadEngine';
import { progressionStrategySelector } from './engines/ProgressionStrategySelector';
import { fatigueManagementSystem } from './engines/FatigueManagementSystem';
import { recoveryManagementSystem } from './engines/RecoveryManagementSystem';
import { buildPlannedSets } from './engines/IntensityAssignmentEngine';

function dbgEngine(...args: unknown[]): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console -- temporary plan-generation diagnostics
    console.log('[WorkoutGenerationEngine]', ...args);
  }
}

export interface WorkoutGenerationEngineDeps {
  readonly exerciseSelection: ExerciseSelectionService;
}

/**
 * Application orchestrator — `generateWorkoutPlan` is the **primary entry point**
 * for mesocycle construction + per-session exercise prescription.
 */
export class WorkoutGenerationEngine {
  private readonly deload = new DeloadEngine();

  constructor(private readonly deps: WorkoutGenerationEngineDeps) {}

  async generateWorkoutPlan(input: WorkoutGenerationInput): Promise<GeneratedWorkoutPlan> {
    dbgEngine('generateWorkoutPlan start', { userId: input.userProfile.userId, days: input.trainingDays });
    const recovery = recoveryManagementSystem(input.recoveryCapacity, input.trainingDays);
    const effectiveDays = Math.max(1, Math.min(input.trainingDays, recovery.frequencyCap));
    const split = chooseOptimalSplit(input);
    const landmarks = calculateVolumeLandmarks(input.experienceLevel, input.trainingGoal);
    const frequency = calculateFrequency(split, effectiveDays);
    const progression = progressionStrategySelector(input.trainingGoal, input.experienceLevel);
    const mesoWeeks = input.mesocycleWeeks ?? 4;

    const baselineWeekly = distributeWeeklyVolume({
      landmarks,
      recoveryCapacity: input.recoveryCapacity,
      trainingGoal: input.trainingGoal,
      weakMuscleGroups: input.weakMuscleGroups,
      priorityMuscleGroups: input.priorityMuscleGroups,
      ...(input.trainingHistory !== undefined ? { trainingHistory: input.trainingHistory } : {}),
      volumeMultiplier: 1 * recovery.volumeScalarFromRecovery,
    });

    const weeks: GeneratedWorkoutWeek[] = [];
    const projectionForFatigue: { totalSystemicFatigue: number }[] = [];

    for (let w = 1; w <= mesoWeeks; w++) {
      dbgEngine('mesocycle week', w, '/', mesoWeeks);
      const deload = this.deload.decide({
        weekIndex: w,
        mesocycleWeeks: mesoWeeks,
        trainingGoal: input.trainingGoal,
        consecutiveHardWeeks: input.trainingHistory?.consecutiveTrainingWeeks ?? mesoWeeks - 1,
      });
      const weeklySets = distributeWeeklyVolume({
        landmarks,
        recoveryCapacity: input.recoveryCapacity,
        trainingGoal: input.trainingGoal,
        weakMuscleGroups: input.weakMuscleGroups,
        priorityMuscleGroups: input.priorityMuscleGroups,
        ...(input.trainingHistory !== undefined ? { trainingHistory: input.trainingHistory } : {}),
        volumeMultiplier: deload.volumeMultiplier * recovery.volumeScalarFromRecovery,
      });

      const dayTemplates = orderedDayTemplates(split, effectiveDays);
      const days: GeneratedWorkoutDay[] = [];

      for (let d = 0; d < dayTemplates.length; d++) {
        const day = await this.generateWorkoutDay({
          input,
          split,
          weekIndex: w,
          dayIndex: d,
          template: dayTemplates[d]!,
          weeklySetsByMuscle: weeklySets,
          frequencyByMuscle: frequency,
          selectionGoal: mapTrainingGoalToSelectionGoal(input.trainingGoal),
        });
        days.push(day);
        projectionForFatigue.push({ totalSystemicFatigue: day.systemicFatigueEstimate });
      }

      weeks.push({
        weekIndex: w,
        isDeload: deload.strategy !== 'none',
        deload,
        days,
      });
    }

    const fatigueReport = fatigueManagementSystem({
      experienceLevel: input.experienceLevel,
      ...(input.trainingHistory !== undefined ? { trainingHistory: input.trainingHistory } : {}),
      projectedSessions: projectionForFatigue.slice(0, effectiveDays),
    });

    dbgEngine('generateWorkoutPlan end', { weeks: weeks.length, split });
    return {
      version: 'schede_workout_gen_v1',
      split,
      trainingGoal: input.trainingGoal,
      experienceLevel: input.experienceLevel,
      progression,
      volumeLandmarksByMuscle: landmarks,
      weeklyTargetSetsByMuscle: baselineWeekly,
      frequencyByMuscle: frequency,
      fatigueReport,
      recoveryReport: recovery,
      weeks,
    };
  }

  async generateWorkoutDay(ctx: {
    readonly input: WorkoutGenerationInput;
    readonly split: SelectionInput['split'];
    readonly weekIndex: number;
    readonly dayIndex: number;
    readonly template: { readonly label: string; readonly focusMuscleGroups: readonly MuscleVolumeGroup[] };
    readonly weeklySetsByMuscle: Readonly<Record<MuscleVolumeGroup, number>>;
    readonly frequencyByMuscle: Readonly<Record<MuscleVolumeGroup, number>>;
    readonly selectionGoal: WorkoutGoal;
  }): Promise<GeneratedWorkoutDay> {
    const { input, split, weekIndex, dayIndex, template, weeklySetsByMuscle, frequencyByMuscle, selectionGoal } =
      ctx;
    const musclePriority = buildDayMusclePriority(weeklySetsByMuscle, template.focusMuscleGroups);

    const selectionInput: SelectionInput = {
      userProfile: mapUserProfile(input),
      workoutGoal: selectionGoal,
      split,
      sessionDurationMinutes: input.sessionDurationMinutes,
      availableEquipment: input.availableEquipment,
      injuries: input.injuries,
      experienceLevel: input.experienceLevel,
      preferredExercises: input.preferredExercises,
      excludedExercises: input.excludedExercises,
      weeklyVolumeTargets: { musclePriority },
      selectionEpoch: weekIndex * 100 + dayIndex,
    };

    const selection = await this.deps.exerciseSelection.selectWorkout(selectionInput);
    const exercises: PlannedExercise[] = selection.slots.map((slot: SelectedExerciseSlot, idx: number) => {
      const volGroup = muscleCodeToVolumeGroup(slot.exercise.primary_muscle);
      const weeklyForMuscle =
        weeklySetsByMuscle[volGroup] ??
        weeklySetsByMuscle[template.focusMuscleGroups[0]!] ??
        10;
      const freq = frequencyByMuscle[volGroup] ?? frequencyByMuscle[template.focusMuscleGroups[0]!] ?? 1;
      const sets = buildPlannedSets(
        input.trainingGoal,
        slot.exercise,
        slot.role,
        weeklyForMuscle,
        freq,
        idx,
        input.experienceLevel,
      );
      return {
        order: idx + 1,
        slug: slot.exercise.slug,
        name: slot.exercise.name,
        slotRole: slot.role,
        movementPattern: slot.exercise.movement_pattern,
        primaryMuscle: slot.exercise.primary_muscle,
        sets,
        progressionHint: progressionHintFor(slot.role, input.trainingGoal),
      };
    });

    return {
      dayIndex,
      weekIndex,
      label: template.label,
      focusMuscleGroups: template.focusMuscleGroups,
      exercises,
      systemicFatigueEstimate: selection.totalSystemicFatigue,
      selectionTrace: selection.trace,
    };
  }
}

function mapUserProfile(input: WorkoutGenerationInput): UserProfileSelection {
  return { userId: input.userProfile.userId };
}

function mapTrainingGoalToSelectionGoal(goal: TrainingGoal): WorkoutGoal {
  switch (goal) {
    case 'strength':
      return 'strength';
    case 'hypertrophy':
      return 'hypertrophy';
    case 'fat_loss':
      return 'fat_loss';
    case 'rehab':
      return 'rehab';
    case 'sport_performance':
      return 'sport_performance';
    default:
      return 'general';
  }
}

function buildDayMusclePriority(
  weekly: Readonly<Record<MuscleVolumeGroup, number>>,
  focus: readonly MuscleVolumeGroup[],
): Partial<Record<MuscleCode, number>> {
  const raw: Partial<Record<MuscleVolumeGroup, number>> = {};
  const max = Math.max(1, ...MUSCLE_VOLUME_GROUPS.map((g) => weekly[g] ?? 0));
  for (const g of focus) {
    const w = weekly[g] ?? 0;
    raw[g] = 1 + (w / max) * 2.5;
  }
  return mergeMusclePrioritiesForSelection(raw);
}

function progressionHintFor(
  role: 'primary' | 'complementary' | 'isolation',
  goal: TrainingGoal,
): string {
  if (goal === 'strength' && role === 'primary') return 'Add load when all reps crisp at RPE target.';
  if (goal === 'hypertrophy') return 'Progress reps in range before smallest load increase.';
  if (goal === 'fat_loss') return 'Maintain tension quality; do not grind to failure on compounds.';
  return 'Linear diary: load or reps weekly while technique stable.';
}
