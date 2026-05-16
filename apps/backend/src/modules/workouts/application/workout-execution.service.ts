import { Injectable } from '@nestjs/common';
import { WorkoutExecutionEngine, type ExecutionAdaptationResult, type ExerciseLog, type WorkoutExecutionInput } from '@schede/workout-execution';
import type { User } from '@supabase/supabase-js';
import { DomainEventBus } from '../../../core/events/domain-event-bus';
import { type DbExecutor, PgUnitOfWork } from '../../../core/supabase/pg-unit-of-work';
import { CompleteWorkoutDto, type ExerciseLogDto } from '../api/dto/complete-workout.dto';
import { WorkoutRepository } from '../infrastructure/workout.repository';

export interface CompleteWorkoutResult {
  readonly sessionId: string;
  readonly adaptation: ExecutionAdaptationResult;
}

@Injectable()
export class WorkoutExecutionService {
  private readonly engine = new WorkoutExecutionEngine();

  constructor(
    private readonly uow: PgUnitOfWork,
    private readonly workoutRepository: WorkoutRepository,
    private readonly events: DomainEventBus,
  ) {}

  async complete(user: User, dto: CompleteWorkoutDto): Promise<CompleteWorkoutResult> {
    const result = await this.uow.execute(async (tx) => {
      const plannedWorkout = await this.workoutRepository.loadPlannedWorkout(tx, dto.workoutDayId);
      const history = await this.workoutRepository.loadWorkoutHistory(tx, user.id);
      const completedWorkout = {
        workoutId: dto.workoutDayId,
        completedAt: dto.completedAt,
        durationMinutes: dto.durationMinutes,
        completedExerciseSlugs: dto.exerciseLogs.map((l) => l.exerciseSlug),
        ...(dto.sessionRpe != null ? { sessionRpe: dto.sessionRpe } : {}),
      };
      const sessionId = await this.workoutRepository.saveCompletedWorkout(
        tx,
        user.id,
        dto.workoutDayId,
        completedWorkout,
        mapExerciseLogs(dto.exerciseLogs),
      );

      const input: WorkoutExecutionInput = {
        plannedWorkout,
        completedWorkout,
        exerciseLogs: mapExerciseLogs(dto.exerciseLogs),
        userRecoveryMetrics: dto.userRecoveryMetrics ?? {},
        bodyWeightTrend: dto.bodyWeightTrend ?? { direction: 'flat', weeklyChangePct: 0 },
        sleepQuality: dto.sleepQuality,
        soreness: dto.soreness,
        fatigueLevel: dto.fatigueLevel,
        adherenceScore: dto.adherenceScore,
        workoutHistory: history,
        trainingGoal: dto.trainingGoal,
        experienceLevel: dto.experienceLevel,
        progressionModel: dto.progressionModel,
      };

      const adaptation = this.engine.processCompletedWorkout(input);
      await this.persistPrs(tx, user.id, sessionId, adaptation);
      await this.events.appendToOutbox(tx, {
        type: 'workout.completed',
        aggregateId: sessionId,
        userId: user.id,
        payload: {
          readiness: adaptation.readiness.band,
          deload: adaptation.deload.shouldDeload,
          prs: adaptation.personalRecords.length,
        },
        occurredAt: new Date().toISOString(),
      });

      return { sessionId, adaptation };
    });
    this.events.publish({
      type: 'workout.completed',
      aggregateId: result.sessionId,
      userId: user.id,
      payload: {
        readiness: result.adaptation.readiness.band,
        deload: result.adaptation.deload.shouldDeload,
        prs: result.adaptation.personalRecords.length,
      },
      occurredAt: new Date().toISOString(),
    });
    return result;
  }

  private async persistPrs(
    tx: DbExecutor,
    userId: string,
    sessionId: string,
    adaptation: ExecutionAdaptationResult,
  ): Promise<void> {
    for (const pr of adaptation.personalRecords) {
      const exercise = await tx.query<{ id: string }>('select id from public.exercises where slug = $1', [
        pr.exerciseSlug,
      ]);
      if (!exercise.rows[0]) continue;
      await tx.query(
        `insert into public.personal_records
          (user_id, exercise_id, record_type, value_primary, unit_primary, achieved_at, session_id, is_estimated, metadata)
         values ($1, $2, $3, $4, $5, timezone('utc', now()), $6, $7, $8::jsonb)`,
        [
          userId,
          exercise.rows[0].id,
          pr.type === 'estimated_1rm' ? 'estimated_1rm' : pr.type === 'session_volume' ? 'max_volume_session' : 'max_weight_single',
          pr.value,
          pr.unit === 'kg_volume' ? 'kg' : pr.unit,
          sessionId,
          pr.type === 'estimated_1rm',
          JSON.stringify({ previousValue: pr.previousValue, source: 'workout-execution-engine' }),
        ],
      );
    }
  }
}

function mapExerciseLogs(logs: readonly ExerciseLogDto[]): readonly ExerciseLog[] {
  return logs.map((l) => ({
    exerciseSlug: l.exerciseSlug,
    ...(l.primaryMuscle !== undefined
      ? { primaryMuscle: l.primaryMuscle as ExerciseLog['primaryMuscle'] }
      : {}),
    sets: l.sets,
    ...(l.notes !== undefined ? { notes: l.notes } : {}),
  }));
}
