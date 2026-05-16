import { Body, Controller, Get, HttpCode, Logger, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { PgUnitOfWork } from '../../../core/supabase/pg-unit-of-work';
import { CurrentUser } from '../../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { PlanGenerationService } from '../application/plan-generation.service';
import { PlanRepository } from '../infrastructure/plan.repository';
import { GeneratePlanDto } from './dto/generate-plan.dto';

@ApiTags('plans')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller({ path: 'plans', version: '1' })
export class PlansController {
  private readonly log = new Logger(PlansController.name);

  constructor(
    private readonly planGeneration: PlanGenerationService,
    private readonly uow: PgUnitOfWork,
    private readonly planRepository: PlanRepository,
  ) {}

  @Get('active')
  async active(@CurrentUser() user: User) {
    return this.uow.execute(async (tx) => {
      const row = await this.planRepository.findActivePlanForUser(tx, user.id);
      if (!row) throw new NotFoundException('No active plan');
      return row;
    });
  }

  @Get('active/full')
  async activeFull(@CurrentUser() user: User) {
    return this.uow.execute(async (tx) => {
      const full = await this.planRepository.loadActivePlanFull(tx, user.id);
      if (!full) throw new NotFoundException('No active plan');
      return full;
    });
  }

  @Post('generate')
  @HttpCode(202)
  async generate(@CurrentUser() user: User, @Body() dto: GeneratePlanDto) {
    this.log.log(`[PlansController] request received POST /v1/plans/generate authUserId=${user.id}`);
    try {
      const result = await this.planGeneration.generate(user, dto);
      this.log.log(`[PlansController] response sent planId=${result.planId} versionId=${result.versionId}`);
      return {
        planId: result.planId,
        versionId: result.versionId,
        split: result.plan.split,
        weeks: result.plan.weeks.length,
        status: 'generated',
      };
    } catch (err) {
      this.log.error(`[PlansController] POST /v1/plans/generate error: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }
}
