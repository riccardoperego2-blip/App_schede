import { ForbiddenException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ExerciseSelectionService, type InjuryConstraint } from '@schede/exercise-selection';
import { WorkoutGenerationEngine, type GeneratedWorkoutPlan, type GeneratedWorkoutWeek, type WorkoutGenerationInput } from '@schede/workout-generation';
import type { User } from '@supabase/supabase-js';
import { DomainEventBus } from '../../../core/events/domain-event-bus';
import { PgUnitOfWork } from '../../../core/supabase/pg-unit-of-work';
import { SupabaseExerciseRepository } from '../../exercises/infrastructure/supabase-exercise.repository';
import { GeneratePlanDto } from '../api/dto/generate-plan.dto';
import { PlanRepository } from '../infrastructure/plan.repository';

export interface GeneratePlanResult {
  readonly planId: string;
  readonly versionId: string;
  readonly plan: GeneratedWorkoutPlan;
}

const SAVE_TX_TIMEOUT_MS = 180_000;

@Injectable()
export class PlanGenerationService {
  private readonly log = new Logger(PlanGenerationService.name);

  constructor(
    private readonly uow: PgUnitOfWork,
    private readonly planRepository: PlanRepository,
    private readonly exerciseRepository: SupabaseExerciseRepository,
    private readonly events: DomainEventBus,
  ) {}

  async generate(user: User, dto: GeneratePlanDto): Promise<GeneratePlanResult> {
    const ownerUserId = dto.clientUserId ?? user.id;
    this.log.log(
      `[plans.generate] DTO ok owner=${ownerUserId} goal=${dto.trainingGoal} days=${dto.trainingDays} sessionMin=${dto.sessionDurationMinutes} recovery=${dto.recoveryCapacity}`,
    );

    if (dto.clientUserId && dto.clientUserId !== user.id) {
      await this.assertCoachCanWrite(user.id, dto.clientUserId);
    }

    this.log.log('[plans.generate] catalog load start');
    const catalog = await this.exerciseRepository.loadCatalog();
    this.log.log(`[plans.generate] catalog load end count=${catalog.length}`);
    if (catalog.length === 0) {
      throw new UnprocessableEntityException({
        error: 'EMPTY_EXERCISE_CATALOG',
        message: 'No exercises in database (public.exercises). Apply migrations/seeds before generating plans.',
      });
    }

    this.log.log('[plans.generate] generation start');
    const engine = new WorkoutGenerationEngine({
      exerciseSelection: new ExerciseSelectionService(this.exerciseRepository),
    });
    const input = toGenerationInput(ownerUserId, dto);
    const plan = await engine.generateWorkoutPlan(input);
    this.log.log(
      `[plans.generate] generation end split=${plan.split} weeks=${plan.weeks.length} days=${plan.weeks.reduce((n: number, w: GeneratedWorkoutWeek) => n + w.days.length, 0)}`,
    );

    this.log.log('[plans.generate] DB transaction start (save plan)');
    const { planId, versionId } = await this.uow.execute(
      async (tx) => {
        await this.planRepository.ensureProfile(tx, ownerUserId, profileHintsFromAuthUser(ownerUserId, user));
        const ids = await this.planRepository.saveGeneratedPlan(tx, ownerUserId, plan);
        await this.events.appendToOutbox(tx, {
          type: 'workout.plan.generated',
          aggregateId: ids.planId,
          userId: ownerUserId,
          payload: { split: plan.split, trainingGoal: plan.trainingGoal, weeks: plan.weeks.length },
          occurredAt: new Date().toISOString(),
        });
        return ids;
      },
      { statementTimeoutMs: SAVE_TX_TIMEOUT_MS },
    );
    this.log.log(`[plans.generate] DB transaction end planId=${planId} versionId=${versionId}`);

    this.events.publish({
      type: 'workout.plan.generated',
      aggregateId: planId,
      userId: ownerUserId,
      payload: { split: plan.split, trainingGoal: plan.trainingGoal, weeks: plan.weeks.length },
      occurredAt: new Date().toISOString(),
    });

    this.log.log('[plans.generate] response ready');
    return { planId, versionId, plan };
  }

  private async assertCoachCanWrite(coachUserId: string, clientUserId: string): Promise<void> {
    await this.uow.execute(async (tx) => {
      const result = await tx.query<{ allowed: boolean }>(
        `select public.is_coach_for_athlete($1::uuid, $2::uuid) as allowed`,
        [coachUserId, clientUserId],
      );
      if (!result.rows[0]?.allowed) throw new ForbiddenException('Coach is not active for client');
    });
  }
}

function profileHintsFromAuthUser(
  ownerUserId: string,
  authUser: User,
): { displayName: string | null; avatarUrl: string | null } {
  if (ownerUserId !== authUser.id) {
    return { displayName: null, avatarUrl: null };
  }
  const meta = authUser.user_metadata as Record<string, unknown> | undefined;
  const displayName =
    (typeof meta?.full_name === 'string' && meta.full_name) ||
    (typeof meta?.name === 'string' && meta.name) ||
    (authUser.email ? authUser.email.split('@')[0] ?? null : null);
  const avatarUrl = typeof meta?.avatar_url === 'string' ? meta.avatar_url : null;
  return { displayName, avatarUrl };
}

function toGenerationInput(userId: string, dto: GeneratePlanDto): WorkoutGenerationInput {
  const input: WorkoutGenerationInput = {
    userProfile: { userId },
    trainingGoal: dto.trainingGoal,
    experienceLevel: dto.experienceLevel,
    trainingDays: dto.trainingDays,
    sessionDurationMinutes: dto.sessionDurationMinutes,
    availableEquipment: new Set(dto.availableEquipment),
    injuries: (dto.injuries ?? []) as readonly InjuryConstraint[],
    recoveryCapacity: dto.recoveryCapacity,
    preferredExercises: new Set(dto.preferredExercises ?? []),
    excludedExercises: new Set(dto.excludedExercises ?? []),
    weakMuscleGroups: dto.weakMuscleGroups ?? [],
    priorityMuscleGroups: dto.priorityMuscleGroups ?? [],
  };
  return {
    ...input,
    ...(dto.trainingHistory ? { trainingHistory: dto.trainingHistory } : {}),
    ...(dto.mesocycleWeeks ? { mesocycleWeeks: dto.mesocycleWeeks } : {}),
  };
}
