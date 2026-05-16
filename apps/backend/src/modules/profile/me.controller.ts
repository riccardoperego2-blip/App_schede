import { Body, Controller, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../auth/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { UpdateMeDto } from './api/dto/update-me.dto';
import { ProfileService } from './profile.service';

@ApiTags('profile')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller({ path: 'me', version: '1' })
export class MeController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  async me(@CurrentUser() user: User) {
    return this.profile.getMe(user.id);
  }

  @Patch()
  async patch(@CurrentUser() user: User, @Body() dto: UpdateMeDto) {
    return this.profile.updateMe(user.id, dto).then(() => this.profile.getMe(user.id));
  }
}
