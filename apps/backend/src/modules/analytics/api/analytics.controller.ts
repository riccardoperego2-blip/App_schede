import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { IngestEventsDto, type IngestEventsResponse } from './dto/ingest-events.dto';
import { AnalyticsIngestionService } from '../application/analytics-ingestion.service';
import { AnalyticsOverviewService } from '../application/analytics-overview.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller({ path: 'analytics', version: '1' })
export class AnalyticsController {
  constructor(
    private readonly ingestion: AnalyticsIngestionService,
    private readonly overviewService: AnalyticsOverviewService,
  ) {}

  @Get('overview')
  overview(@CurrentUser() user: User, @Query('range') range: string = '4w') {
    return this.overviewService.overview(user.id, range);
  }

  /**
   * Append-only ingestion endpoint. Heavy throttling protects us against
   * a chatty client without backpressure. The endpoint is idempotent on
   * `event_id`, so retries collapse server-side.
   */
  @Post('events')
  @HttpCode(202)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async ingest(
    @CurrentUser() user: User,
    @Body() dto: IngestEventsDto,
  ): Promise<IngestEventsResponse> {
    return this.ingestion.ingest(user.id, dto.events);
  }
}
