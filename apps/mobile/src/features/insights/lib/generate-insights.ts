import type { AnalyticsOverview } from '../../../lib/api/contracts';
import type { HistorySessionItem } from '../../../lib/api/mappers/workout-history';
import { computeHistorySummary } from '../../../lib/api/mappers/workout-history';
import { translate, type AppLanguage } from '../../../i18n';
import { translateExerciseName } from '../../../i18n/exercise-names';
import { translateMuscleName } from '../../../i18n/muscle-names';

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
  readonly language: AppLanguage;
}

const ACCENT = {
  fire: '#39FF88',
  trophy: '#F5B642',
  chart: '#20E3C2',
  bolt: '#9B5CFF',
  muscle: '#1EA7FF',
} as const;

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

function buildVolumeTrendInsight(
  series: AnalyticsOverview['weeklyVolumeSeries'],
  lang: AppLanguage,
): SmartInsight | null {
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
  const directionKey = pct > 0 ? 'insights.volumeUp' : 'insights.volumeDown';

  return {
    id: 'volume-trend',
    type: 'volume_trend',
    icon: pct > 0 ? '🔥' : '📉',
    title: translate(lang, 'insights.volumeTrend', { sign, pct: Math.abs(pct) }),
    compactTitle: translate(lang, 'insights.volumeTrendCompact', { sign, pct: Math.abs(pct) }),
    subtitle: translate(lang, 'insights.volumeTrendSub', {
      kg: Math.round(curr.volumeKg),
      direction: translate(lang, directionKey),
    }),
    accentColor: pct > 0 ? ACCENT.fire : ACCENT.chart,
  };
}

function buildPrInsight(
  records: AnalyticsOverview['personalRecords'],
  lang: AppLanguage,
): SmartInsight | null {
  if (records.length === 0) return null;
  const top = records[0]!;
  const name = translateExerciseName(top.exerciseSlug, lang, top.exerciseName);
  return {
    id: 'pr-records',
    type: 'pr',
    icon: '🏆',
    title:
      records.length === 1
        ? translate(lang, 'insights.prSingle', { name })
        : translate(lang, 'insights.prMultiple', { count: records.length }),
    compactTitle:
      records.length === 1
        ? translate(lang, 'insights.prCompactSingle')
        : translate(lang, 'insights.prCompactMultiple', { count: records.length }),
    subtitle:
      records.length === 1
        ? translate(lang, 'insights.prSubSingle')
        : translate(lang, 'insights.prSubMultiple', { name }),
    accentColor: ACCENT.trophy,
  };
}

function buildWeeklyWorkoutsInsight(count: number, lang: AppLanguage): SmartInsight | null {
  if (count <= 0) return null;
  return {
    id: 'weekly-workouts',
    type: 'weekly_workouts',
    icon: '📈',
    title:
      count === 1
        ? translate(lang, 'insights.weeklyOne')
        : translate(lang, 'insights.weeklyMany', { count }),
    compactTitle:
      count === 1
        ? translate(lang, 'insights.weeklyCompactOne')
        : translate(lang, 'insights.weeklyCompactMany', { count }),
    subtitle: translate(lang, count >= 3 ? 'insights.weeklySubSolid' : 'insights.weeklySubDefault'),
    accentColor: ACCENT.chart,
  };
}

function buildStreakInsight(days: number, lang: AppLanguage): SmartInsight | null {
  if (days <= 1) return null;
  return {
    id: 'streak',
    type: 'streak',
    icon: '⚡',
    title: translate(lang, 'insights.streak', { days }),
    compactTitle: translate(lang, 'insights.streakCompact', { days }),
    subtitle: translate(lang, days >= 7 ? 'insights.streakSubStrong' : 'insights.streakSubDefault'),
    accentColor: ACCENT.bolt,
  };
}

function buildTopMuscleInsight(
  distribution: AnalyticsOverview['muscleDistribution'],
  lang: AppLanguage,
): SmartInsight | null {
  if (distribution.length === 0) return null;
  const top = [...distribution].sort((a, b) => b.sets - a.sets)[0];
  if (!top || top.sets <= 0) return null;

  const label = translateMuscleName(top.muscleGroup, lang);
  return {
    id: `top-muscle-${top.muscleGroup}`,
    type: 'top_muscle',
    icon: '💪',
    title: translate(lang, 'insights.topMuscle', { muscle: label }),
    subtitle: translate(lang, 'insights.topMuscleSub', { count: top.sets }),
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
  const lang = ctx.language;
  if (!analytics) return [];

  const candidates: SmartInsight[] = [];

  const volumeTrend = buildVolumeTrendInsight(analytics.weeklyVolumeSeries, lang);
  if (volumeTrend) candidates.push(volumeTrend);

  const pr = buildPrInsight(analytics.personalRecords, lang);
  if (pr) candidates.push(pr);

  const streak = buildStreakInsight(resolveStreakDays(ctx), lang);
  if (streak) candidates.push(streak);

  const weekly = buildWeeklyWorkoutsInsight(resolveSessionsThisWeek(ctx), lang);
  if (weekly) candidates.push(weekly);

  const muscle = buildTopMuscleInsight(analytics.muscleDistribution, lang);
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
