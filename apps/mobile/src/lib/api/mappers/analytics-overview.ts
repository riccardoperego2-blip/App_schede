import type { AnalyticsOverview } from '../contracts';

function readField(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  }
  return undefined;
}

function parseNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseVolume(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = parseNumber(value, NaN);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** API contract: ratio 0..1. Legacy payloads may send 0..100. */
export function normalizeAdherencePct(value: unknown): number {
  const n = parseNumber(value, 0);
  if (!Number.isFinite(n)) return 0;
  if (n > 1) return Math.min(1, n / 100);
  return Math.min(1, Math.max(0, n));
}

export function formatAdherencePercent(adherencePct: number): string {
  return `${Math.round(normalizeAdherencePct(adherencePct) * 100)}%`;
}

export function mapAnalyticsOverview(raw: AnalyticsOverview | Record<string, unknown>): AnalyticsOverview {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const weeklyRaw = readField(o, 'weeklyVolumeSeries', 'weekly_volume_series');
  const weeklyVolumeSeries = Array.isArray(weeklyRaw)
    ? weeklyRaw.map((entry) => {
        const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
        return {
          weekStart: String(readField(row, 'weekStart', 'week_start') ?? ''),
          volumeKg: parseNumber(readField(row, 'volumeKg', 'volume_kg'), 0),
        };
      })
    : [];

  const muscleRaw = readField(o, 'muscleDistribution', 'muscle_distribution');
  const muscleDistribution = Array.isArray(muscleRaw)
    ? muscleRaw.map((entry) => {
        const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
        return {
          muscleGroup: String(readField(row, 'muscleGroup', 'muscle_group') ?? 'other'),
          sets: parseNumber(readField(row, 'sets'), 0),
        };
      })
    : [];

  const trendRaw = readField(o, 'readinessTrend', 'readiness_trend');
  const readinessTrend = Array.isArray(trendRaw)
    ? trendRaw.map((entry) => {
        const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
        const bandRaw = readField(row, 'band');
        const band: 'green' | 'yellow' | 'red' =
          bandRaw === 'yellow' || bandRaw === 'red' ? bandRaw : 'green';
        return {
          date: String(readField(row, 'date') ?? ''),
          score: parseNumber(readField(row, 'score'), 0),
          band,
        };
      })
    : [];

  const personalRecordsRaw = readField(o, 'personalRecords', 'personal_records');
  const personalRecords = Array.isArray(personalRecordsRaw)
    ? personalRecordsRaw.map((entry) => {
        const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
        return {
          exerciseSlug: String(readField(row, 'exerciseSlug', 'exercise_slug') ?? ''),
          exerciseName: String(readField(row, 'exerciseName', 'exercise_name') ?? ''),
          bestWeightKg: parseVolume(readField(row, 'bestWeightKg', 'best_weight_kg')),
          bestVolumeKg: parseVolume(readField(row, 'bestVolumeKg', 'best_volume_kg')),
          bestReps: parseVolume(readField(row, 'bestReps', 'best_reps')),
        };
      })
    : [];

  const topVolumeRaw = readField(o, 'topExercisesByVolume', 'top_exercises_by_volume');
  const topExercisesByVolume = Array.isArray(topVolumeRaw)
    ? topVolumeRaw.map((entry) => {
        const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
        return {
          exerciseSlug: String(readField(row, 'exerciseSlug', 'exercise_slug') ?? ''),
          exerciseName: String(readField(row, 'exerciseName', 'exercise_name') ?? ''),
          volumeKg: parseNumber(readField(row, 'volumeKg', 'volume_kg'), 0),
          sets: parseNumber(readField(row, 'sets'), 0),
          bestWeightKg: parseVolume(readField(row, 'bestWeightKg', 'best_weight_kg')),
          bestReps: parseVolume(readField(row, 'bestReps', 'best_reps')),
        };
      })
    : [];

  const mostTrainedRaw = readField(o, 'mostTrainedExercises', 'most_trained_exercises');
  const mostTrainedExercises = Array.isArray(mostTrainedRaw)
    ? mostTrainedRaw.map((entry) => {
        const row = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
        return {
          exerciseSlug: String(readField(row, 'exerciseSlug', 'exercise_slug') ?? ''),
          exerciseName: String(readField(row, 'exerciseName', 'exercise_name') ?? ''),
          sets: parseNumber(readField(row, 'sets'), 0),
          sessions: parseNumber(readField(row, 'sessions'), 0),
        };
      })
    : [];

  return {
    weeklyVolumeSeries,
    muscleDistribution,
    personalRecords,
    topExercisesByVolume,
    mostTrainedExercises,
    readinessTrend,
    adherencePct: normalizeAdherencePct(readField(o, 'adherencePct', 'adherence_pct')),
    completedSessions: parseNumber(readField(o, 'completedSessions', 'completed_sessions'), 0),
    totalSessions: parseNumber(readField(o, 'totalSessions', 'total_sessions'), 0),
    totalVolumeKg: parseVolume(readField(o, 'totalVolumeKg', 'total_volume_kg')),
    allTimeVolumeKg: parseVolume(readField(o, 'allTimeVolumeKg', 'all_time_volume_kg')),
    last4WeeksVolumeKg: parseVolume(readField(o, 'last4WeeksVolumeKg', 'last_4_weeks_volume_kg')),
    streakDays: parseNumber(readField(o, 'streakDays', 'streak_days'), 0),
    sessionsThisWeek: parseNumber(readField(o, 'sessionsThisWeek', 'sessions_this_week'), 0),
  };
}

export function formatAnalyticsVolume(volumeKg: number | null | undefined): string {
  if (volumeKg == null || !Number.isFinite(volumeKg) || volumeKg <= 0) return '—';
  return `${Math.round(volumeKg)} kg`;
}

export function formatWeekLabel(weekStart: string, locale = 'it-IT'): string {
  if (!weekStart) return '—';
  const d = new Date(weekStart.includes('T') ? weekStart : `${weekStart}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return weekStart;
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
