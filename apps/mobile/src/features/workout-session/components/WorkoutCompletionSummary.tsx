import { View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import {
  FadeInSection,
  PremiumButton,
  PremiumCard,
  StatPill,
  Text,
  AnimatedProgressBar,
} from '../../../design-system';
import type { CompleteWorkoutResponse } from '../../../lib/api/contracts';
import { useI18n } from '../../../i18n/use-i18n';

export interface WorkoutCompletionStats {
  readonly durationMinutes: number;
  readonly volumeKg: number;
  readonly completedSets: number;
  readonly plannedSets: number;
  readonly completedExercises: number;
  readonly totalExercises: number;
  readonly adherencePct: number;
  readonly dayLabel?: string;
  readonly queued: boolean;
  readonly personalRecords: CompleteWorkoutResponse['adaptation']['personalRecords'];
}

interface WorkoutCompletionSummaryProps {
  stats: WorkoutCompletionStats;
}

function formatDuration(
  minutes: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (minutes < 1) return t('workout.durationUnderMin');
  if (minutes < 60) return t('workout.durationMin', { min: minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function prTypeLabel(
  type: WorkoutCompletionStats['personalRecords'][number]['type'],
  t: (key: string) => string,
): string {
  if (type === 'estimated_1rm') return t('completion.prEst1rm');
  if (type === 'max_weight_single') return t('completion.prMaxWeight');
  return t('completion.prSessionVolume');
}

export function WorkoutCompletionSummary({ stats }: WorkoutCompletionSummaryProps) {
  const router = useRouter();
  const { t, te } = useI18n();
  const adherencePct = Math.round(stats.adherencePct * 100);
  const prCount = stats.personalRecords.length;
  const volumeLabel = stats.volumeKg > 0 ? `${Math.round(stats.volumeKg)} kg` : t('common.emDash');

  return (
    <View className="gap-5">
      <FadeInSection delay={0}>
        <PremiumCard variant="ambient" className="items-center gap-4 p-6">
          <View className="h-16 w-16 items-center justify-center rounded-full border border-border-soft bg-bg-surface">
            <Text variant="display" className="text-3xl leading-9">
              {prCount > 0 ? '🏆' : '🔥'}
            </Text>
          </View>
          <View className="items-center gap-1">
            <Text variant="tiny" tone="accent" className="tracking-widest">
              {t('completion.sessionClosed')}
            </Text>
            <Text variant="display" className="text-center">
              {prCount > 0 ? t('completion.greatJob') : t('completion.workoutDone')}
            </Text>
            <Text tone="secondary" variant="caption" className="text-center">
              {stats.queued ? t('completion.queued') : t('completion.message')}
            </Text>
          </View>
        </PremiumCard>
      </FadeInSection>

      <FadeInSection delay={60}>
        <PremiumCard variant="glass" className="gap-4 p-4">
          <Text variant="subtitle" className="font-semibold">
            {t('completion.summary')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            <StatPill label={t('stat.duration')} value={formatDuration(stats.durationMinutes, t)} active />
            <StatPill label={t('stat.volume')} value={volumeLabel} active={stats.volumeKg > 0} />
            <StatPill
              label={t('stat.sets')}
              value={`${stats.completedSets}/${stats.plannedSets || t('common.emDash')}`}
              active={stats.completedSets > 0}
            />
            <StatPill
              label={t('stat.exercises')}
              value={`${stats.completedExercises}/${stats.totalExercises || t('common.emDash')}`}
            />
            {prCount > 0 ? <StatPill label={t('common.pr')} value={prCount} active /> : null}
          </View>
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="caption" tone="muted">
                {t('completion.adherence')}
              </Text>
              <Text variant="caption" tone="secondary">
                {adherencePct}%
              </Text>
            </View>
            <AnimatedProgressBar value={stats.completedSets} max={stats.plannedSets || 1} />
          </View>
        </PremiumCard>
      </FadeInSection>

      {prCount > 0 ? (
        <FadeInSection delay={120}>
          <PremiumCard variant="elevated" className="gap-3 p-4">
            <Text variant="subtitle" className="font-semibold">
              {t('completion.personalRecords')}
            </Text>
            {stats.personalRecords.slice(0, 4).map((pr) => (
              <View
                key={`${pr.exerciseSlug}-${pr.type}`}
                className="flex-row items-center justify-between rounded-card border border-border-soft bg-bg-surface px-3 py-2.5"
              >
                <View className="flex-1 pr-3">
                  <Text variant="caption" className="font-semibold">
                    {te(pr.exerciseSlug)}
                  </Text>
                  <Text variant="tiny" tone="muted">
                    {prTypeLabel(pr.type, t)}
                  </Text>
                </View>
                <Text tone="accent" variant="caption" className="font-semibold">
                  {Math.round(pr.value)} {pr.unit}
                </Text>
              </View>
            ))}
          </PremiumCard>
        </FadeInSection>
      ) : null}

      <FadeInSection delay={prCount > 0 ? 180 : 120}>
        <View className="gap-3">
          <PremiumButton label={t('completion.backHome')} onPress={() => router.replace('/(tabs)' as Href)} />
          <PremiumButton
            label={t('completion.viewProgress')}
            variant="secondary"
            onPress={() => router.replace('/(tabs)/progress' as Href)}
          />
          <PremiumButton
            label={t('common.close')}
            variant="ghost"
            onPress={() => router.replace('/(tabs)' as Href)}
          />
        </View>
      </FadeInSection>
    </View>
  );
}
