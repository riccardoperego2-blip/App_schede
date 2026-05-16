import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PgUnitOfWork } from '../../core/supabase/pg-unit-of-work';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(private readonly uow: PgUnitOfWork) {}

  @Get()
  get() {
    return { ok: true as const, uptimeSeconds: Math.floor(process.uptime()) };
  }

  /** DB reachability + exercise catalog row counts (no auth). */
  @Get('db')
  async db() {
    try {
      const counts = await this.uow.execute(async (tx) => {
        const exercises = await tx.query<{ c: number }>('select count(*)::int as c from public.exercises');
        const translations = await tx.query<{ c: number }>(
          'select count(*)::int as c from public.exercise_translations',
        );
        let exerciseMuscles = 0;
        try {
          const m = await tx.query<{ c: number }>('select count(*)::int as c from public.exercise_muscles');
          exerciseMuscles = m.rows[0]?.c ?? 0;
        } catch {
          exerciseMuscles = -1;
        }
        return {
          exercises: exercises.rows[0]?.c ?? 0,
          exerciseTranslations: translations.rows[0]?.c ?? 0,
          exerciseMuscles,
        };
      });
      return { ok: true as const, database: 'reachable', ...counts };
    } catch (err) {
      return {
        ok: false as const,
        database: 'unreachable',
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
