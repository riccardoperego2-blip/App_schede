import { Module } from '@nestjs/common';
import { PgUnitOfWork } from './pg-unit-of-work';
import { SupabaseService } from './supabase.service';

@Module({
  providers: [SupabaseService, PgUnitOfWork],
  exports: [SupabaseService, PgUnitOfWork],
})
export class SupabaseModule {}
