import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CompleteWorkoutDto } from './dto/complete-workout.dto';
import { WorkoutExecutionService } from '../application/workout-execution.service';
import { WorkoutQueryService } from '../application/workout-query.service';

@ApiTags('workouts')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller({ path: 'workouts', version: '1' })
export class WorkoutsController {
  constructor(
    private readonly execution: WorkoutExecutionService,
    private readonly queries: WorkoutQueryService,
  ) {}

  @Get('today')
  async today(@CurrentUser() user: User) {
    return this.queries.today(user.id);
  }

  @Get('day/:workoutDayId')
  async byDay(@CurrentUser() user: User, @Param('workoutDayId') workoutDayId: string) {
    return this.queries.byDay(user.id, workoutDayId);
  }

  @Get('history')
  async history(@CurrentUser() user: User, @Query('cursor') cursor?: string) {
    return this.queries.history(user.id, cursor);
  }

  @Post('complete')
  @HttpCode(202)
  async complete(@CurrentUser() user: User, @Body() dto: CompleteWorkoutDto) {
    const result = await this.execution.complete(user, dto);
    return {
      sessionId: result.sessionId,
      readiness: result.adaptation.readiness,
      deload: result.adaptation.deload,
      personalRecords: result.adaptation.personalRecords,
      nextWorkoutPatch: result.adaptation.nextWorkoutPatch,
    };
  }
}
