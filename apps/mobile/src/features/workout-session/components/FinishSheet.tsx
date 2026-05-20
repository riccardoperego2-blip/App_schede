import { View } from 'react-native';
import {
  FadeInSection,
  PremiumButton,
  PremiumCard,
  StatPill,
  Stepper,
  Text,
  AnimatedProgressBar,
} from '../../../design-system';
import { useI18n } from '../../../i18n/use-i18n';
import {
  useWorkoutSessionStore,
  workoutSelectors,
} from '../../../stores/workout-session.store';

export interface FinishSheetStats {
  readonly durationMinutes: number;
  readonly volumeKg: number;
  readonly completedSets: number;
  readonly plannedSets: number;
  readonly completedExercises: number;
  readonly totalExercises: number;
}

interface FinishSheetProps {
  stats: FinishSheetStats;
  onConfirm: () => void;
  loading: boolean;
}

export function FinishSheet({ stats, onConfirm, loading }: FinishSheetProps) {
  const { t } = useI18n();
  const wellness = useWorkoutSessionStore((s) => s.wellness);
  const setWellness = useWorkoutSessionStore((s) => s.setWellness);
  const adherence = workoutSelectors.adherenceScore(useWorkoutSessionStore.getState());
  const adherencePct = Math.round(adherence * 100);
  const volumeLabel = stats.volumeKg > 0 ? `${Math.round(stats.volumeKg)} kg` : t('common.emDash');
  const durationLabel =
    stats.durationMinutes < 1
      ? t('workout.durationUnderMin')
      : t('workout.durationMin', { min: stats.durationMinutes });

  return (
    <View className="gap-5">
      <FadeInSection delay={0}>
        <PremiumCard variant="ambient" className="gap-4 p-5">
          <View className="flex-row items-start gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-full border border-border-soft bg-bg-surface">
              <Text className="text-2xl">✓</Text>
            </View>
            <View className="flex-1 gap-1">
              <Text variant="tiny" tone="muted" className="tracking-widest">
                {t('workout.finishEyebrow')}
              </Text>
              <Text variant="title">{t('workout.finishTitle')}</Text>
              <Text tone="secondary" variant="caption">
                {t('workout.finishHint')}
              </Text>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <StatPill label={t('stat.duration')} value={durationLabel} />
            <StatPill label={t('stat.volume')} value={volumeLabel} active={stats.volumeKg > 0} />
            <StatPill label={t('stat.sets')} value={`${stats.completedSets}/${stats.plannedSets || t('common.emDash')}`} active />
            <StatPill
              label={t('stat.exercises')}
              value={`${stats.completedExercises}/${stats.totalExercises || t('common.emDash')}`}
            />
          </View>
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="caption" tone="muted">
                {t('workout.completion')}
              </Text>
              <Text variant="caption" tone="secondary">
                {adherencePct}%
              </Text>
            </View>
            <AnimatedProgressBar value={stats.completedSets} max={stats.plannedSets || 1} />
          </View>
        </PremiumCard>
      </FadeInSection>

      <FadeInSection delay={50}>
        <PremiumCard variant="glass" className="gap-4 p-4">
          <Text variant="subtitle" className="font-semibold">
            {t('workout.howFeel')}
          </Text>
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text>{t('workout.sleepQuality')}</Text>
              <Stepper
                value={wellness.sleepQuality}
                min={1}
                max={10}
                onChange={(v) => setWellness({ sleepQuality: v })}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text>{t('workout.soreness')}</Text>
              <Stepper
                value={wellness.soreness}
                min={1}
                max={10}
                onChange={(v) => setWellness({ soreness: v })}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text>{t('workout.fatigue')}</Text>
              <Stepper
                value={wellness.fatigueLevel}
                min={1}
                max={10}
                onChange={(v) => setWellness({ fatigueLevel: v })}
              />
            </View>
          </View>
        </PremiumCard>
      </FadeInSection>

      <PremiumButton label={t('workout.finishWorkout')} loading={loading} haptic onPress={onConfirm} />
    </View>
  );
}
