import { Injectable, NotFoundException } from '@nestjs/common';
import { PgUnitOfWork } from '../../core/supabase/pg-unit-of-work';
import type { UpdateMeDto } from './api/dto/update-me.dto';

export interface MeProfileResponse {
  readonly id: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly trainingGoal: 'strength' | 'hypertrophy' | 'fat_loss' | 'general' | 'rehab';
  readonly experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  readonly trainingDaysPerWeek: number;
  readonly sessionDurationMin: number;
  readonly availableEquipment: string[];
}

interface StoredTrainingPrefs {
  trainingGoal?: MeProfileResponse['trainingGoal'];
  sessionDurationMin?: number;
  availableEquipment?: string[];
}

const DEFAULT_PREFS: Omit<MeProfileResponse, 'id' | 'displayName' | 'avatarUrl'> = {
  trainingGoal: 'hypertrophy',
  experienceLevel: 'beginner',
  trainingDaysPerWeek: 3,
  sessionDurationMin: 60,
  availableEquipment: ['barbell', 'dumbbell', 'machine', 'cable'],
};

@Injectable()
export class ProfileService {
  constructor(private readonly uow: PgUnitOfWork) {}

  async getMe(userId: string): Promise<MeProfileResponse> {
    return this.uow.execute(async (tx) => {
      const r = await tx.query<{
        id: string;
        display_name: string | null;
        avatar_url: string | null;
        training_experience: string | null;
        weekly_availability_days: number | null;
        injuries_notes: string | null;
      }>(
        `select p.id, p.display_name, p.avatar_url,
                ap.training_experience, ap.weekly_availability_days, ap.injuries_notes
           from public.profiles p
           left join public.athlete_profiles ap on ap.user_id = p.id
          where p.id = $1 and p.deleted_at is null`,
        [userId],
      );
      const row = r.rows[0];
      if (!row) throw new NotFoundException('Profile not found');

      const stored = parseStoredPrefs(row.injuries_notes);
      const experienceLevel = isExperience(row.training_experience)
        ? row.training_experience
        : DEFAULT_PREFS.experienceLevel;

      return {
        id: row.id,
        displayName: row.display_name ?? '',
        avatarUrl: row.avatar_url,
        trainingGoal: stored.trainingGoal ?? DEFAULT_PREFS.trainingGoal,
        experienceLevel,
        trainingDaysPerWeek: row.weekly_availability_days ?? DEFAULT_PREFS.trainingDaysPerWeek,
        sessionDurationMin: stored.sessionDurationMin ?? DEFAULT_PREFS.sessionDurationMin,
        availableEquipment:
          stored.availableEquipment?.length ? stored.availableEquipment : DEFAULT_PREFS.availableEquipment,
      };
    });
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<void> {
    await this.uow.execute(async (tx) => {
      const sets: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      if (dto.displayName !== undefined) {
        sets.push(`display_name = $${i++}`);
        params.push(dto.displayName);
      }
      if (dto.avatarUrl !== undefined) {
        sets.push(`avatar_url = $${i++}`);
        params.push(dto.avatarUrl === '' ? null : dto.avatarUrl);
      }
      if (sets.length > 0) {
        params.push(userId);
        const result = await tx.query(
          `update public.profiles set ${sets.join(', ')}, updated_at = timezone('utc', now()) where id = $${i} and deleted_at is null`,
          params,
        );
        if (result.rowCount === 0) throw new NotFoundException('Profile not found');
      }

      const hasAthletePatch =
        dto.trainingGoal !== undefined ||
        dto.experienceLevel !== undefined ||
        dto.trainingDaysPerWeek !== undefined ||
        dto.sessionDurationMin !== undefined ||
        dto.availableEquipment !== undefined;

      if (!hasAthletePatch) return;

      const ap = await tx.query<{
        training_experience: string | null;
        weekly_availability_days: number | null;
        injuries_notes: string | null;
      }>(
        `select training_experience, weekly_availability_days, injuries_notes
           from public.athlete_profiles
          where user_id = $1`,
        [userId],
      );
      const apRow = ap.rows[0];
      const storedPrefs = parseStoredPrefs(apRow?.injuries_notes ?? null);
      const experienceLevel = isExperience(apRow?.training_experience ?? null)
        ? apRow!.training_experience
        : DEFAULT_PREFS.experienceLevel;

      const mergedPrefs = serializeStoredPrefs({
        trainingGoal: dto.trainingGoal ?? storedPrefs.trainingGoal ?? DEFAULT_PREFS.trainingGoal,
        sessionDurationMin:
          dto.sessionDurationMin ?? storedPrefs.sessionDurationMin ?? DEFAULT_PREFS.sessionDurationMin,
        availableEquipment:
          dto.availableEquipment ??
          storedPrefs.availableEquipment ??
          DEFAULT_PREFS.availableEquipment,
      });

      await tx.query(
        `insert into public.athlete_profiles
          (user_id, training_experience, weekly_availability_days, injuries_notes)
         values ($1, $2, $3, $4)
         on conflict (user_id) do update set
           training_experience = excluded.training_experience,
           weekly_availability_days = excluded.weekly_availability_days,
           injuries_notes = excluded.injuries_notes,
           updated_at = timezone('utc', now())`,
        [
          userId,
          dto.experienceLevel ?? experienceLevel,
          dto.trainingDaysPerWeek ?? apRow?.weekly_availability_days ?? DEFAULT_PREFS.trainingDaysPerWeek,
          mergedPrefs,
        ],
      );
    });
  }
}

function parseStoredPrefs(notes: string | null): StoredTrainingPrefs {
  if (!notes?.trim()) return {};
  try {
    const parsed = JSON.parse(notes) as StoredTrainingPrefs;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function serializeStoredPrefs(prefs: StoredTrainingPrefs): string {
  return JSON.stringify(prefs);
}

function isExperience(value: string | null): value is MeProfileResponse['experienceLevel'] {
  return value === 'beginner' || value === 'intermediate' || value === 'advanced' || value === 'elite';
}
