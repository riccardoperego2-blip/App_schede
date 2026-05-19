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

function ReadinessPill({ band }: { band: 'ready' | 'caution' | 'rest' }) {
  const colors = {
    ready: 'bg-accent/20 text-accent',
    caution: 'bg-warning/20 text-warning',
    rest: 'bg-danger/20 text-danger',
  } as const;
  const label = { ready: 'Pronto', caution: 'Attenzione', rest: 'Riposo' }[band];
  const tone = { ready: 'accent', caution: 'primary', rest: 'danger' }[band] as
    | 'accent'
    | 'primary'
    | 'danger';
  return (
    <View className={`rounded-pill px-3 py-1 ${colors[band].split(' ')[0]}`}>
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
  const dashboard = useDashboard();
  const todays = useTodaysWorkout();
  const userId = useAuthStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();

  useRealtimeNotifications(userId, () => {
    void queryClient.invalidateQueries({ queryKey: qk.dashboard() });
  });

  const summary = dashboard.data;
  const today = todays.data;
  const displayName = summary?.user.displayName || 'Pernycot';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'S';
  const weeklyCompleted = summary?.weeklyVolume.completed ?? 0;
  const weeklyPlanned = summary?.weeklyVolume.planned ?? 0;
  const weeklyPct = weeklyPlanned > 0 ? Math.round((weeklyCompleted / weeklyPlanned) * 100) : 0;

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
                  SCHEDE FITNESS
                </Text>
                <Text variant="display">Ciao, {displayName}</Text>
                <Text tone="secondary" variant="caption">
                  Spingi il prossimo set. Il piano si adatta, tu alza il livello.
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
                    STREAK MODE
                  </Text>
                  <Text variant="subtitle" className="font-semibold">
                    🔥 {summary?.streakDays ?? 0} giorni attivi
                  </Text>
                </View>
                {summary ? <ReadinessPill band={summary.readinessHint} /> : null}
              </View>
              <View className="mt-4 flex-row items-center justify-between">
                <MiniWeekBars completed={weeklyCompleted} planned={weeklyPlanned} />
                <Text variant="caption" tone="secondary">
                  {weeklyPct}% settimana
                </Text>
              </View>
            </View>
          </PremiumCard>
          </FadeInSection>

          {!isOnline ? (
            <FadeInSection delay={40}>
            <PremiumCard className="border border-warning/30 bg-warning/10">
              <Text tone="primary" variant="caption">
                Sei offline. I dati mostrati sono cache. Le sessioni completate verranno sincronizzate appena
                torni online.
              </Text>
            </PremiumCard>
            </FadeInSection>
          ) : null}

          <FadeInSection delay={80}>
          <View className="flex-row gap-3">
            <StatCard label="Workout" value={today ? 'Oggi' : '—'} helper={today ? `${today.exercises.length} esercizi` : 'nessuna sessione'} />
            <StatCard label="Volume" value={`${weeklyCompleted}/${weeklyPlanned || '—'}`} helper="set settimana" />
            <StatCard label="Streak" value={summary?.streakDays ?? 0} helper="giorni" />
          </View>
          </FadeInSection>

          <FadeInSection delay={120}>
          <PremiumCard variant="elevated" className="gap-4">
            <SectionHeader title="Obiettivo settimanale" subtitle="Completa i set programmati e mantieni ritmo." />
            <View className="flex-row items-end justify-between">
              <Text variant="title">{Math.min(100, weeklyPct)}%</Text>
              <Text tone="secondary" variant="caption">
                {weeklyCompleted}/{weeklyPlanned || 0} set
              </Text>
            </View>
            <AnimatedProgressBar value={weeklyCompleted} max={weeklyPlanned} />
          </PremiumCard>
          </FadeInSection>

          <FadeInSection delay={160}>
          <View className="gap-4">
            <SectionHeader
              title="Prossimo workout"
              subtitle={today ? `Settimana ${today.weekNumber} · sessione guidata` : 'Il piano e pronto appena vuoi partire'}
            />
            <PremiumCard
              variant="ambient"
              className="gap-4 p-5"
              pressable={!!today}
              onPress={today ? () => router.push('/workout/session') : undefined}
              accessibilityLabel={
                today ? `Apri workout di oggi, ${today.dayLabel}` : undefined
              }
              accessibilityHint={today ? 'Apre la sessione di allenamento' : undefined}
            >
              {today ? (
                <>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-4">
                      <Text variant="title">{today.dayLabel}</Text>
                      <Text tone="secondary">
                        {today.exercises.length} esercizi · ~{summary?.nextWorkout?.estimatedDurationMin ?? 45}'
                      </Text>
                    </View>
                    {today.isDeload ? (
                      <View className="rounded-pill bg-warning/20 px-3 py-1">
                        <Text variant="tiny" tone="primary">
                          DELOAD
                        </Text>
                      </View>
                    ) : (
                      <Text variant="title" tone="accent">
                        →
                      </Text>
                    )}
                  </View>
                  <View accessible={false} importantForAccessibility="no-hide-descendants">
                    <PremiumButton label="Inizia workout" onPress={() => router.push('/workout/session')} />
                  </View>
                </>
              ) : (
                <View className="gap-3">
                  <Text variant="subtitle">Nessun allenamento programmato oggi.</Text>
                  <Text tone="muted">Controlla il piano completo o usa lo storico per riprendere il ritmo.</Text>
                  <Button label="Vedi storico" variant="secondary" onPress={() => router.push('/(tabs)/history')} />
                </View>
              )}
            </PremiumCard>
          </View>
          </FadeInSection>

          <FadeInSection delay={200}>
          <PremiumCard variant="glass" className="gap-3">
            <SectionHeader title="Programma" subtitle="Piano di allenamento attivo" />
            <Text tone="muted">Visualizza settimane, giorni e progressione del programma.</Text>
            <Button label="Vedi piano completo" variant="secondary" onPress={() => router.push('/plan' as Href)} />
          </PremiumCard>
          </FadeInSection>
        </View>
      </ScrollView>
    </Screen>
  );
}
