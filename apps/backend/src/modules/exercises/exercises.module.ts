import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../core/supabase/supabase.module';
import { SupabaseExerciseRepository } from './infrastructure/supabase-exercise.repository';

@Module({
  imports: [SupabaseModule],
  providers: [SupabaseExerciseRepository],
  exports: [SupabaseExerciseRepository],
})
export class ExercisesModule {}
