import { useCallback, useState } from 'react';
import { ScrollView, View, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Text, Card, Button, Chip, MetricCard } from '../../design-system';
import { useAnalyticsOverview } from '../../hooks/use-analytics';
import {
  formatAdherencePercent,
  formatAnalyticsVolume,
  formatWeekLabel,
} from '../../lib/api/mappers/analytics-overview';

const RANGES = ['4w', '12w', '6m'] as const;

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0;
  return (
    <View className="h-2 overflow-hidden rounded-pill bg-bg-glass">
      <View className="h-full rounded-pill bg-accent" style={{ width: `${pct}%` }} />
    </View>
  );
}

function StatRow({ label, value, max, detail }: { label: string; value: number; max: number; detail: string }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="flex-1" numberOfLines={1}>{label}</Text>
        <Text tone="secondary" variant="caption">{detail}</Text>
      </View>
      <ProgressBar value={value} max={max} />
    </View>
  );
}

export function ProgressScreen() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('4w');
  const { data, isLoading, isError, error, isRefetching, refetch } = useAnalyticsOverview(range);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const hasData =
    !!data &&
    (data.completedSessions > 0 ||
      data.sessionsThisWeek > 0 ||
      data.weeklyVolumeSeries.some((w) => w.volumeKg > 0) ||
      data.personalRecords.length > 0);
  const maxWeeklyVolume = Math.max(0, ...(data?.weeklyVolumeSeries.map((w) => w.volumeKg) ?? []));
  const maxExerciseVolume = Math.max(0, ...(data?.topExercisesByVolume.map((x) => x.volumeKg) ?? []));
  const maxMuscleSets = Math.max(0, ...(data?.muscleDistribution.map((m) => m.sets) ?? []));

  if (isLoading && !data) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#22C55E" />
          <Text tone="muted">Caricamento progressi…</Text>
        </View>
      </Screen>
    );
  }

  if (isError && !data) {
    return (
      <Screen>
        <View className="gap-4 px-1 pt-2">
          <Text variant="display">Progressi</Text>
          <Text variant="subtitle">Impossibile caricare i dati</Text>
          <Text tone="muted">{(error as Error).message}</Text>
          <Button label="Riprova" onPress={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, gap: 18 }}
        refreshControl={
          <RefreshControl tintColor="#22C55E" refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        <Card elevated accent className="gap-2">
          <Text variant="caption" tone="muted">
            PERFORMANCE
          </Text>
          <Text variant="display">Progressi</Text>
          <Text tone="secondary">Volume, aderenza e frequenza del tuo percorso.</Text>
        </Card>

        <View className="flex-row gap-2 rounded-pill border border-border-soft bg-bg-surface p-1">
          {RANGES.map((r) => (
            <Chip key={r} label={r.toUpperCase()} active={range === r} onPress={() => setRange(r)} className="flex-1" />
          ))}
        </View>

        {!hasData ? (
          <Card elevated className="gap-3">
            <Text variant="subtitle">Nessun dato nel periodo</Text>
            <Text tone="muted">Completa almeno una sessione per vedere i progressi.</Text>
            <Button label="Aggiorna" variant="secondary" onPress={() => void refetch()} />
          </Card>
        ) : null}

        <View className="flex-row gap-3">
          <MetricCard label="Sessioni" value={data?.totalSessions ?? data?.completedSessions ?? 0} helper="totali" accent />
          <MetricCard
            label="Ultime 4 sett."
            value={formatAnalyticsVolume(data?.last4WeeksVolumeKg)}
            helper="volume"
          />
        </View>

        <Card elevated accent className="gap-1">
          <Text variant="caption" tone="muted">
            VOLUME ALL TIME
          </Text>
          <Text variant="display">{formatAnalyticsVolume(data?.allTimeVolumeKg ?? data?.totalVolumeKg)}</Text>
          <Text variant="tiny" tone="muted">
            Somma di tutte le sessioni completate
          </Text>
        </Card>

        <View className="flex-row gap-3">
          <MetricCard label="Aderenza" value={data ? formatAdherencePercent(data.adherencePct) : '—'} helper={range.toUpperCase()} />
          <MetricCard label="Streak" value={`${data?.streakDays ?? 0}`} helper={`Questa sett. ${data?.sessionsThisWeek ?? 0}`} />
        </View>

        <Card className="gap-3">
          <Text variant="subtitle">Trend volume settimanale</Text>
          {data?.weeklyVolumeSeries.length ? (
            data.weeklyVolumeSeries.map((week) => (
              <StatRow
                key={week.weekStart}
                label={formatWeekLabel(week.weekStart)}
                value={week.volumeKg}
                max={maxWeeklyVolume}
                detail={week.volumeKg > 0 ? `${Math.round(week.volumeKg)} kg` : '—'}
              />
            ))
          ) : (
            <Text tone="muted">Nessun volume registrato.</Text>
          )}
        </Card>

        <Card elevated className="gap-3">
          <Text variant="subtitle">PR personali</Text>
          {data?.personalRecords.length ? (
            data.personalRecords.slice(0, 6).map((pr) => (
              <View key={pr.exerciseSlug} className="gap-1 rounded-card border border-border-soft bg-bg-surface p-3">
                <Text numberOfLines={1}>{pr.exerciseName || pr.exerciseSlug}</Text>
                <Text tone="muted" variant="caption">
                  Peso {pr.bestWeightKg ? `${Math.round(pr.bestWeightKg)} kg` : '—'} · Volume{' '}
                  {pr.bestVolumeKg ? `${Math.round(pr.bestVolumeKg)} kg` : '—'} · Reps {pr.bestReps ?? '—'}
                </Text>
              </View>
            ))
          ) : (
            <Text tone="muted">Completa qualche set con carico e reps per vedere i tuoi PR.</Text>
          )}
        </Card>

        <Card className="gap-3">
          <Text variant="subtitle">Top 5 esercizi per volume</Text>
          {data?.topExercisesByVolume.length ? (
            data.topExercisesByVolume.map((exercise) => (
              <StatRow
                key={exercise.exerciseSlug}
                label={exercise.exerciseName || exercise.exerciseSlug}
                value={exercise.volumeKg}
                max={maxExerciseVolume}
                detail={`${Math.round(exercise.volumeKg)} kg`}
              />
            ))
          ) : (
            <Text tone="muted">Nessun esercizio con volume nel periodo.</Text>
          )}
        </Card>

        <Card className="gap-3">
          <Text variant="subtitle">Esercizi più allenati</Text>
          {data?.mostTrainedExercises.length ? (
            data.mostTrainedExercises.map((exercise) => (
              <View key={exercise.exerciseSlug} className="flex-row items-center justify-between">
                <Text className="flex-1 pr-3" numberOfLines={1}>
                  {exercise.exerciseName || exercise.exerciseSlug}
                </Text>
                <Text tone="secondary" variant="caption">
                  {exercise.sets} serie · {exercise.sessions} sessioni
                </Text>
              </View>
            ))
          ) : (
            <Text tone="muted">Nessun esercizio registrato nel periodo.</Text>
          )}
        </Card>

        <Card className="gap-3">
          <Text variant="subtitle">Top muscoli per serie</Text>
          {data?.muscleDistribution.length ? (
            data.muscleDistribution.map((row) => (
              <StatRow
                key={row.muscleGroup}
                label={row.muscleGroup}
                value={row.sets}
                max={maxMuscleSets}
                detail={`${row.sets} ${row.sets === 1 ? 'serie' : 'serie'}`}
              />
            ))
          ) : (
            <Text tone="muted">Dati muscolari non disponibili.</Text>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}


