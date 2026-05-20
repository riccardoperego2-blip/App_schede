import type { HistoryListResponse } from '../contracts';

export interface HistorySessionItem {
  readonly sessionId: string;
  readonly completedAt: string | null;
  readonly durationMinutes: number;
  readonly dayLabel: string;
  readonly exerciseCount: number;
  readonly volumeKg: number | null;
  readonly prCount: number;
  readonly readiness: 'green' | 'yellow' | 'red';
}

export interface MappedHistoryListResponse {
  readonly items: HistorySessionItem[];
  readonly nextCursor: string | null;
}

function readField(raw: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (raw[key] !== undefined && raw[key] !== null) return raw[key];
  }
  return undefined;
}

/** Normalizes API timestamps (ISO, Postgres text, epoch ms) for RN date parsing. */
export function parseHistoryTimestamp(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (candidate.includes(' ') && !candidate.includes('T')) {
    candidate = candidate.replace(' ', 'T');
  }
  if (/[+-]\d{2}$/.test(candidate)) {
    candidate = `${candidate}:00`;
  }

  const d = new Date(candidate);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function parseVolumeKg(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseReadiness(value: unknown): 'green' | 'yellow' | 'red' {
  if (value === 'yellow' || value === 'red') return value;
  return 'green';
}

export function mapHistoryItem(raw: unknown): HistorySessionItem {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const completedAt = parseHistoryTimestamp(
    readField(o, 'completedAt', 'completed_at', 'endedAt', 'ended_at', 'startedAt', 'started_at'),
  );
  const volumeKg = parseVolumeKg(readField(o, 'volumeKg', 'volume_kg', 'totalVolumeKg', 'total_volume_kg'));

  return {
    sessionId: String(readField(o, 'sessionId', 'session_id') ?? ''),
    completedAt,
    durationMinutes: Number(readField(o, 'durationMinutes', 'duration_minutes') ?? 0) || 0,
    dayLabel: String(readField(o, 'dayLabel', 'day_label') ?? 'Workout'),
    exerciseCount: Number(readField(o, 'exerciseCount', 'exercise_count') ?? 0) || 0,
    volumeKg,
    prCount: Number(readField(o, 'prCount', 'pr_count') ?? 0) || 0,
    readiness: parseReadiness(readField(o, 'readiness')),
  };
}

export function mapHistoryResponse(raw: HistoryListResponse | Record<string, unknown>): MappedHistoryListResponse {
  const root = raw as Record<string, unknown>;
  const itemsRaw = Array.isArray(root.items) ? root.items : [];
  const nextCursor =
    typeof root.nextCursor === 'string'
      ? root.nextCursor
      : typeof root.next_cursor === 'string'
        ? root.next_cursor
        : null;

  return {
    items: itemsRaw.map(mapHistoryItem),
    nextCursor,
  };
}

export function formatHistoryDate(iso: string | null, locale = 'it-IT'): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatHistoryVolume(volumeKg: number | null | undefined): string {
  if (volumeKg == null || !Number.isFinite(volumeKg) || volumeKg <= 0) return '—';
  return `${Math.round(volumeKg)} kg`;
}

export function formatHistoryDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export interface HistorySummaryStats {
  readonly workoutCount: number;
  readonly totalVolumeKg: number;
  readonly lastSessionLabel: string | null;
  readonly streakDays: number | null;
}

function dayKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayKeyFromIso(iso: string): string | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return dayKeyFromDate(d);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatRelativeSessionDate(
  iso: string | null,
  t: (key: string, params?: Record<string, string | number>) => string,
  locale = 'it-IT',
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const diffDays = Math.floor(
    (startOfLocalDay(new Date()).getTime() - startOfLocalDay(d).getTime()) / 86_400_000,
  );
  if (diffDays === 0) return t('history.relativeToday');
  if (diffDays === 1) return t('history.relativeYesterday');
  if (diffDays > 1 && diffDays < 7) return t('history.relativeDaysAgo', { count: diffDays });
  return formatHistoryDate(iso, locale);
}

function computeStreakDays(items: HistorySessionItem[]): number | null {
  const days = new Set<string>();
  for (const item of items) {
    const key = item.completedAt ? dayKeyFromIso(item.completedAt) : null;
    if (key) days.add(key);
  }
  if (days.size === 0) return null;

  const todayKey = dayKeyFromIso(new Date().toISOString());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dayKeyFromIso(yesterday.toISOString());

  let cursor: Date | null = null;
  if (todayKey && days.has(todayKey)) {
    cursor = startOfLocalDay(new Date());
  } else if (yesterdayKey && days.has(yesterdayKey)) {
    cursor = startOfLocalDay(yesterday);
  } else {
    const sorted = [...days].sort().reverse();
    const latest = sorted[0];
    if (!latest) return null;
    cursor = new Date(`${latest}T12:00:00`);
  }

  let streak = 0;
  const probe = new Date(cursor);
  while (true) {
    const key = dayKeyFromIso(probe.toISOString());
    if (!key || !days.has(key)) break;
    streak += 1;
    probe.setDate(probe.getDate() - 1);
  }
  return streak > 0 ? streak : null;
}

export function computeHistorySummary(
  items: HistorySessionItem[],
  t?: (key: string, params?: Record<string, string | number>) => string,
  locale = 'it-IT',
): HistorySummaryStats {
  const workoutCount = items.length;
  const totalVolumeKg = items.reduce((sum, item) => sum + (item.volumeKg ?? 0), 0);
  const latest = [...items]
    .filter((item) => item.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

  const lastSessionLabel = latest?.completedAt
    ? t
      ? formatRelativeSessionDate(latest.completedAt, t, locale)
      : formatHistoryDate(latest.completedAt, locale)
    : null;

  return {
    workoutCount,
    totalVolumeKg,
    lastSessionLabel,
    streakDays: computeStreakDays(items),
  };
}
