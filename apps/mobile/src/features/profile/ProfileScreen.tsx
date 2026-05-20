import { useCallback, useEffect, useState } from 'react';
import { View, Switch, TextInput, Pressable, RefreshControl, Alert } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Screen,
  Text,
  Button,
  Stepper,
  PremiumCard,
  SectionHeader,
  StatPill,
  AnimatedProgressBar,
  FadeInSection,
  PulsePlaceholder,
  PremiumButton,
} from '../../design-system';
import { colors } from '../../theme';
import { useAuthStore } from '../../stores/auth.store';
import { useSettingsStore } from '../../stores/settings.store';
import { useOnboardingStore } from '../onboarding/onboarding.store';
import { offlineQueue } from '../../lib/offline/queue';
import { api } from '../../lib/api/sdk';
import { ApiError } from '../../lib/api/errors';
import { cancelWorkoutReminder, scheduleDailyWorkoutReminder } from '../../lib/notifications/workout-reminders';
import { invalidateWorkoutDataCaches, useProfile, useUpdateProfile } from '../../hooks/use-profile';
import { useI18n } from '../../i18n/use-i18n';
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

function formatReminderTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function experienceProgress(level: ExperienceLevel): number {
  if (level === 'advanced') return 100;
  if (level === 'intermediate') return 62;
  return 34;
}

function formatRegeneratePlanError(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError && err.kind === 'timeout') {
    return t('profile.regenerateTimeout');
  }
  if (err instanceof Error && err.message && err.message !== 'Request timed out') {
    return err.message;
  }
  return t('profile.regenerateError');
}

export function ProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t, language, setLanguage } = useI18n();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const settings = useSettingsStore();
  const { data, isLoading, isError, error, isRefetching, refetch } = useProfile();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState<UserProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(offlineQueue.list().length);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);

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
      setSaveMessage(t('profile.saved'));
    } catch (err) {
      Alert.alert(t('common.error'), (err as Error).message);
    }
  }, [form, updateProfile, t]);

  const regeneratePlan = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error(t('profile.profileNotLoaded'));
      syncProfileToOnboarding(form);
      const payload = useOnboardingStore.getState().asPlanInput();
      return api.plans.generate(payload, `regenerate:${Date.now()}`);
    },
    onMutate: () => {
      setRegenerateError(null);
    },
    onSuccess: async () => {
      await invalidateWorkoutDataCaches(queryClient);
      Alert.alert(t('profile.regenerateSuccessTitle'), t('profile.regenerateSuccessBody'), [
        { text: 'OK', onPress: () => router.replace('/(tabs)' as Href) },
      ]);
    },
    onError: (err) => {
      setRegenerateError(formatRegeneratePlanError(err, t));
    },
  });

  const toggleWorkoutReminder = useCallback(
    async (enabled: boolean) => {
      setReminderBusy(true);
      try {
        if (!enabled) {
          await cancelWorkoutReminder(settings.workoutReminderNotificationId);
          settings.setWorkoutReminder({
            workoutReminderEnabled: false,
            workoutReminderNotificationId: null,
          });
          return;
        }

        const result = await scheduleDailyWorkoutReminder({
          hour: settings.workoutReminderHour,
          minute: settings.workoutReminderMinute,
          previousNotificationId: settings.workoutReminderNotificationId,
        });
        if (!result.granted) {
          settings.setWorkoutReminder({
            workoutReminderEnabled: false,
            workoutReminderNotificationId: null,
          });
          Alert.alert(
            'Permesso notifiche richiesto',
            'Abilita le notifiche dalle impostazioni del telefono per ricevere il promemoria.',
          );
          return;
        }

        settings.setWorkoutReminder({
          workoutReminderEnabled: true,
          workoutReminderNotificationId: result.notificationId,
        });
      } catch (err) {
        Alert.alert('Errore notifiche', (err as Error).message);
      } finally {
        setReminderBusy(false);
      }
    },
    [settings],
  );

  const updateWorkoutReminderTime = useCallback(
    async (patch: { hour?: number; minute?: number }) => {
      const hour = patch.hour ?? settings.workoutReminderHour;
      const minute = patch.minute ?? settings.workoutReminderMinute;
      settings.setWorkoutReminder({ workoutReminderHour: hour, workoutReminderMinute: minute });

      if (!settings.workoutReminderEnabled) return;

      setReminderBusy(true);
      try {
        const result = await scheduleDailyWorkoutReminder({
          hour,
          minute,
          previousNotificationId: settings.workoutReminderNotificationId,
        });
        if (!result.granted) {
          settings.setWorkoutReminder({
            workoutReminderEnabled: false,
            workoutReminderNotificationId: null,
          });
          Alert.alert('Permesso notifiche richiesto', 'Il promemoria è stato disattivato.');
          return;
        }
        settings.setWorkoutReminder({ workoutReminderNotificationId: result.notificationId });
      } catch (err) {
        Alert.alert('Errore notifiche', (err as Error).message);
      } finally {
        setReminderBusy(false);
      }
    },
    [settings],
  );

  if (isLoading && !form) {
    return (
      <Screen>
        <View className="gap-5 px-1 pt-2">
          <PremiumCard variant="ambient" className="gap-4 p-6">
            <PulsePlaceholder className="h-20 w-20 rounded-full" />
            <PulsePlaceholder className="h-8 w-40" />
            <PulsePlaceholder className="h-4 w-56" />
          </PremiumCard>
          <PremiumCard variant="glass" className="gap-3 p-5">
            <PulsePlaceholder className="h-4 w-32" />
            <PulsePlaceholder className="h-2.5 w-full" />
          </PremiumCard>
          <Text tone="muted" className="text-center">
            {t('profile.loading')}
          </Text>
        </View>
      </Screen>
    );
  }

  if (isError && !form) {
    return (
      <Screen>
        <View className="gap-4 px-1 pt-2">
          <Text variant="subtitle">{t('profile.loadError')}</Text>
          <Text tone="muted">{(error as Error).message}</Text>
          <Button label={t('common.retry')} onPress={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  if (!form) return null;
  const displayName = form.displayName.trim() || t('profile.athlete');
  const initial = displayName.charAt(0).toUpperCase();
  const expPct = experienceProgress(form.experienceLevel);

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
        <FadeInSection delay={0}>
        <PremiumCard variant="ambient" className="gap-5 p-6">
          <View className="flex-row items-center gap-4">
            <View
              className="h-20 w-20 items-center justify-center rounded-full border"
              style={{ borderColor: 'rgba(255,255,255,0.10)', backgroundColor: colors.surface }}
            >
              <Text variant="title" tone="accent">
                {initial}
              </Text>
            </View>
            <View className="flex-1">
              <Text variant="tiny" tone="muted" className="tracking-widest">
                {t('profile.account')}
              </Text>
              <Text variant="display">{displayName}</Text>
              <Text tone="secondary" numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>
          <View className="flex-row gap-2">
            <StatPill active label={t('common.days')} value={form.trainingDaysPerWeek} />
            <StatPill label={t('stat.duration')} value={`${form.sessionDurationMin}m`} />
            <StatPill label={t('profile.level')} value={form.experienceLevel.slice(0, 3).toUpperCase()} />
          </View>
        </PremiumCard>
        </FadeInSection>

        <FadeInSection delay={60}>
        <PremiumCard variant="elevated" className="gap-4">
          <SectionHeader title={t('profile.experienceTitle')} subtitle={t('profile.experienceSub')} />
          <View className="flex-row items-end justify-between">
            <Text variant="title">{t(`profile.experience.${form.experienceLevel}`)}</Text>
            <Text tone="accent" variant="caption">
              {expPct}%
            </Text>
          </View>
          <AnimatedProgressBar value={expPct} max={100} />
        </PremiumCard>
        </FadeInSection>

        <FadeInSection delay={120}>
        <PremiumCard variant="elevated" className="gap-5">
          <SectionHeader title={t('profile.trainingTitle')} subtitle={t('profile.trainingSub')} />

          <View className="gap-2">
            <Text variant="caption" tone="muted">
              {t('profile.nameLabel')}
            </Text>
            <TextInput
              value={form.displayName}
              onChangeText={(displayName) => setForm((prev) => (prev ? { ...prev, displayName } : prev))}
              placeholder={t('profile.namePlaceholder')}
              placeholderTextColor="#6B7585"
              className="h-12 rounded-card border border-border-soft bg-bg-glass px-4 text-text-primary"
            />
          </View>

          <View className="gap-2">
            <Text variant="caption" tone="muted">
              {t('profile.goalLabel')}
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
                      {t(`profile.goals.${opt.value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="gap-2">
            <Text variant="caption" tone="muted">
              {t('profile.experienceLabel')}
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
                      {t(`profile.experience.${opt.value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <Text>{t('profile.daysPerWeek')}</Text>
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
            <Text>{t('profile.sessionDuration')}</Text>
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
              {t('profile.equipmentLabel')}
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
                      {t(`profile.equipment.${opt.value}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Button
            label={t('profile.saveChanges')}
            loading={updateProfile.isPending}
            onPress={() => void saveProfile()}
          />
          {saveMessage ? (
            <Text tone="accent" variant="caption">
              {t('profile.saved')}
            </Text>
          ) : null}
        </PremiumCard>
        </FadeInSection>

        <FadeInSection delay={180}>
        <PremiumCard variant="glass" className="gap-3">
          <Text variant="subtitle">{t('profile.program')}</Text>
          <Text tone="muted">{t('profile.regenerateHint')}</Text>
          {regeneratePlan.isPending ? (
            <View className="gap-2 rounded-card border border-accent/20 bg-accent/5 px-3 py-2.5">
              <Text tone="accent" variant="caption" className="font-semibold">
                {t('profile.regenerating')}
              </Text>
              <Text tone="muted" variant="tiny">
                {t('profile.regeneratingHint')}
              </Text>
              <PulsePlaceholder className="mt-1 h-1.5 w-full rounded-pill" />
            </View>
          ) : null}
          {regenerateError ? (
            <View className="rounded-card border border-danger/30 bg-danger/10 px-3 py-2.5">
              <Text tone="primary" variant="caption">
                {regenerateError}
              </Text>
            </View>
          ) : null}
          <PremiumButton
            label={regeneratePlan.isPending ? t('profile.regenerating') : t('profile.regeneratePlan')}
            variant="secondary"
            loading={regeneratePlan.isPending}
            disabled={regeneratePlan.isPending}
            onPress={() => {
              if (regeneratePlan.isPending) return;
              Alert.alert(
                t('profile.regenerateConfirmTitle'),
                t('profile.regenerateConfirmBody'),
                [
                  { text: t('common.cancel') },
                  {
                    text: t('profile.regenerateAction'),
                    onPress: () => void regeneratePlan.mutateAsync(),
                  },
                ],
              );
            }}
          />
        </PremiumCard>
        </FadeInSection>

        <FadeInSection delay={240}>
        <PremiumCard variant="glass" className="gap-4">
          <Text variant="subtitle">{t('profile.appSettings')}</Text>
          <View className="gap-2">
            <Text variant="caption" tone="muted">
              {t('profile.language')}
            </Text>
            <View className="flex-row gap-2">
              {(['it', 'en'] as const).map((code) => {
                const active = language === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setLanguage(code)}
                    className={`flex-1 rounded-pill px-3 py-2.5 ${active ? 'bg-accent' : 'bg-bg-elevated'}`}
                  >
                    <Text tone={active ? 'inverse' : 'secondary'} variant="caption" className="text-center">
                      {code === 'it' ? t('profile.languageIt') : t('profile.languageEn')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <Text>{t('profile.haptics')}</Text>
            <Switch value={settings.hapticsEnabled} onValueChange={settings.setHapticsEnabled} />
          </View>
          <View className="flex-row items-center justify-between">
            <Text>{t('profile.keepAwake')}</Text>
            <Switch value={settings.keepScreenOn} onValueChange={settings.setKeepScreenOn} />
          </View>
          <View className="flex-row items-center justify-between">
            <Text>{t('profile.notifications')}</Text>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={settings.setNotificationsEnabled}
            />
          </View>
        </PremiumCard>

        <PremiumCard variant="glass" className="gap-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-4">
              <Text variant="subtitle">{t('profile.workoutReminder')}</Text>
              <Text tone="muted" variant="caption">
                {t('profile.reminderHint', {
                  time: formatReminderTime(settings.workoutReminderHour, settings.workoutReminderMinute),
                })}
              </Text>
            </View>
            <Switch
              disabled={reminderBusy}
              value={settings.workoutReminderEnabled}
              onValueChange={(enabled) => void toggleWorkoutReminder(enabled)}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Text>{t('profile.reminderHour')}</Text>
            <Stepper
              value={settings.workoutReminderHour}
              min={0}
              max={23}
              suffix="h"
              onChange={(hour) => void updateWorkoutReminderTime({ hour })}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Text>{t('profile.reminderMinute')}</Text>
            <Stepper
              value={settings.workoutReminderMinute}
              min={0}
              max={55}
              step={5}
              suffix="min"
              onChange={(minute) => void updateWorkoutReminderTime({ minute })}
            />
          </View>

          {reminderBusy ? <Text tone="muted" variant="caption">{t('profile.reminderUpdating')}</Text> : null}
        </PremiumCard>

        <PremiumCard variant="glass">
          <Text variant="subtitle">{t('profile.sync')}</Text>
          <Text tone="muted">
            {pendingCount > 0
              ? t('profile.syncPending', { count: pendingCount })
              : t('profile.syncOk')}
          </Text>
        </PremiumCard>

        <Button label={t('profile.signOut')} variant="danger" onPress={() => void signOut()} />
        </FadeInSection>
      </View>
    </Screen>
  );
}
