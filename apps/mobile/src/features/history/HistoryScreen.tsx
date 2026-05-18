import { useCallback } from 'react';
import { FlatList, View, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, Text, Card, Button } from '../../design-system';
import { useWorkoutHistory } from '../../hooks/use-history';
import { formatHistoryDate, formatHistoryVolume } from '../../lib/api/mappers/workout-history';

function readinessLabel(band: 'green' | 'yellow' | 'red'): string {
  if (band === 'yellow') return 'Attenzione';
  if (band === 'red') return 'Riposo';
  return 'Pronto';
}

function HistoryHeader({ count }: { count?: number }) {
  return (
    <Card elevated accent className="mb-5 gap-2">
      <Text variant="caption" tone="muted">
        LOG ALLENAMENTI
      </Text>
      <Text variant="display">Storico</Text>
      <Text tone="secondary">{count == null ? 'Tutte le tue sessioni completate.' : `${count} sessioni caricate`}</Text>
    </Card>
  );
}

export function HistoryScreen() {
  const { data, isLoading, isError, error, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useWorkoutHistory();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const items = data?.pages.flatMap((p) => p.items) ?? [];

  if (isLoading && items.length === 0) {
    return (
      <Screen>
        <HistoryHeader />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#22C55E" />
          <Text tone="muted" className="mt-3">
            Caricamento storico…
          </Text>
        </View>
      </Screen>
    );
  }

  if (isError && items.length === 0) {
    return (
      <Screen>
        <HistoryHeader />
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="subtitle">Impossibile caricare lo storico</Text>
          <Text tone="muted" className="text-center">
            {(error as Error).message}
          </Text>
          <Button label="Riprova" onPress={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen>
        <HistoryHeader />
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Text variant="subtitle">Ancora nessuna sessione</Text>
          <Text tone="muted" className="text-center">
            Completa il primo allenamento dalla Home per vederlo qui.
          </Text>
          <Button label="Aggiorna" variant="secondary" onPress={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(item) => item.sessionId}
        contentContainerStyle={{ paddingBottom: 32, gap: 14 }}
        ListHeaderComponent={<HistoryHeader count={items.length} />}
        refreshControl={
          <RefreshControl tintColor="#22C55E" refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        renderItem={({ item }) => {
          const dateLabel = formatHistoryDate(item.completedAt);
          return (
            <Card elevated className="gap-3">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text variant="subtitle">{item.dayLabel}</Text>
                  {dateLabel ? (
                    <Text variant="caption" tone="muted">
                      {dateLabel}
                    </Text>
                  ) : null}
                </View>
                <View className="rounded-pill border border-border-soft bg-bg-glass px-3 py-1">
                  <Text variant="tiny" tone="muted">
                    {readinessLabel(item.readiness).toUpperCase()}
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap gap-2">
                <View className="rounded-pill bg-bg-glass px-3 py-1">
                  <Text variant="caption" tone="secondary">{item.durationMinutes} min</Text>
                </View>
                <View className="rounded-pill bg-bg-glass px-3 py-1">
                  <Text variant="caption" tone="secondary">
                    {item.exerciseCount} {item.exerciseCount === 1 ? 'esercizio' : 'esercizi'}
                  </Text>
                </View>
                <View className="rounded-pill bg-bg-glass px-3 py-1">
                  <Text variant="caption" tone="secondary">{formatHistoryVolume(item.volumeKg)}</Text>
                </View>
                {item.prCount > 0 ? (
                  <View className="rounded-pill bg-accent-subtle px-3 py-1">
                    <Text variant="caption" tone="accent">{item.prCount} PR</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          );
        }}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color="#22C55E" />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}


