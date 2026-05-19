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

function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1 min';
  return `${minutes} min`;
}

export function FinishSheet({ stats, onConfirm, loading }: FinishSheetProps) {
  const wellness = useWorkoutSessionStore((s) => s.wellness);
  const setWellness = useWorkoutSessionStore((s) => s.setWellness);
  const adherence = workoutSelectors.adherenceScore(useWorkoutSessionStore.getState());
  const adherencePct = Math.round(adherence * 100);
  const volumeLabel = stats.volumeKg > 0 ? `${Math.round(stats.volumeKg)} kg` : '—';

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
                ULTIMO PASSO
              </Text>
              <Text variant="title">Chiudi la sessione</Text>
              <Text tone="secondary" variant="caption">
                Conferma come ti senti. Poi vedrai il riepilogo completo.
              </Text>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <StatPill label="durata" value={formatDuration(stats.durationMinutes)} />
            <StatPill label="volume" value={volumeLabel} active={stats.volumeKg > 0} />
            <StatPill label="set" value={`${stats.completedSets}/${stats.plannedSets || '—'}`} active />
            <StatPill
              label="esercizi"
              value={`${stats.completedExercises}/${stats.totalExercises || '—'}`}
            />
          </View>
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="caption" tone="muted">
                Completamento
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
            Come ti senti?
          </Text>
          <View className="gap-3">
            <View className="flex-row items-center justify-between">
              <Text>Qualità sonno</Text>
              <Stepper
                value={wellness.sleepQuality}
                min={1}
                max={10}
                onChange={(v) => setWellness({ sleepQuality: v })}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text>Indolenzimento</Text>
              <Stepper
                value={wellness.soreness}
                min={1}
                max={10}
                onChange={(v) => setWellness({ soreness: v })}
              />
            </View>
            <View className="flex-row items-center justify-between">
              <Text>Fatica percepita</Text>
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

      <PremiumButton label="Termina allenamento" loading={loading} haptic onPress={onConfirm} />
    </View>
  );
}
