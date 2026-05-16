import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../core/supabase/supabase.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [SupabaseModule],
  providers: [NotificationsService],
})
export class NotificationsModule {}
