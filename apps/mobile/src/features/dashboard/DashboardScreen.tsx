import { Image, View, RefreshControl, ScrollView } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Button,
  PremiumButton,
  PremiumCard,
  SectionHeader,
  AnimatedProgressBar,
  FadeInSection,
} from '../../design-system';
import { colors } from '../../theme';
import { useDashboard, useTodaysWorkout } from '../../hooks/use-dashboard';
import { useAuthStore } from '../../stores/auth.store';
import { useRealtimeNotifications } from '../../hooks/use-realtime-notifications';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '../../lib/api/query-keys';
import { useOnlineStatus } from '../../hooks/use-online-status';
import { CompactSmartInsightsBar, useCompactSmartInsights } from '../insights';
import { useI18n } from '../../i18n/use-i18n';

function ReadinessPill({
  band,
  label,
}: {
  band: 'ready' | 'caution' | 'rest';
  label: string;
}) {
  const tone = { ready: 'accent', caution: 'primary', rest: 'danger' }[band] as
    | 'accent'
    | 'primary'
    | 'danger';
  const bg = { ready: 'bg-accent/20', caution: 'bg-warning/20', rest: 'bg-danger/20' }[band];
  return (
    <View className={`rounded-pill px-3 py-1 ${bg}`}>
      <Text variant="tiny" tone={tone}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function MiniWeekBars({ completed, planned }: { completed: number; planned: number }) {
  const activeBars = Math.min(7, Math.max(1, Math.ceil((completed / Math.max(planned, 1)) * 7)));
  return (
    <View className="flex-row items-end gap-1">
      {Array.from({ length: 7 }).map((_, index) => (
        <View
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className="w-2 rounded-pill"
          style={{
            height: 10 + index * 3,
            backgroundColor: index < activeBars ? colors.primary : 'rgba(255,255,255,0.10)',
          }}
        />
      ))}
    </View>
  );
}

function StatCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <PremiumCard variant="glass" className="flex-1 gap-1 p-3.5">
      <Text variant="tiny" tone="muted" className="tracking-wide">
        {label.toUpperCase()}
      </Text>
      <Text variant="subtitle" className="font-semibold">
        {value}
      </Text>
      <Text variant="tiny" tone="muted">
        {helper}
      </Text>
    </PremiumCard>
  );
}

export function DashboardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const dashboard = useDashboard();
  const todays = useTodaysWorkout();
  const userId = useAuthStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();

  useRealtimeNotifications(userId, () => {
    void queryClient.invalidateQueries({ queryKey: qk.dashboard() });
  });

  const summary = dashboard.data;
  const today = todays.data;
  const displayName = summary?.user.displayName || t('profile.athlete');
  const initial = displayName.trim().charAt(0).toUpperCase() || 'S';
  const weeklyCompleted = summary?.weeklyVolume.completed ?? 0;
  const weeklyPlanned = summary?.weeklyVolume.planned ?? 0;
  const weeklyPct = weeklyPlanned > 0 ? Math.round((weeklyCompleted / weeklyPlanned) * 100) : 0;
  const compactInsights = useCompactSmartInsights('4w');

  const readinessLabels = {
    ready: t('readiness.ready'),
    caution: t('readiness.caution'),
    rest: t('readiness.rest'),
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            tintColor="#5BE3A1"
            refreshing={dashboard.isRefetching}
            onRefresh={() => {
              void dashboard.refetch();
              void todays.refetch();
              void queryClient.invalidateQueries({ queryKey: qk.analytics.overview('4w') });
              void queryClient.invalidateQueries({ queryKey: qk.workouts.history() });
            }}
          />
        }
      >
        <View className="gap-5 pb-12">
          <FadeInSection delay={0}>
          <PremiumCard variant="ambient" className="gap-5 p-6">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4 gap-1">
                <Text variant="tiny" tone="muted" className="tracking-widest">
                  {t('dashboard.brand')}
                </Text>
                <Text variant="display">{t('dashboard.greeting', { name: displayName })}</Text>
                <Text tone="secondary" variant="caption">
                  {t('dashboard.tagline')}
                </Text>
              </View>
              <View
                className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border"
                style={{ borderColor: 'rgba(255,255,255,0.10)', backgroundColor: colors.surface }}
              >
                {summary?.user.avatarUrl ? (
                  <Image source={{ uri: summary.user.avatarUrl }} className="h-full w-full" />
                ) : (
                  <Text variant="subtitle" tone="accent">
                    {initial}
                  </Text>
                )}
              </View>
            </View>
            <View className="rounded-card border border-border-soft bg-bg-surface/80 p-4">
              <View className="flex-row items-center justify-between">
                <View className="gap-1">
                  <Text variant="tiny" tone="muted" className="tracking-wide">
                    {t('dashboard.streakMode')}
                  </Text>
                  <Text variant="subtitle" className="font-semibold">
                    {t('dashboard.activeDays', { count: summary?.streakDays ?? 0 })}
                  </Text>
                </View>
                {summary ? (
                  <ReadinessPill band={summary.readinessHint} label={readinessLabels[summary.readinessHint]} />
                ) : null}
              </View>
              <View className="mt-4 flex-row items-center justify-between">
                <MiniWeekBars completed={weeklyCompleted} planned={weeklyPlanned} />
                <Text variant="caption" tone="secondary">
                  {t('dashboard.weekPct', { pct: weeklyPct })}
                </Text>
              </View>
            </View>
          </PremiumCard>
          </FadeInSection>

          <CompactSmartInsightsBar insights={compactInsights} delay={50} />

          {!isOnline ? (
            <FadeInSection delay={40}>
            <PremiumCard className="border border-warning/30 bg-warning/10">
              <Text tone="primary" variant="caption">
                {t('dashboard.offlineBanner')}
              </Text>
            </PremiumCard>
            </FadeInSection>
          ) : null}

          <FadeInSection delay={80}>
          <View className="flex-row gap-3">
            <StatCard
              label={t('stat.workout')}
              value={today ? t('dashboard.statToday') : t('common.emDash')}
              helper={
                today
                  ? `${today.exercises.length} ${t('common.exercises')}`
                  : t('dashboard.statNoSession')
              }
            />
            <StatCard
              label={t('stat.volume')}
              value={`${weeklyCompleted}/${weeklyPlanned || t('common.emDash')}`}
              helper={t('dashboard.statWeekSets')}
            />
            <StatCard
              label={t('stat.streak')}
              value={summary?.streakDays ?? 0}
              helper={t('common.days')}
            />
          </View>
          </FadeInSection>

          <FadeInSection delay={120}>
          <PremiumCard variant="elevated" className="gap-4">
            <SectionHeader title={t('dashboard.weeklyGoal')} subtitle={t('dashboard.weeklyGoalSub')} />
            <View className="flex-row items-end justify-between">
              <Text variant="title">{Math.min(100, weeklyPct)}%</Text>
              <Text tone="secondary" variant="caption">
                {weeklyCompleted}/{weeklyPlanned || 0} {t('common.sets')}
              </Text>
            </View>
            <AnimatedProgressBar value={weeklyCompleted} max={weeklyPlanned} />
          </PremiumCard>
          </FadeInSection>

          <FadeInSection delay={160}>
          <View className="gap-4">
            <SectionHeader
              title={t('dashboard.nextWorkout')}
              subtitle={
                today
                  ? t('dashboard.nextWorkoutSub', { week: today.weekNumber })
                  : t('dashboard.nextWorkoutReady')
              }
            />
            <PremiumCard
              variant="ambient"
              className="gap-4 p-5"
              pressable={!!today}
              onPress={today ? () => router.push('/workout/session') : undefined}
              accessibilityLabel={
                today ? t('dashboard.openTodayWorkout', { label: today.dayLabel }) : undefined
              }
              accessibilityHint={today ? t('dashboard.openSessionHint') : undefined}
            >
              {today ? (
                <>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                      <Text variant="title">{today.dayLabel}</Text>
                      <Text tone="secondary">
                        {t('dashboard.exercisesDuration', {
                          count: today.exercises.length,
                          min: summary?.nextWorkout?.estimatedDurationMin ?? 45,
                        })}
                      </Text>
                    </View>
                    {today.isDeload ? (
                      <View className="rounded-pill bg-warning/20 px-3 py-1">
                        <Text variant="tiny" tone="primary">
                          {t('common.deload')}
                        </Text>
                      </View>
                    ) : (
                      <Text variant="title" tone="accent">
                        →
                      </Text>
                    )}
                  </View>
                  <View accessible={false} importantForAccessibility="no-hide-descendants">
                    <PremiumButton label={t('dashboard.startWorkout')} onPress={() => router.push('/workout/session')} />
                  </View>
                </>
              ) : (
                <View className="gap-3">
                  <Text variant="subtitle">{t('dashboard.noWorkoutToday')}</Text>
                  <Text tone="muted">{t('dashboard.noWorkoutHint')}</Text>
                  <Button label={t('dashboard.viewHistory')} variant="secondary" onPress={() => router.push('/(tabs)/history')} />
                </View>
              )}
            </PremiumCard>
          </View>
          </FadeInSection>

          <FadeInSection delay={200}>
          <PremiumCard variant="glass" className="gap-3">
            <SectionHeader title={t('dashboard.program')} subtitle={t('dashboard.programSub')} />
            <Text tone="muted">{t('dashboard.programHint')}</Text>
            <Button label={t('dashboard.viewFullPlan')} variant="secondary" onPress={() => router.push('/plan' as Href)} />
          </PremiumCard>
          </FadeInSection>
        </View>
      </ScrollView>
    </Screen>
  );
}
