import { View, RefreshControl, ScrollView } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { Screen, Text, Button, Card, Section, MetricCard } from '../../design-system';
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
        <View className="gap-7 pb-12">
          <Card elevated accent className="gap-5 overflow-hidden">
            <View className="absolute right-[-40px] top-[-70px] h-48 w-48 rounded-full bg-accent/20" />
            <View className="absolute bottom-[-80px] left-[-50px] h-44 w-44 rounded-full bg-accent-neon/10" />
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
              <Text variant="caption" tone="muted">
                SCHEDE FITNESS
              </Text>
                <Text variant="display">{summary?.user.displayName ?? '—'}</Text>
                <Text tone="secondary">Il tuo coach AI per allenarti meglio oggi.</Text>
              </View>
              {summary ? <ReadinessPill band={summary.readinessHint} /> : null}
            </View>
          </Card>

          {!isOnline ? (
            <Card className="border border-warning/30 bg-warning/10">
              <Text tone="primary" variant="caption">
                Sei offline. I dati mostrati sono cache. Le sessioni completate verranno sincronizzate appena
                torni online.
              </Text>
            </Card>
          ) : null}

          <Section title="Oggi" subtitle={today ? `Settimana ${today.weekNumber}` : 'Sessione del giorno'}>
            <Card elevated className="gap-4">
              {today ? (
                <>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text variant="subtitle">{today.dayLabel}</Text>
                      <Text tone="muted">
                        {today.exercises.length} esercizi · ~{summary?.nextWorkout?.estimatedDurationMin ?? 45}{'\''}
                      </Text>
                    </View>
                    {today.isDeload ? (
                      <View className="rounded-pill bg-warning/20 px-3 py-1">
                        <Text variant="tiny" tone="primary">
                          DELOAD
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Button
                    label="Inizia sessione"
                    size="lg"
                    onPress={() => router.push('/workout/session')}
                  />
                </>
              ) : (
                <View className="gap-3">
                  <Text>Nessun allenamento programmato per oggi.</Text>
                  <Button
                    label="Vedi storico"
                    variant="secondary"
                    onPress={() => router.push('/(tabs)/history')}
                  />
                </View>
              )}
            </Card>
          </Section>

          <Section title="Programma" subtitle="Piano di allenamento attivo">
            <Card elevated className="gap-3">
              <Text tone="muted">Visualizza tutte le settimane e i giorni del tuo programma.</Text>
              <Button
                label="Vedi piano completo"
                variant="secondary"
                onPress={() => router.push('/plan' as Href)}
              />
            </Card>
          </Section>

          <Section title="Settimana" subtitle="Focus e consistenza">
            <View className="flex-row gap-3">
              <MetricCard
                accent
                label="Volume"
                value={summary ? `${summary.weeklyVolume.completed}/${summary.weeklyVolume.planned}` : '—'}
                helper="set completati"
              />
              <MetricCard label="Streak" value={`${summary?.streakDays ?? 0}`} helper="giorni attivi" />
            </View>
          </Section>
        </View>
      </ScrollView>
    </Screen>
  );
}
