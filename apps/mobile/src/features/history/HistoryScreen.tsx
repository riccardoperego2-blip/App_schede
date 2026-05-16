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

        <View className="pb-3">

          <Text variant="display">Storico</Text>

          <Text tone="muted">Tutte le tue sessioni completate.</Text>

        </View>

        <View className="flex-1 items-center justify-center">

          <ActivityIndicator color="#5BE3A1" />

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

        <View className="pb-3">

          <Text variant="display">Storico</Text>

          <Text tone="muted">Tutte le tue sessioni completate.</Text>

        </View>

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

        <View className="pb-3">

          <Text variant="display">Storico</Text>

          <Text tone="muted">Tutte le tue sessioni completate.</Text>

        </View>

        <View className="flex-1 items-center justify-center gap-2 px-6">

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

      <View className="pb-3">

        <Text variant="display">Storico</Text>

        <Text tone="muted">{items.length} sessioni caricate</Text>

      </View>



      <FlatList

        data={items}

        keyExtractor={(item) => item.sessionId}

        contentContainerStyle={{ paddingBottom: 32, gap: 12 }}

        refreshControl={

          <RefreshControl tintColor="#5BE3A1" refreshing={isRefetching} onRefresh={() => void refetch()} />

        }

        onEndReachedThreshold={0.4}

        onEndReached={() => {

          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();

        }}

        renderItem={({ item }) => {

          const dateLabel = formatHistoryDate(item.completedAt);

          return (

            <Card elevated className="gap-2">

              <View className="flex-row items-start justify-between gap-3">

                <View className="flex-1 gap-1">

                  <Text variant="subtitle">{item.dayLabel}</Text>

                  {dateLabel ? (

                    <Text variant="caption" tone="muted">

                      {dateLabel}

                    </Text>

                  ) : null}

                </View>

                <View className="rounded-pill bg-bg-elevated px-3 py-1">

                  <Text variant="tiny" tone="muted">

                    {readinessLabel(item.readiness).toUpperCase()}

                  </Text>

                </View>

              </View>

              <View className="flex-row flex-wrap gap-x-4 gap-y-1">

                <Text tone="muted">{item.durationMinutes} min</Text>

                <Text tone="muted">

                  {item.exerciseCount} {item.exerciseCount === 1 ? 'esercizio' : 'esercizi'}

                </Text>

                <Text tone="muted">{formatHistoryVolume(item.volumeKg)}</Text>

                {item.prCount > 0 ? <Text tone="accent">{item.prCount} PR</Text> : null}

              </View>

            </Card>

          );

        }}

        ListFooterComponent={

          isFetchingNextPage ? (

            <View className="py-4">

              <ActivityIndicator color="#5BE3A1" />

            </View>

          ) : null

        }

      />

    </Screen>

  );

}


