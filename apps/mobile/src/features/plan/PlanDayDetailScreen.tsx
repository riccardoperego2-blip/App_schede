import { ScrollView, View, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen, Text, Card, Button } from '../../design-system';
import { api } from '../../lib/api/sdk';
import { qk } from '../../lib/api/query-keys';

export function PlanDayDetailScreen() {
  const router = useRouter();
  const { workoutDayId } = useLocalSearchParams<{ workoutDayId: string }>();
  const id = typeof workoutDayId === 'string' ? workoutDayId : '';

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.workouts.byDay(id),
    queryFn: () => api.workouts.byDay(id),
    enabled: id.length > 0,
  });

  if (!id) {
    return (
      <Screen>
        <Text tone="muted">Giorno non valido.</Text>
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#5BE3A1" />
          <Text tone="muted">Caricamento workout…</Text>
        </View>
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen>
        <View className="gap-4">
          <Pressable onPress={() => router.back()} className="self-start">
            <Text tone="accent">← Indietro</Text>
          </Pressable>
          <Text variant="subtitle">Errore</Text>
          <Text tone="muted">{(error as Error)?.message ?? 'Workout non trovato'}</Text>
          <Button label="Riprova" onPress={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32, gap: 12 }}>
        <Pressable onPress={() => router.back()} className="self-start">
          <Text tone="accent">← Indietro</Text>
        </Pressable>

        <View>
          <Text variant="caption" tone="muted">
            SETTIMANA {data.weekNumber}
            {data.isDeload ? ' · DELOAD' : ''}
          </Text>
          <Text variant="display">{data.dayLabel}</Text>
          <Text tone="muted">
            {data.exercises.length} {data.exercises.length === 1 ? 'esercizio' : 'esercizi'}
          </Text>
        </View>

        {data.exercises.map((exercise) => (
          <Card key={exercise.id} elevated className="gap-2">
            <Text variant="subtitle">{exercise.name}</Text>
            <Text tone="muted" variant="caption">
              {exercise.primaryMuscle} · rest {exercise.restSeconds}s
            </Text>
            {exercise.sets.map((set) => {
              const intensity =
                set.targetRpe != null
                  ? `RPE ${set.targetRpe}`
                  : set.targetRir != null
                    ? `RIR ${set.targetRir}`
                    : null;
              return (
                <View
                  key={set.setIndex}
                  className="flex-row items-center justify-between rounded-card bg-bg-surface p-3"
                >
                  <Text variant="caption">Serie {set.setIndex}</Text>
                  <Text tone="muted">
                    {set.targetRepsMin}–{set.targetRepsMax} reps
                    {intensity ? ` · ${intensity}` : ''} · {set.restSeconds}s
                  </Text>
                </View>
              );
            })}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
