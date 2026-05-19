import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Screen,
  Text,
  Button,
  PremiumButton,
  PremiumCard,
  FadeInSection,
  PulsePlaceholder,
} from '../../design-system';
import { api } from '../../lib/api/sdk';
import { qk } from '../../lib/api/query-keys';
import {
  useWorkoutSessionStore,
  workoutSelectors,
} from '../../stores/workout-session.store';
import { useSettingsStore } from '../../stores/settings.store';
import { useOnboardingStore } from '../onboarding/onboarding.store';
import { ExerciseCard } from './components/ExerciseCard';
import { RestTimer } from './components/RestTimer';
import { FinishSheet } from './components/FinishSheet';
import { SessionHeader } from './components/SessionHeader';
import { useSessionElapsed } from './hooks/use-session-elapsed';
import { useCompleteWorkout } from '../../hooks/use-complete-workout';
import type { CompleteWorkoutPayload, ProgressionModel } from '../../lib/api/contracts';

function progressionForGoal(goal: CompleteWorkoutPayload['trainingGoal']): ProgressionModel {
  switch (goal) {
    case 'strength':
      return 'top_set_rpe_autoregulation';
    case 'fat_loss':
    case 'general':
    case 'rehab':
      return 'maintenance_volume';
    default:
      return 'double_progression_reps_then_load';
  }
}

export function WorkoutSessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keepAwake = useSettingsStore((s) => s.keepScreenOn);
  useKeepAwake(keepAwake ? 'workout-session' : undefined);

  const sessionStatus = useWorkoutSessionStore((s) => s.status);
  const exercises = useWorkoutSessionStore((s) => s.exercises);
  const startedAt = useWorkoutSessionStore((s) => s.startedAt);
  const totalPausedMs = useWorkoutSessionStore((s) => s.totalPausedMs);
  const restEndsAt = useWorkoutSessionStore((s) => s.restEndsAt);
  const session = useWorkoutSessionStore();
  const trainingGoal = useOnboardingStore((s) => s.trainingGoal);
  const experienceLevel = useOnboardingStore((s) => s.experienceLevel);
  const [confirming, setConfirming] = useState(false);

  const completedSets = useMemo(
    () => workoutSelectors.completedSetCount(useWorkoutSessionStore.getState()),
    [exercises],
  );
  const plannedSets = useMemo(
    () => workoutSelectors.plannedSetCount(useWorkoutSessionStore.getState()),
    [exercises],
  );
  const totalVolumeKg = useMemo(
    () => workoutSelectors.totalVolumeKg(useWorkoutSessionStore.getState()),
    [exercises],
  );

  const sessionActive =
    sessionStatus === 'running' || sessionStatus === 'paused' || sessionStatus === 'resting';
  const elapsedSec = useSessionElapsed(startedAt, totalPausedMs, sessionActive);

  const todaysWorkout = useQuery({
    queryKey: qk.workouts.todays(),
    queryFn: () => api.workouts.todays(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!todaysWorkout.data) return;

    const state = useWorkoutSessionStore.getState();
    if (state.status === 'completed') {
      state.cancel();
    }

    const canResume =
      state.workoutDayId === todaysWorkout.data.workoutDayId &&
      state.status !== 'idle' &&
      state.exercises.length > 0;

    if (!canResume) {
      if (state.status !== 'idle' && state.workoutDayId !== todaysWorkout.data.workoutDayId) {
        state.cancel();
      }
      useWorkoutSessionStore.getState().start('latest', todaysWorkout.data);
    }
  }, [todaysWorkout.data]);

  const completeWorkout = useCompleteWorkout();

  const handleCompleteSet = (exerciseId: string, setIndex: number) => {
    const exercise = session.exercises.find((e) => e.id === exerciseId);
    if (!exercise) return;
    const set = exercise.sets.find((s) => s.setIndex === setIndex);
    if (!set || set.completed) return;

    const reps = set.completedReps > 0 ? set.completedReps : set.targetRepsMax;
    session.completeSet(exerciseId, setIndex, {
      reps,
      loadKg: set.loadKg,
      ...(set.actualRpe != null ? { rpe: set.actualRpe } : {}),
    });
    session.startRest(exercise.restSeconds);
  };

  const handleConfirmFinish = async () => {
    if (!session.workoutDayId) return;

    const completedCount = workoutSelectors.completedSetCount(useWorkoutSessionStore.getState());
    if (completedCount === 0) {
      Alert.alert('Nessuna serie completata', 'Segna almeno una serie prima di chiudere la sessione.');
      return;
    }

    const payload: CompleteWorkoutPayload = {
      workoutDayId: session.workoutDayId,
      completedAt: new Date().toISOString(),
      durationMinutes: Math.max(1, Math.round(elapsedSec / 60)),
      ...(session.wellness.sessionRpe != null ? { sessionRpe: session.wellness.sessionRpe } : {}),
      exerciseLogs: workoutSelectors.toExerciseLogs(useWorkoutSessionStore.getState()),
      sleepQuality: session.wellness.sleepQuality,
      soreness: session.wellness.soreness,
      fatigueLevel: session.wellness.fatigueLevel,
      adherenceScore: workoutSelectors.adherenceScore(useWorkoutSessionStore.getState()),
      trainingGoal,
      experienceLevel,
      progressionModel: progressionForGoal(trainingGoal),
    };

    try {
      const result = await completeWorkout.mutateAsync(payload);
      session.finish();
      session.cancel();
      if (result.status === 'queued') {
        Alert.alert('Salvato offline', 'La sessione verrà sincronizzata appena torni online.');
      }
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Errore', (error as Error).message);
    }
  };

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 20 : 12);

  if (todaysWorkout.isLoading) {
    return (
      <Screen>
        <View className="gap-4 px-1 pt-2">
          <PremiumCard variant="ambient" className="gap-3 p-5">
            <PulsePlaceholder className="h-6 w-40" />
            <PulsePlaceholder className="h-10 w-28" />
          </PremiumCard>
          <Text tone="muted" className="text-center">
            Preparo la sessione…
          </Text>
        </View>
      </Screen>
    );
  }

  if (todaysWorkout.isError) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="title">Errore di caricamento</Text>
          <Text tone="muted" className="text-center">
            {(todaysWorkout.error as Error).message}
          </Text>
          <Button label="Riprova" onPress={() => void todaysWorkout.refetch()} />
          <Button label="Torna alla Home" variant="secondary" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Screen>
    );
  }

  if (!todaysWorkout.data) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="title">Nessun allenamento oggi</Text>
          <Text tone="muted" className="text-center">
            Non c&apos;è un workout programmato per oggi nel piano attivo.
          </Text>
          <Button label="Torna alla Home" onPress={() => router.replace('/(tabs)')} />
        </View>
      </Screen>
    );
  }

  if (sessionStatus === 'idle' || !exercises.length) {
    return (
      <Screen>
        <View className="gap-4 px-1 pt-2">
          <PremiumCard variant="glass" className="gap-3 p-5">
            <PulsePlaceholder className="h-6 w-48" />
            <PulsePlaceholder className="h-24 w-full" />
          </PremiumCard>
          <Text tone="muted" className="text-center">
            Caricamento esercizi…
          </Text>
        </View>
      </Screen>
    );
  }

  const dayLabel = todaysWorkout.data.dayLabel;

  return (
    <Screen className="flex-1" edges={['top']}>
      <View className="flex-1 px-5 pt-2">
        <FadeInSection delay={0}>
          <SessionHeader
            dayLabel={dayLabel}
            weekNumber={todaysWorkout.data.weekNumber}
            elapsedSec={elapsedSec}
            completedSets={completedSets}
            plannedSets={plannedSets}
            totalVolumeKg={totalVolumeKg}
            isPaused={session.status === 'paused'}
            onTogglePause={() => (session.status === 'paused' ? session.resume() : session.pause())}
            onCancel={() =>
              Alert.alert('Annulla sessione', 'Le serie inserite verranno perse.', [
                { text: 'No' },
                {
                  text: 'Sì',
                  style: 'destructive',
                  onPress: () => {
                    session.cancel();
                    router.replace('/(tabs)');
                  },
                },
              ])
            }
          />
        </FadeInSection>

        <RestTimer
          restEndsAt={restEndsAt}
          onAdd={(s) =>
            session.startRest(
              Math.ceil((Date.parse(session.restEndsAt ?? new Date().toISOString()) - Date.now()) / 1000) + s,
            )
          }
          onSkip={() => session.clearRest()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad + 96, gap: 12 }}
        >
          {exercises.map((exercise, index) => (
            <FadeInSection key={exercise.id} delay={40 + index * 25}>
              <ExerciseCard
                exercise={exercise}
                onToggle={() => session.toggleExerciseExpanded(exercise.id)}
                onAddSet={() => session.addSetTo(exercise.id)}
                onUpdateSet={(setIndex, patch) => session.updateSet(exercise.id, setIndex, patch)}
                onCompleteSet={(setIndex) => handleCompleteSet(exercise.id, setIndex)}
              />
            </FadeInSection>
          ))}

          {confirming ? (
            <FadeInSection delay={0}>
              <PremiumCard variant="elevated" className="p-4">
                <FinishSheet onConfirm={handleConfirmFinish} loading={completeWorkout.isPending} />
              </PremiumCard>
            </FadeInSection>
          ) : null}
        </ScrollView>

        <View
          className="absolute inset-x-5 border-t border-border-soft bg-bg-primary/95 pt-3"
          style={{ bottom: 0, paddingBottom: bottomPad }}
        >
          <PremiumButton
            label={confirming ? 'Chiudi pannello' : 'Completa workout'}
            variant={confirming ? 'secondary' : 'primary'}
            haptic
            onPress={() => setConfirming((prev) => !prev)}
          />
        </View>
      </View>
    </Screen>
  );
}
