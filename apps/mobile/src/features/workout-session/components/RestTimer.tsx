import { View, Pressable } from 'react-native';
import { Text } from '../../../design-system';
import { useRestTimer } from '../../../hooks/use-rest-timer';

interface RestTimerProps {
  restEndsAt: string | null;
  onAdd: (seconds: number) => void;
  onSkip: () => void;
}

export function RestTimer({ restEndsAt, onAdd, onSkip }: RestTimerProps) {
  const { remainingSeconds, isActive } = useRestTimer(restEndsAt);
  if (!isActive) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View className="rounded-card border border-accent/30 bg-accent-subtle/60 p-5">
      <View className="flex-row items-center justify-between">
        <View>
          <Text variant="caption" tone="accent">
            RECUPERO
          </Text>
          <Text variant="display" tone="primary">
            {display}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onAdd(15)}
            className="rounded-pill border border-border-soft bg-bg-glass px-3 py-2"
          >
            <Text variant="caption">+15s</Text>
          </Pressable>
          <Pressable onPress={onSkip} className="rounded-pill border border-border-soft bg-bg-glass px-3 py-2">
            <Text variant="caption">Skip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
