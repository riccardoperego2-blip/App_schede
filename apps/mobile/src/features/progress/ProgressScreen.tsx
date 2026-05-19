import { useCallback, useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Screen,
  Text,
  Button,
  Chip,
  MetricCard,
  PremiumCard,
  SectionHeader,
  StatPill,
  TrendSparkline,
  AnimatedProgressBar,
  FadeInSection,
  PulsePlaceholder,
} from '../../design-system';
import { useAnalyticsOverview } from '../../hooks/use-analytics';
import {
  formatAdherencePercent,
  formatAnalyticsVolume,
  formatWeekLabel,
} from '../../lib/api/mappers/analytics-overview';
import { SmartInsightsSection, useSmartInsights } from '../insights';

const RANGES = ['4w', '12w', '6m', '1y'] as const;
type UiRange = (typeof RANGES)[number];
type ApiRange = Exclude<UiRange, '1y'>;

function StatRow({ label, value, max, detail }: { label: string; value: number; max: number; detail: string }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-4">
        <Text className="flex-1" numberOfLines={1}>{label}</Text>
        <Text tone="secondary" variant="caption">{detail}</Text>
      </View>
      <AnimatedProgressBar value={value} max={max} heightClassName="h-2" />
    </View>
  );
}

function MockTrendBars() {
  return (
    <View className="h-28 flex-row items-end gap-2 opacity-45">
      {[24, 48, 34, 70, 52, 82, 64, 76].map((height, index) => (
        <View
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          className="flex-1 overflow-hidden rounded-pill bg-bg-glass"
          style={{ height: 92 }}
        >
          <View
            className="absolute bottom-0 w-full rounded-pill"
            style={{ height: `${height}%`, backgroundColor: 'rgba(255,255,255,0.12)' }}
          />
        </View>
      ))}
    </View>
  );
}

function AnalyticsSkeleton() {
  return (
    <Screen>
      <View className="gap-5 px-1 pt-2">
        <PremiumCard variant="ambient" className="gap-4 p-6">
          <PulsePlaceholder className="h-3 w-28" />
          <PulsePlaceholder className="h-10 w-48" />
          <PulsePlaceholder className="h-4 w-64" />
          <View className="flex-row gap-2">
            <PulsePlaceholder className="h-16 flex-1" />
            <PulsePlaceholder className="h-16 flex-1" />
          </View>
        </PremiumCard>
        <PremiumCard variant="glass" className="gap-4 p-5">
          <PulsePlaceholder className="h-4 w-36" />
          <MockTrendBars />
        </PremiumCard>
        <Text tone="muted" className="text-center">
          Caricamento analytics…
        </Text>
      </View>
    </Screen>
  );
}

function estimateOneRepMax(weightKg: number | null, reps: number | null): string {
  if (!weightKg || !reps) return '—';
  return `${Math.round(weightKg * (1 + reps / 30))} kg`;
}

function formatVolumeValue(volumeKg: number): string {
  return volumeKg > 0 ? formatAnalyticsVolume(volumeKg) : '0 kg';
}

function EmptyAnalyticsCard({ onStartWorkout }: { onStartWorkout: () => void }) {
  return (
    <PremiumCard variant="ambient" className="gap-5 p-5">
      <View className="gap-2">
        <Text variant="tiny" tone="accent" className="font-extrabold tracking-widest">
          ANALYTICS AVANZATE
        </Text>
        <Text variant="title">Completa il tuo primo workout per sbloccare analytics avanzate</Text>
        <Text tone="secondary">
          Dopo le prime sessioni vedrai trend volume, PR personali, esercizi top e muscoli più allenati.
        </Text>
      </View>
      <MockTrendBars />
      <Button label="Vai al workout" onPress={onStartWorkout} />
    </PremiumCard>
  );
}

export function ProgressScreen() {
  const router = useRouter();
  const [range, setRange] = useState<UiRange>('4w');
  const apiRange: ApiRange = range === '1y' ? '6m' : range;
  const { data, isLoading, isError, error, isRefetching, refetch } = useAnalyticsOverview(apiRange);
  const insights = useSmartInsights(apiRange);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const hasPersonalRecords = (data?.personalRecords.length ?? 0) > 0;
  const hasTrendData = (data?.weeklyVolumeSeries.length ?? 0) > 0;
  const hasTopExercises = (data?.topExercisesByVolume.length ?? 0) > 0;
  const hasMostTrainedExercises = (data?.mostTrainedExercises.length ?? 0) > 0;
  const hasMuscleDistribution = (data?.muscleDistribution.length ?? 0) > 0;
  const totalVolumeKg = data?.totalVolumeKg ?? 0;
  const allTimeVolumeKg = data?.allTimeVolumeKg ?? 0;
  const last4WeeksVolumeKg = data?.last4WeeksVolumeKg ?? 0;
  const hasSessionStats =
    (data?.totalSessions ?? 0) > 0 ||
    (data?.completedSessions ?? 0) > 0 ||
    (data?.sessionsThisWeek ?? 0) > 0 ||
    (data?.streakDays ?? 0) > 0;
  const hasAnyAnalyticsData =
    hasPersonalRecords ||
    hasTrendData ||
    hasTopExercises ||
    hasMostTrainedExercises ||
    hasMuscleDistribution ||
    hasSessionStats ||
    totalVolumeKg > 0 ||
    allTimeVolumeKg > 0 ||
    last4WeeksVolumeKg > 0;
  const maxWeeklyVolume = Math.max(0, ...(data?.weeklyVolumeSeries.map((w) => w.volumeKg) ?? []));
  const maxExerciseVolume = Math.max(0, ...(data?.topExercisesByVolume.map((x) => x.volumeKg) ?? []));
  const maxMuscleSets = Math.max(0, ...(data?.muscleDistribution.map((m) => m.sets) ?? []));
  const periodVolume = data?.weeklyVolumeSeries.reduce((sum, week) => sum + week.volumeKg, 0) ?? 0;

  if (isLoading && !data) {
    return <AnalyticsSkeleton />;
  }

  if (isError && !data) {
    return (
      <Screen>
        <View className="gap-5 px-1 pt-2">
          <PremiumCard variant="ambient" className="gap-3 p-5">
            <Text variant="tiny" tone="accent" className="font-extrabold tracking-widest">
              PERFORMANCE
            </Text>
            <Text variant="display">Panoramica</Text>
            <Text variant="subtitle">Impossibile caricare i dati</Text>
            <Text tone="muted">
              Potrebbe essere un problema di rete, token scaduto o risposta API non disponibile.
            </Text>
          </PremiumCard>
          <PremiumCard variant="glass" className="gap-3">
            <Text tone="muted">{(error as Error).message}</Text>
          </PremiumCard>
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
        <FadeInSection delay={0}>
        <PremiumCard variant="ambient" className="gap-4 p-6">
          <Text variant="tiny" tone="muted" className="tracking-widest">
            PERFORMANCE
          </Text>
          <Text variant="display">Panoramica</Text>
          <Text tone="secondary">Volume, PR personali e consistenza del tuo percorso.</Text>
          <View className="flex-row gap-2">
            <StatPill active label="Sessioni" value={data?.totalSessions ?? data?.completedSessions ?? 0} />
            <StatPill label="PR" value={data?.personalRecords.length ?? 0} />
          </View>
        </PremiumCard>
        </FadeInSection>

        <SmartInsightsSection insights={insights} delay={40} />

        <FadeInSection delay={50}>
        <View className="flex-row gap-2 rounded-pill border border-border-soft bg-bg-glass p-1">
          {RANGES.map((r) => (
            <Chip key={r} label={r.toUpperCase()} active={range === r} onPress={() => setRange(r)} className="flex-1" />
          ))}
        </View>

        {!hasAnyAnalyticsData ? (
          <EmptyAnalyticsCard onStartWorkout={() => router.push('/workout/session')} />
        ) : null}
        </FadeInSection>

        <FadeInSection delay={100}>
        <View className="flex-row gap-3">
          <MetricCard label="Sessioni" value={data?.totalSessions ?? data?.completedSessions ?? 0} helper="totali" accent />
          <MetricCard
            label="Ultime 4 sett."
            value={formatVolumeValue(last4WeeksVolumeKg)}
            helper="volume"
          />
        </View>

        <PremiumCard variant="default" className="gap-4 p-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 gap-0.5 pr-4">
              <Text variant="caption" tone="muted">
                TREND VOLUME
              </Text>
              <Text variant="title">{formatVolumeValue(periodVolume || last4WeeksVolumeKg || totalVolumeKg)}</Text>
              <Text variant="tiny" tone="secondary">
                Volume stimato nel periodo selezionato
              </Text>
            </View>
            <View className="rounded-pill border border-border-soft bg-bg-surface px-3 py-1.5">
              <Text variant="tiny" tone="secondary">
                {range.toUpperCase()}
              </Text>
            </View>
          </View>
          {hasTrendData ? (
            <TrendSparkline values={(data?.weeklyVolumeSeries ?? []).map((week) => week.volumeKg)} />
          ) : (
            <>
              <MockTrendBars />
              <Text tone="muted">
                {hasAnyAnalyticsData
                  ? 'Hai dati parziali, ma non ancora volume nel periodo selezionato.'
                  : 'Completa sessioni per generare il trend.'}
              </Text>
            </>
          )}
        </PremiumCard>
        </FadeInSection>

        <FadeInSection delay={150}>
        <View className="flex-row gap-3">
          <MetricCard label="Aderenza" value={data ? formatAdherencePercent(data.adherencePct) : '—'} helper={range.toUpperCase()} />
          <MetricCard label="Streak" value={`${data?.streakDays ?? 0}`} helper={`Questa sett. ${data?.sessionsThisWeek ?? 0}`} />
        </View>

        <View className="flex-row gap-3">
          <MetricCard label="Volume totale" value={formatVolumeValue(allTimeVolumeKg || totalVolumeKg)} helper="all time" />
          <MetricCard label="Periodo" value={formatVolumeValue(periodVolume || totalVolumeKg)} helper={range.toUpperCase()} />
        </View>

        <PremiumCard variant="glass" className="gap-3">
          <Text variant="subtitle">Dettaglio settimanale</Text>
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
            <Text tone="muted">
              {hasAnyAnalyticsData
                ? 'Nessun volume settimanale in questo periodo, ma le altre metriche sono disponibili.'
                : 'Il dettaglio settimanale apparira dopo le prime sessioni.'}
            </Text>
          )}
        </PremiumCard>
        </FadeInSection>

        <FadeInSection delay={200}>
        <PremiumCard variant="elevated" className="gap-4">
          <SectionHeader title="PR personali" subtitle="Peso, volume e reps migliori per esercizio" />
          {hasPersonalRecords ? (
            (data?.personalRecords ?? []).slice(0, 6).map((pr) => (
              <View key={pr.exerciseSlug} className="gap-3 rounded-card border border-border-soft bg-bg-glass p-4">
                <View className="flex-row items-start justify-between gap-4">
                  <View className="flex-1">
                    <Text numberOfLines={1} variant="subtitle">
                      {pr.exerciseName || pr.exerciseSlug}
                    </Text>
                    <Text tone="muted" variant="caption">
                      1RM stimato {estimateOneRepMax(pr.bestWeightKg, pr.bestReps)}
                    </Text>
                  </View>
                  <View className="rounded-pill border border-border-soft bg-bg-glass px-2.5 py-1">
                    <Text variant="tiny" tone="accent">
                      PR
                    </Text>
                  </View>
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <StatPill label="peso" value={pr.bestWeightKg ? `${Math.round(pr.bestWeightKg)} kg` : '—'} active />
                  <StatPill label="reps" value={pr.bestReps ?? '—'} />
                  <StatPill label="volume" value={pr.bestVolumeKg ? `${Math.round(pr.bestVolumeKg)} kg` : '—'} />
                </View>
              </View>
            ))
          ) : (
            <Text tone="muted">
              {hasAnyAnalyticsData
                ? 'Non ci sono ancora PR con carico/reps sufficienti da mostrare.'
                : 'Completa qualche set con carico e reps per vedere i tuoi PR.'}
            </Text>
          )}
        </PremiumCard>

        <PremiumCard variant="elevated" className="gap-4">
          <SectionHeader title="Top 5 esercizi" subtitle="Classifica per volume nel periodo" />
          {hasTopExercises ? (
            (data?.topExercisesByVolume ?? []).map((exercise) => (
              <StatRow
                key={exercise.exerciseSlug}
                label={exercise.exerciseName || exercise.exerciseSlug}
                value={exercise.volumeKg}
                max={maxExerciseVolume}
                detail={`${Math.round(exercise.volumeKg)} kg`}
              />
            ))
          ) : (
            <Text tone="muted">
              {hasAnyAnalyticsData
                ? 'Nessun esercizio con volume nel periodo selezionato.'
                : 'I top esercizi appariranno dopo i primi workout completati.'}
            </Text>
          )}
        </PremiumCard>

        <PremiumCard variant="glass" className="gap-3">
          <Text variant="subtitle">Esercizi più allenati</Text>
          {hasMostTrainedExercises ? (
            (data?.mostTrainedExercises ?? []).map((exercise) => (
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
        </PremiumCard>

        <PremiumCard variant="glass" className="gap-3">
          <Text variant="subtitle">Top muscoli per serie</Text>
          {hasMuscleDistribution ? (
            (data?.muscleDistribution ?? []).map((row) => (
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
        </PremiumCard>
        </FadeInSection>
      </ScrollView>
    </Screen>
  );
}


