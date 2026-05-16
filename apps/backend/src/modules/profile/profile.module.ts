import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../core/supabase/supabase.module';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { MeController } from './me.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [SupabaseModule],
  controllers: [MeController],
  providers: [ProfileService, SupabaseAuthGuard],
})
export class ProfileModule {}
