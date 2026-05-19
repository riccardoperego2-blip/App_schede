import { View } from 'react-native';
import { Text, PremiumButton, Stepper } from '../../../design-system';
import {
  useWorkoutSessionStore,
  workoutSelectors,
} from '../../../stores/workout-session.store';

interface FinishSheetProps {
  onConfirm: () => void;
  loading: boolean;
}

export function FinishSheet({ onConfirm, loading }: FinishSheetProps) {
  const wellness = useWorkoutSessionStore((s) => s.wellness);
  const setWellness = useWorkoutSessionStore((s) => s.setWellness);
  const state = useWorkoutSessionStore.getState();
  const adherence = workoutSelectors.adherenceScore(state);
  const volume = workoutSelectors.totalVolumeKg(state);

  return (
    <View className="gap-5">
      <Text variant="title">Chiudi sessione</Text>
      <Text tone="secondary" variant="caption">
        Volume {Math.round(volume)} kg · Aderenza {(adherence * 100).toFixed(0)}%
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

      <PremiumButton label="Termina allenamento" loading={loading} onPress={onConfirm} />
    </View>
  );
}
