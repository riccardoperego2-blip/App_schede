import { useCallback, useMemo } from 'react';
import { FlatList, View, RefreshControl, ActivityIndicator } from 'react-native';
import { type Href, useFocusEffect, useRouter } from 'expo-router';
import {
  Screen,
  Text,
  PremiumButton,
  PremiumCard,
  StatPill,
  FadeInSection,
  PulsePlaceholder,
} from '../../design-system';
import { colors } from '../../theme';
import { useWorkoutHistory } from '../../hooks/use-history';
import {
  computeHistorySummary,
  formatHistoryDate,
  formatHistoryDuration,
  formatHistoryVolume,
  type HistorySessionItem,
} from '../../lib/api/mappers/workout-history';

function HistorySkeleton() {
  return (
    <Screen>
      <View className="gap-5">
        <PremiumCard variant="ambient" className="gap-4 p-6">
          <PulsePlaceholder className="h-3 w-24" />
          <PulsePlaceholder className="h-10 w-44" />
          <PulsePlaceholder className="h-4 w-56" />
          <View className="flex-row gap-2">
            <PulsePlaceholder className="h-16 flex-1" />
            <PulsePlaceholder className="h-16 flex-1" />
            <PulsePlaceholder className="h-16 flex-1" />
          </View>
        </PremiumCard>
        {[0, 1, 2].map((i) => (
          <View key={i} className="flex-row gap-3">
            <PulsePlaceholder className="mt-2 h-3 w-3 rounded-full" />
            <PremiumCard variant="glass" className="flex-1 gap-3 p-4">
              <PulsePlaceholder className="h-5 w-40" />
              <PulsePlaceholder className="h-3 w-28" />
              <View className="flex-row gap-2">
                <PulsePlaceholder className="h-10 w-20" />
                <PulsePlaceholder className="h-10 w-20" />
              </View>
            </PremiumCard>
          </View>
        ))}
        <Text tone="muted" className="text-center">
          Caricamento cronologia…
        </Text>
      </View>
    </Screen>
  );
}

function SummaryStat({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <PremiumCard variant="glass" className="min-w-[30%] flex-1 gap-1 p-3.5">
      <Text variant="tiny" tone="muted" className="tracking-wide">
        {label.toUpperCase()}
      </Text>
      <Text variant="subtitle" className="font-semibold">
        {value}
      </Text>
      {helper ? (
        <Text variant="tiny" tone="muted">
          {helper}
        </Text>
      ) : null}
    </PremiumCard>
  );
}

function HistorySummaryHeader({
  summary,
  hasMore,
}: {
  summary: ReturnType<typeof computeHistorySummary>;
  hasMore: boolean;
}) {
  const volumeLabel =
    summary.totalVolumeKg > 0 ? `${Math.round(summary.totalVolumeKg).toLocaleString('it-IT')} kg` : '—';
  const countLabel = hasMore ? `${summary.workoutCount}+` : String(summary.workoutCount);

  return (
    <FadeInSection delay={0} className="mb-5 gap-4">
      <PremiumCard variant="ambient" className="gap-4 p-5">
        <View className="gap-1">
          <Text variant="tiny" tone="accent" className="tracking-widest">
            IL TUO PERCORSO
          </Text>
          <Text variant="display">Cronologia</Text>
          <Text tone="secondary" variant="caption">
            Ogni sessione conta. La costanza costruisce i risultati.
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          <SummaryStat label="Allenamenti" value={countLabel} helper={hasMore ? 'caricati' : undefined} />
          <SummaryStat label="Volume" value={volumeLabel} />
          <SummaryStat
            label="Streak"
            value={summary.streakDays != null ? `${summary.streakDays}g` : '—'}
            helper={summary.streakDays != null ? 'giorni attivi' : 'completa una sessione'}
          />
        </View>
        {summary.lastSessionLabel ? (
          <Text variant="tiny" tone="muted">
            Ultima sessione · {summary.lastSessionLabel}
          </Text>
        ) : null}
      </PremiumCard>
    </FadeInSection>
  );
}

function CompletedBadge({ prCount }: { prCount: number }) {
  return (
    <View className="flex-row flex-wrap items-center justify-end gap-1.5">
      <View className="rounded-pill border border-accent/30 bg-accent/10 px-2.5 py-1">
        <Text variant="tiny" tone="accent" className="font-semibold tracking-wide">
          COMPLETATO
        </Text>
      </View>
      {prCount > 0 ? (
        <View className="rounded-pill border border-border-soft bg-bg-surface px-2.5 py-1">
          <Text variant="tiny" tone="accent" className="font-semibold">
            {prCount} PR
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function HistoryTimelineItem({
  item,
  index,
  isLast,
}: {
  item: HistorySessionItem;
  index: number;
  isLast: boolean;
}) {
  const dateLabel = formatHistoryDate(item.completedAt);
  const durationLabel = formatHistoryDuration(item.durationMinutes);
  const volumeLabel = formatHistoryVolume(item.volumeKg);
  const exerciseLabel =
    item.exerciseCount > 0
      ? `${item.exerciseCount} ${item.exerciseCount === 1 ? 'esercizio' : 'esercizi'}`
      : '—';

  return (
    <FadeInSection delay={Math.min(40 + index * 50, 220)} className="flex-row gap-3">
      <View className="w-5 items-center pt-5">
        <View
          className="h-3 w-3 rounded-full border-2"
          style={{
            borderColor: colors.primary,
            backgroundColor: `${colors.primary}33`,
            shadowColor: colors.primary,
            shadowOpacity: 0.35,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
        {!isLast ? (
          <View
            className="mt-1 w-px flex-1 min-h-[72px]"
            style={{ backgroundColor: 'rgba(57, 255, 136, 0.18)' }}
          />
        ) : null}
      </View>

      <View className="mb-4 flex-1">
        <PremiumCard variant="elevated" className="gap-3.5 p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text variant="subtitle" className="font-semibold">
                {item.dayLabel}
              </Text>
              {dateLabel ? (
                <Text variant="caption" tone="muted">
                  {dateLabel}
                </Text>
              ) : (
                <Text variant="caption" tone="muted">
                  Data non disponibile
                </Text>
              )}
            </View>
            <CompletedBadge prCount={item.prCount} />
          </View>

          <View className="flex-row flex-wrap gap-2">
            <StatPill label="durata" value={durationLabel} active={item.durationMinutes > 0} />
            <StatPill label="volume" value={volumeLabel} active={(item.volumeKg ?? 0) > 0} />
            <StatPill label="esercizi" value={exerciseLabel} active={item.exerciseCount > 0} />
          </View>
        </PremiumCard>
      </View>
    </FadeInSection>
  );
}

function HistoryEmptyState({ onStartWorkout, onRefresh }: { onStartWorkout: () => void; onRefresh: () => void }) {
  return (
    <View className="flex-1 justify-center gap-5">
      <FadeInSection delay={60}>
        <PremiumCard variant="ambient" className="gap-4 p-6">
          <View className="h-14 w-14 items-center justify-center self-center rounded-full border border-border-soft bg-bg-surface">
            <Text className="text-2xl">📋</Text>
          </View>
          <View className="gap-2">
            <Text variant="tiny" tone="accent" className="text-center tracking-widest">
              CRONOLOGIA VUOTA
            </Text>
            <Text variant="title" className="text-center">
              Completa il tuo primo workout per costruire la tua cronologia
            </Text>
            <Text tone="secondary" variant="caption" className="text-center">
              Qui troverai durata, volume ed esercizi di ogni sessione completata.
            </Text>
          </View>
          <PremiumButton label="Vai al workout" onPress={onStartWorkout} />
          <PremiumButton label="Aggiorna" variant="secondary" onPress={onRefresh} />
        </PremiumCard>
      </FadeInSection>
    </View>
  );
}

function HistoryErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View className="flex-1 justify-center gap-4">
      <PremiumCard variant="glass" className="gap-3 p-5">
        <Text variant="subtitle" className="font-semibold">
          Impossibile caricare la cronologia
        </Text>
        <Text tone="muted" variant="caption">
          {message}
        </Text>
        <PremiumButton label="Riprova" onPress={onRetry} />
      </PremiumCard>
    </View>
  );
}

export function HistoryScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useWorkoutHistory();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data?.pages]);
  const summary = useMemo(() => computeHistorySummary(items), [items]);
  const goHome = useCallback(() => router.push('/(tabs)' as Href), [router]);

  if (isLoading && items.length === 0) {
    return <HistorySkeleton />;
  }

  if (isError && items.length === 0) {
    return (
      <Screen>
        <HistorySummaryHeader summary={{ workoutCount: 0, totalVolumeKg: 0, lastSessionLabel: null, streakDays: null }} hasMore={false} />
        <HistoryErrorState message={(error as Error).message} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen>
        <HistorySummaryHeader summary={summary} hasMore={false} />
        <HistoryEmptyState onStartWorkout={goHome} onRefresh={() => void refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.sessionId}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={<HistorySummaryHeader summary={summary} hasMore={Boolean(hasNextPage)} />}
        refreshControl={
          <RefreshControl tintColor={colors.primary} refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        renderItem={({ item, index }) => (
          <HistoryTimelineItem
            item={item}
            index={index}
            isLast={index === items.length - 1 && !hasNextPage && !isFetchingNextPage}
          />
        )}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
