import { useCallback } from 'react';
import { ScrollView, View, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { Screen, Text, Card, Button } from '../../design-system';
import { useActivePlanFull } from '../../hooks/use-active-plan-full';

export function PlanOverviewScreen() {
  const router = useRouter();
  const { data, isLoading, isError, error, isRefetching, refetch } = useActivePlanFull();

  const openDay = useCallback(
    (workoutDayId: string) => {
      router.push({ pathname: '/plan/[workoutDayId]', params: { workoutDayId } } as Href);
    },
    [router],
  );

  if (isLoading && !data) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#5BE3A1" />
          <Text tone="muted">Caricamento programma…</Text>
        </View>
      </Screen>
    );
  }

  if (isError && !data) {
    return (
      <Screen>
        <View className="gap-4 px-1 pt-2">
          <Pressable onPress={() => router.back()} className="self-start">
            <Text tone="accent">← Indietro</Text>
          </Pressable>
          <Text variant="subtitle">Impossibile caricare il piano</Text>
          <Text tone="muted">{(error as Error).message}</Text>
          <Button label="Riprova" onPress={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  if (!data || data.weeks.length === 0) {
    return (
      <Screen>
        <View className="gap-4 px-1 pt-2">
          <Pressable onPress={() => router.back()} className="self-start">
            <Text tone="accent">← Indietro</Text>
          </Pressable>
          <Text variant="subtitle">Nessun piano attivo</Text>
          <Text tone="muted">Genera un programma dall&apos;onboarding per vederlo qui.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32, gap: 16 }}
        refreshControl={
          <RefreshControl tintColor="#5BE3A1" refreshing={isRefetching} onRefresh={() => void refetch()} />
        }
      >
        <Pressable onPress={() => router.back()} className="self-start">
          <Text tone="accent">← Indietro</Text>
        </Pressable>

        <View>
          <Text variant="display">Il tuo piano</Text>
          <Text tone="muted">{data.name}</Text>
        </View>

        {data.weeks.map((week) => (
          <View key={week.weekNumber} className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text variant="subtitle">
                {week.name} · Sett. {week.weekNumber}
              </Text>
              {week.isDeload ? (
                <View className="rounded-pill bg-warning/20 px-3 py-1">
                  <Text variant="tiny" tone="primary">
                    DELOAD
                  </Text>
                </View>
              ) : null}
            </View>

            {week.days.map((day) => (
              <Pressable key={day.workoutDayId} onPress={() => openDay(day.workoutDayId)}>
                <Card elevated className="gap-1">
                  <Text variant="subtitle">{day.dayLabel}</Text>
                  <Text tone="muted">
                    {day.exerciseCount} {day.exerciseCount === 1 ? 'esercizio' : 'esercizi'} · ~
                    {day.estimatedDurationMin}&apos;
                  </Text>
                </Card>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
