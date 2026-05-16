import { useEffect, useMemo, useState } from 'react';

import { View, ScrollView, Pressable, Alert } from 'react-native';

import { useRouter } from 'expo-router';

import { useKeepAwake } from 'expo-keep-awake';

import { useQuery } from '@tanstack/react-query';

import { Screen, Text, Button, Card } from '../../design-system';

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

  const keepAwake = useSettingsStore((s) => s.keepScreenOn);

  useKeepAwake(keepAwake ? 'workout-session' : undefined);



  const sessionStatus = useWorkoutSessionStore((s) => s.status);

  const exercises = useWorkoutSessionStore((s) => s.exercises);

  const startedAt = useWorkoutSessionStore((s) => s.startedAt);

  const totalPausedMs = useWorkoutSessionStore((s) => s.totalPausedMs);

  const restEndsAt = useWorkoutSessionStore((s) => s.restEndsAt);

  const session = useWorkoutSessionStore();

  const adherence = useWorkoutSessionStore((s) => workoutSelectors.adherenceScore(s));

  const trainingGoal = useOnboardingStore((s) => s.trainingGoal);

  const experienceLevel = useOnboardingStore((s) => s.experienceLevel);

  const [confirming, setConfirming] = useState(false);



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



  const elapsedSec = useMemo(() => {

    if (!startedAt) return 0;

    return Math.floor((Date.now() - Date.parse(startedAt) - totalPausedMs) / 1000);

  }, [startedAt, totalPausedMs]);



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



    const completedSets = workoutSelectors.completedSetCount(useWorkoutSessionStore.getState());

    if (completedSets === 0) {

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

      adherenceScore: adherence,

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



  if (todaysWorkout.isLoading) {

    return (

      <Screen>

        <View className="flex-1 items-center justify-center gap-3">

          <Text variant="title">Preparo la sessione…</Text>

          <Text tone="muted">Caricamento del programma di oggi.</Text>

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

        <View className="flex-1 items-center justify-center gap-3">

          <Text variant="title">Preparo la sessione…</Text>

          <Text tone="muted">Caricamento esercizi…</Text>

        </View>

      </Screen>

    );

  }



  const dayLabel = todaysWorkout.data.dayLabel;



  return (

    <Screen>

      <View className="flex-row items-center justify-between pb-3">

        <View>

          <Text variant="caption" tone="muted">

            {dayLabel.toUpperCase()} · SETT. {todaysWorkout.data.weekNumber}

          </Text>

          <Text variant="title">

            {Math.floor(elapsedSec / 60)}{'\''} {elapsedSec % 60}{'\"'}

          </Text>

        </View>

        <View className="flex-row gap-2">

          <Pressable

            onPress={() => (session.status === 'paused' ? session.resume() : session.pause())}

            className="rounded-pill bg-bg-elevated px-4 py-2"

          >

            <Text variant="caption">{session.status === 'paused' ? '▶' : '❚❚'}</Text>

          </Pressable>

          <Pressable

            onPress={() =>

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

            className="rounded-pill bg-bg-elevated px-4 py-2"

          >

            <Text tone="danger" variant="caption">

              ✕

            </Text>

          </Pressable>

        </View>

      </View>



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

        contentContainerStyle={{ paddingTop: 12, paddingBottom: 120, gap: 12 }}

      >

        {exercises.map((exercise) => (

          <ExerciseCard

            key={exercise.id}

            exercise={exercise}

            onToggle={() => session.toggleExerciseExpanded(exercise.id)}

            onAddSet={() => session.addSetTo(exercise.id)}

            onUpdateSet={(setIndex, patch) => session.updateSet(exercise.id, setIndex, patch)}

            onCompleteSet={(setIndex) => handleCompleteSet(exercise.id, setIndex)}

          />

        ))}



        {confirming ? (

          <Card elevated>

            <FinishSheet onConfirm={handleConfirmFinish} loading={completeWorkout.isPending} />

          </Card>

        ) : null}

      </ScrollView>



      <View className="absolute inset-x-5 bottom-6">

        <Button

          label={confirming ? 'Chiudi pannello' : 'Completa allenamento'}

          variant={confirming ? 'secondary' : 'primary'}

          onPress={() => setConfirming((prev) => !prev)}

        />

      </View>

    </Screen>

  );

}


