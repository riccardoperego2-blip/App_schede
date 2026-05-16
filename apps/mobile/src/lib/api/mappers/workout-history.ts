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

export function formatHistoryDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleDateString('it-IT', {
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
