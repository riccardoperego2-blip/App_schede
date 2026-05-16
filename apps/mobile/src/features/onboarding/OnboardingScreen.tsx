import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen, Text, Button, Card, Stepper } from '../../design-system';
import { useOnboardingStore } from './onboarding.store';
import { useAuthStore } from '../../stores/auth.store';
import { api } from '../../lib/api/sdk';
import { qk } from '../../lib/api/query-keys';

const STEPS = ['Saluto', 'Obiettivo', 'Esperienza', 'Disponibilità', 'Equipaggiamento', 'Riepilogo'] as const;

function StepIndicator({ current }: { current: number }) {
  return (
    <View className="flex-row gap-1">
      {STEPS.map((_, i) => (
        <View
          key={i}
          className={`h-1 flex-1 rounded-full ${i <= current ? 'bg-accent' : 'bg-bg-elevated'}`}
        />
      ))}
    </View>
  );
}

function GoalChip({ label, value, current, onPress }: { label: string; value: string; current: string; onPress: () => void }) {
  const active = value === current;
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-card p-4 ${active ? 'bg-accent' : 'bg-bg-elevated'}`}
    >
      <Text tone={active ? 'inverse' : 'primary'} variant="body" className="text-center font-semibold">
        {label}
      </Text>
    </Pressable>
  );
}

export function OnboardingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const state = useOnboardingStore();
  const markOnboarded = useAuthStore((s) => s.markOnboarded);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useMutation({
    mutationFn: () => {
      const data = state.asPlanInput();
      return api.plans.generate(data, `onboarding:${Date.now()}`);
    },
    onSuccess: async () => {
      markOnboarded();
      try {
        await api.profile.update({
          displayName: state.displayName.trim() || 'Atleta',
          trainingGoal: state.trainingGoal,
          experienceLevel: state.experienceLevel,
          trainingDaysPerWeek: state.trainingDaysPerWeek,
          sessionDurationMin: state.sessionDurationMin,
          availableEquipment: state.availableEquipment,
        });
      } catch {
        // profile prefs are optional; plan generation already succeeded
      }
      try {
        const active = await api.plans.active();
        queryClient.setQueryData(qk.plans.active(), active);
      } catch {
        // generate succeeded; dashboard refetch still runs below
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.profile() }),
        queryClient.invalidateQueries({ queryKey: qk.dashboard() }),
        queryClient.invalidateQueries({ queryKey: qk.workouts.todays() }),
        queryClient.invalidateQueries({ queryKey: qk.plans.activeFull() }),
      ]);
      router.replace('/(tabs)');
    },
    onError: (err) => setError((err as Error).message),
  });

  const renderStep = () => {
    switch (state.stepIndex) {
      case 0:
        return (
          <Card className="gap-4">
            <Text variant="title">Come ti chiami?</Text>
            <Text tone="muted">Personalizziamo la tua esperienza.</Text>
          </Card>
        );
      case 1:
        return (
          <Card className="gap-4">
            <Text variant="title">Qual è il tuo obiettivo?</Text>
            <View className="gap-2">
              <View className="flex-row gap-2">
                <GoalChip
                  label="Forza"
                  value="strength"
                  current={state.trainingGoal}
                  onPress={() => state.setField('trainingGoal', 'strength')}
                />
                <GoalChip
                  label="Ipertrofia"
                  value="hypertrophy"
                  current={state.trainingGoal}
                  onPress={() => state.setField('trainingGoal', 'hypertrophy')}
                />
              </View>
              <View className="flex-row gap-2">
                <GoalChip
                  label="Dimagrimento"
                  value="fat_loss"
                  current={state.trainingGoal}
                  onPress={() => state.setField('trainingGoal', 'fat_loss')}
                />
                <GoalChip
                  label="Generale"
                  value="general"
                  current={state.trainingGoal}
                  onPress={() => state.setField('trainingGoal', 'general')}
                />
              </View>
            </View>
          </Card>
        );
      case 2:
        return (
          <Card className="gap-4">
            <Text variant="title">Esperienza</Text>
            <View className="flex-row gap-2">
              {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                <GoalChip
                  key={lvl}
                  label={lvl === 'beginner' ? 'Principiante' : lvl === 'intermediate' ? 'Intermedio' : 'Avanzato'}
                  value={lvl}
                  current={state.experienceLevel}
                  onPress={() => state.setField('experienceLevel', lvl)}
                />
              ))}
            </View>
          </Card>
        );
      case 3:
        return (
          <Card className="gap-6">
            <View className="gap-2">
              <Text variant="title">Giorni a settimana</Text>
              <Stepper
                value={state.trainingDaysPerWeek}
                min={2}
                max={6}
                onChange={(v) => state.setField('trainingDaysPerWeek', v)}
                suffix="giorni"
              />
            </View>
            <View className="gap-2">
              <Text variant="title">Durata sessione</Text>
              <Stepper
                value={state.sessionDurationMin}
                min={30}
                max={120}
                step={5}
                onChange={(v) => state.setField('sessionDurationMin', v)}
                suffix="min"
              />
            </View>
          </Card>
        );
      case 4:
        return (
          <Card className="gap-3">
            <Text variant="title">Attrezzatura disponibile</Text>
            <Text tone="muted">Selezione predefinita per palestra completa. Personalizza più tardi.</Text>
          </Card>
        );
      case 5:
        return (
          <Card className="gap-3">
            <Text variant="title">Pronto</Text>
            <Text tone="muted">
              Generiamo il tuo programma {state.trainingDaysPerWeek}× a settimana, {state.sessionDurationMin}{'\''} ciascuna.
            </Text>
            {error ? (
              <Text tone="danger" variant="caption">
                {error}
              </Text>
            ) : null}
          </Card>
        );
      default:
        return null;
    }
  };

  const isLast = state.stepIndex === STEPS.length - 1;

  return (
    <Screen scroll>
      <View className="gap-6 pt-4">
        <StepIndicator current={state.stepIndex} />
        <Text variant="caption" tone="muted">
          {STEPS[state.stepIndex]}
        </Text>
        {renderStep()}
        <View className="flex-row gap-3">
          {state.stepIndex > 0 ? (
            <Button label="Indietro" variant="secondary" onPress={state.prev} fullWidth={false} />
          ) : null}
          <View className="flex-1">
            <Button
              label={isLast ? 'Genera programma' : 'Continua'}
              loading={generatePlan.isPending}
              onPress={() => (isLast ? generatePlan.mutate() : state.next())}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
