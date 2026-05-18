import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { hitSlop } from '../tokens';

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export function Stepper({ value, min = 0, max = 999, step = 1, onChange, suffix }: StepperProps) {
  const updateValue = (delta: number) => {
    const next = Math.min(max, Math.max(min, Math.round((value + delta) * 100) / 100));
    if (next === value) return;
    Haptics.selectionAsync().catch(() => undefined);
    onChange(next);
  };

  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        hitSlop={hitSlop}
        onPress={() => updateValue(-step)}
        className="h-12 w-12 items-center justify-center rounded-full border border-border-soft bg-bg-glass active:bg-bg-elevated"
      >
        <Text variant="subtitle" tone="primary">
          −
        </Text>
      </Pressable>
      <View className="min-w-[86px] items-center rounded-pill border border-border-soft bg-bg-surface px-3 py-2">
        <Text variant="title" tone="primary">
          {value}
          {suffix ? <Text variant="caption" tone="muted">{` ${suffix}`}</Text> : null}
        </Text>
      </View>
      <Pressable
        hitSlop={hitSlop}
        onPress={() => updateValue(step)}
        className="h-12 w-12 items-center justify-center rounded-full bg-accent active:bg-accent-strong"
      >
        <Text variant="subtitle" tone="inverse">
          +
        </Text>
      </Pressable>
    </View>
  );
}
