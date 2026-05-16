import { useCallback, useEffect, useState } from 'react';
import { View, Switch, TextInput, Pressable, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen, Text, Button, Card, Stepper } from '../../design-system';
import { useAuthStore } from '../../stores/auth.store';
import { useSettingsStore } from '../../stores/settings.store';
import { useOnboardingStore } from '../onboarding/onboarding.store';
import { offlineQueue } from '../../lib/offline/queue';
import { api } from '../../lib/api/sdk';
import { invalidateWorkoutDataCaches, useProfile, useUpdateProfile } from '../../hooks/use-profile';
import type { ExperienceLevel, TrainingGoal, UserProfile } from '../../lib/api/contracts';
import {
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  TRAINING_GOAL_OPTIONS,
} from './profile-labels';

function syncProfileToOnboarding(profile: UserProfile): void {
  useOnboardingStore.setState({
    displayName: profile.displayName,
    trainingGoal: profile.trainingGoal,
    experienceLevel: profile.experienceLevel,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    sessionDurationMin: profile.sessionDurationMin,
    availableEquipment: profile.availableEquipment,
  });
}

function profileToPatch(form: UserProfile): Partial<UserProfile> {
  return {
    displayName: form.displayName.trim(),
    trainingGoal: form.trainingGoal,
    experienceLevel: form.experienceLevel,
    trainingDaysPerWeek: form.trainingDaysPerWeek,
    sessionDurationMin: form.sessionDurationMin,
    availableEquipment: form.availableEquipment,
  };
}

export function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const settings = useSettingsStore();
  const { data, isLoading, isError, error, isRefetching, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<UserProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(offlineQueue.list().length);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => offlineQueue.subscribe((q) => setPendingCount(q.length)), []);

  useEffect(() => {
    if (data) {
      setForm(data);
      syncProfileToOnboarding(data);
    }
  }, [data]);

  const toggleEquipment = useCallback((value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const has = prev.availableEquipment.includes(value);
      const availableEquipment = has
        ? prev.availableEquipment.filter((e) => e !== value)
        : [...prev.availableEquipment, value];
      if (availableEquipment.length === 0) return prev;
      return { ...prev, availableEquipment };
    });
  }, []);

  const saveProfile = useCallback(async () => {
    if (!form) return;
    setSaveMessage(null);
    try {
      const updated = await updateProfile.mutateAsync(profileToPatch(form));
      setForm(updated);
      syncProfileToOnboarding(updated);
      setSaveMessage('Profilo salvato.');
    } catch (err) {
      Alert.alert('Errore', (err as Error).message);
    }
  }, [form, updateProfile]);

  const regeneratePlan = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error('Profilo non caricato');
      syncProfileToOnboarding(form);
      const payload = useOnboardingStore.getState().asPlanInput();
      return api.plans.generate(payload, `regenerate:${Date.now()}`);
    },
    onSuccess: async () => {
      await invalidateWorkoutDataCaches(queryClient);
      Alert.alert('Piano aggiornato', 'Il nuovo programma è pronto.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)' as Href) },
      ]);
    },
    onError: (err) => Alert.alert('Errore', (err as Error).message),
  });

  if (isLoading && !form) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator color="#5BE3A1" />
          <Text tone="muted">Caricamento profilo…</Text>
        </View>
      </Screen>
    );
  }

  if (isError && !form) {
    return (
      <Screen>
        <View className="gap-4 px-1 pt-2">
          <Text variant="subtitle">Impossibile caricare il profilo</Text>
          <Text tone="muted">{(error as Error).message}</Text>
          <Button label="Riprova" onPress={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  if (!form) return null;

  return (
    <Screen
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl tintColor="#5BE3A1" refreshing={isRefetching} onRefresh={() => void refetch()} />
        ),
      }}
    >
      <View className="gap-6 pb-12">
        <View>
          <Text variant="display">Profilo</Text>
          <Text tone="muted">{user?.email}</Text>
        </View>

        <Card elevated className="gap-4">
          <Text variant="subtitle">Allenamento</Text>

          <View className="gap-2">
            <Text variant="caption" tone="muted">
              NOME
            </Text>
            <TextInput
              value={form.displayName}
              onChangeText={(displayName) => setForm((prev) => (prev ? { ...prev, displayName } : prev))}
              placeholder="Il tuo nome"
              placeholderTextColor="#6B7585"
              className="h-11 rounded-card bg-bg-elevated px-3 text-text-primary"
            />
          </View>

          <View className="gap-2">
            <Text variant="caption" tone="muted">
              OBIETTIVO
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {TRAINING_GOAL_OPTIONS.map((opt) => {
                const active = form.trainingGoal === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() =>
                      setForm((prev) => (prev ? { ...prev, trainingGoal: opt.value as TrainingGoal } : prev))
                    }
                    className={`rounded-pill px-3 py-2 ${active ? 'bg-accent' : 'bg-bg-elevated'}`}
                  >
                    <Text tone={active ? 'inverse' : 'secondary'} variant="caption">
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="caption" tone="muted">
              ESPERIENZA
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((opt) => {
                const active = form.experienceLevel === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() =>
                      setForm((prev) =>
                        prev ? { ...prev, experienceLevel: opt.value as ExperienceLevel } : prev,
                      )
                    }
                    className={`rounded-pill px-3 py-2 ${active ? 'bg-accent' : 'bg-bg-elevated'}`}
                  >
                    <Text tone={active ? 'inverse' : 'secondary'} variant="caption">
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text>Giorni a settimana</Text>
            <Stepper
              value={form.trainingDaysPerWeek}
              min={1}
              max={7}
              onChange={(trainingDaysPerWeek) =>
                setForm((prev) => (prev ? { ...prev, trainingDaysPerWeek } : prev))
              }
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Text>Durata sessione</Text>
            <Stepper
              value={form.sessionDurationMin}
              min={30}
              max={120}
              step={5}
              suffix="min"
              onChange={(sessionDurationMin) =>
                setForm((prev) => (prev ? { ...prev, sessionDurationMin } : prev))
              }
            />
          </View>

          <View className="gap-2">
            <Text variant="caption" tone="muted">
              ATTREZZATURA
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map((opt) => {
                const active = form.availableEquipment.includes(opt.value);
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => toggleEquipment(opt.value)}
                    className={`rounded-pill px-3 py-2 ${active ? 'bg-accent' : 'bg-bg-elevated'}`}
                  >
                    <Text tone={active ? 'inverse' : 'secondary'} variant="caption">
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button
            label="Salva modifiche"
            loading={updateProfile.isPending}
            onPress={() => void saveProfile()}
          />
          {saveMessage ? (
            <Text tone="accent" variant="caption">
              {saveMessage}
            </Text>
          ) : null}
        </Card>

        <Card className="gap-3">
          <Text variant="subtitle">Programma</Text>
          <Text tone="muted">
            Rigenera il piano con le preferenze aggiornate. La generazione può richiedere circa 20–60
            secondi.
          </Text>
          <Button
            label="Rigenera piano"
            variant="secondary"
            loading={regeneratePlan.isPending}
            onPress={() => {
              Alert.alert(
                'Rigenera piano',
                'Vuoi sostituire il programma attuale? Prima salva le modifiche al profilo se non l\'hai già fatto.',
                [
                  { text: 'Annulla' },
                  {
                    text: 'Rigenera',
                    onPress: () => void regeneratePlan.mutateAsync(),
                  },
                ],
              );
            }}
          />
        </Card>

        <Card elevated className="gap-4">
          <Text variant="subtitle">Impostazioni app</Text>
          <View className="flex-row items-center justify-between">
            <Text>Vibrazioni</Text>
            <Switch value={settings.hapticsEnabled} onValueChange={settings.setHapticsEnabled} />
          </View>
          <View className="flex-row items-center justify-between">
            <Text>Schermo sempre acceso</Text>
            <Switch value={settings.keepScreenOn} onValueChange={settings.setKeepScreenOn} />
          </View>
          <View className="flex-row items-center justify-between">
            <Text>Notifiche</Text>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={settings.setNotificationsEnabled}
            />
          </View>
        </Card>

        <Card>
          <Text variant="subtitle">Sincronizzazione</Text>
          <Text tone="muted">
            {pendingCount > 0
              ? `${pendingCount} operazione/i in coda offline`
              : 'Tutto sincronizzato'}
          </Text>
        </Card>

        <Button label="Esci" variant="danger" onPress={() => void signOut()} />
      </View>
    </Screen>
  );
}
