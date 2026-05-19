import type { AnalyticsOverview } from '../../../lib/api/contracts';
import type { HistorySessionItem } from '../../../lib/api/mappers/workout-history';
import { computeHistorySummary } from '../../../lib/api/mappers/workout-history';

export type InsightType =
  | 'pr'
  | 'weekly_workouts'
  | 'streak'
  | 'top_muscle'
  | 'volume_trend';

export interface SmartInsight {
  readonly id: string;
  readonly type: InsightType;
  readonly title: string;
  readonly subtitle?: string;
  readonly compactTitle?: string;
  readonly accentColor?: string;
  readonly icon?: string;
}

export interface InsightsContext {
  readonly analytics?: AnalyticsOverview | null;
  readonly historyItems?: readonly HistorySessionItem[];
}

const ACCENT = {
  fire: '#39FF88',
  trophy: '#F5B642',
  chart: '#20E3C2',
  bolt: '#9B5CFF',
  muscle: '#1EA7FF',
} as const;

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Petto',
  back: 'Schiena',
  legs: 'Gambe',
  shoulders: 'Spalle',
  arms: 'Braccia',
  biceps: 'Bicipiti',
  triceps: 'Tricipiti',
  core: 'Core',
  abs: 'Addominali',
  glutes: 'Glutei',
  calves: 'Polpacci',
  hamstrings: 'Femorali',
  quads: 'Quadricipiti',
  lats: 'Dorsali',
  traps: 'Trapezi',
  other: 'Altro',
};

function formatMuscleLabel(slug: string): string {
  const key = slug.toLowerCase().trim();
  if (MUSCLE_LABELS[key]) return MUSCLE_LABELS[key];
  return key
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function startOfLocalWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function countSessionsThisWeek(items: readonly HistorySessionItem[]): number {
  const weekStart = startOfLocalWeek(new Date()).getTime();
  let count = 0;
  for (const item of items) {
    if (!item.completedAt) continue;
    const t = new Date(item.completedAt).getTime();
    if (Number.isFinite(t) && t >= weekStart) count += 1;
  }
  return count;
}

function resolveSessionsThisWeek(ctx: InsightsContext): number {
  const fromApi = ctx.analytics?.sessionsThisWeek ?? 0;
  if (fromApi > 0) return fromApi;
  return countSessionsThisWeek(ctx.historyItems ?? []);
}

function resolveStreakDays(ctx: InsightsContext): number {
  const fromApi = ctx.analytics?.streakDays ?? 0;
  if (fromApi > 1) return fromApi;
  const fromHistory = computeHistorySummary([...(ctx.historyItems ?? [])]).streakDays;
  return Math.max(fromApi, fromHistory ?? 0);
}

function buildVolumeTrendInsight(series: AnalyticsOverview['weeklyVolumeSeries']): SmartInsight | null {
  const sorted = [...series]
    .filter((w) => w.weekStart)
    .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());
  if (sorted.length < 2) return null;

  const prev = sorted[sorted.length - 2]!;
  const curr = sorted[sorted.length - 1]!;
  if (curr.volumeKg <= 0 && prev.volumeKg <= 0) return null;

  let pct: number;
  if (prev.volumeKg <= 0) {
    pct = 100;
  } else {
    pct = Math.round(((curr.volumeKg - prev.volumeKg) / prev.volumeKg) * 100);
  }
  if (pct === 0) return null;

  const sign = pct > 0 ? '+' : '';
  const direction = pct > 0 ? 'in crescita' : 'in calo';

  return {
    id: 'volume-trend',
    type: 'volume_trend',
    icon: pct > 0 ? '🔥' : '📉',
    title: `Volume ${sign}${pct}% vs settimana scorsa`,
    compactTitle: `Volume ${sign}${pct}%`,
    subtitle: `${Math.round(curr.volumeKg)} kg questa settimana · ${direction}`,
    accentColor: pct > 0 ? ACCENT.fire : ACCENT.chart,
  };
}

function buildPrInsight(records: AnalyticsOverview['personalRecords']): SmartInsight | null {
  if (records.length === 0) return null;
  const top = records[0]!;
  const name = top.exerciseName || top.exerciseSlug.replace(/-/g, ' ');
  return {
    id: 'pr-records',
    type: 'pr',
    icon: '🏆',
    title:
      records.length === 1
        ? `PR su ${name}`
        : `${records.length} PR nel periodo`,
    compactTitle: records.length === 1 ? 'Nuovo PR' : `${records.length} PR`,
    subtitle:
      records.length === 1
        ? 'Record personale registrato'
        : `In evidenza: ${name}`,
    accentColor: ACCENT.trophy,
  };
}

function buildWeeklyWorkoutsInsight(count: number): SmartInsight | null {
  if (count <= 0) return null;
  return {
    id: 'weekly-workouts',
    type: 'weekly_workouts',
    icon: '📈',
    title:
      count === 1
        ? '1 workout completato questa settimana'
        : `${count} workout completati questa settimana`,
    compactTitle: count === 1 ? '1 workout sett.' : `${count} workout sett.`,
    subtitle: count >= 3 ? 'Ritmo solido, continua così.' : 'Ogni sessione conta.',
    accentColor: ACCENT.chart,
  };
}

function buildStreakInsight(days: number): SmartInsight | null {
  if (days <= 1) return null;
  return {
    id: 'streak',
    type: 'streak',
    icon: '⚡',
    title: `Streak attiva da ${days} giorni`,
    compactTitle: `Streak ${days} giorni`,
    subtitle: days >= 7 ? 'Consistenza sopra la media.' : 'Mantieni il ritmo quotidiano.',
    accentColor: ACCENT.bolt,
  };
}

function buildTopMuscleInsight(distribution: AnalyticsOverview['muscleDistribution']): SmartInsight | null {
  if (distribution.length === 0) return null;
  const top = [...distribution].sort((a, b) => b.sets - a.sets)[0];
  if (!top || top.sets <= 0) return null;

  const label = formatMuscleLabel(top.muscleGroup);
  return {
    id: `top-muscle-${top.muscleGroup}`,
    type: 'top_muscle',
    icon: '💪',
    title: `${label}: gruppo più allenato`,
    subtitle: `${top.sets} ${top.sets === 1 ? 'serie' : 'serie'} nel periodo`,
    accentColor: ACCENT.muscle,
  };
}

const PRIORITY: Record<InsightType, number> = {
  volume_trend: 0,
  pr: 1,
  streak: 2,
  weekly_workouts: 3,
  top_muscle: 4,
};

const MAX_INSIGHTS = 5;

export function generateInsights(ctx: InsightsContext): SmartInsight[] {
  const analytics = ctx.analytics;
  if (!analytics) return [];

  const candidates: SmartInsight[] = [];

  const volumeTrend = buildVolumeTrendInsight(analytics.weeklyVolumeSeries);
  if (volumeTrend) candidates.push(volumeTrend);

  const pr = buildPrInsight(analytics.personalRecords);
  if (pr) candidates.push(pr);

  const streak = buildStreakInsight(resolveStreakDays(ctx));
  if (streak) candidates.push(streak);

  const weekly = buildWeeklyWorkoutsInsight(resolveSessionsThisWeek(ctx));
  if (weekly) candidates.push(weekly);

  const muscle = buildTopMuscleInsight(analytics.muscleDistribution);
  if (muscle) candidates.push(muscle);

  return candidates
    .sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type])
    .slice(0, MAX_INSIGHTS);
}

const COMPACT_PRIORITY: InsightType[] = ['pr', 'streak', 'volume_trend', 'weekly_workouts'];
const COMPACT_LIMIT = 2;

export function pickCompactInsights(insights: readonly SmartInsight[], limit = COMPACT_LIMIT): SmartInsight[] {
  const byType = new Map(insights.map((insight) => [insight.type, insight]));
  const picked: SmartInsight[] = [];

  for (const type of COMPACT_PRIORITY) {
    const insight = byType.get(type);
    if (!insight) continue;
    picked.push({
      ...insight,
      title: insight.compactTitle ?? insight.title,
      subtitle: undefined,
    });
    if (picked.length >= limit) break;
  }

  return picked;
}
