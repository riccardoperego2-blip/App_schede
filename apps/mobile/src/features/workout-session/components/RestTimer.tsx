import { useEffect, useRef } from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { PremiumCard, Text } from '../../../design-system';
import { colors } from '../../../theme';
import { useRestTimer } from '../../../hooks/use-rest-timer';
import { useI18n } from '../../../i18n/use-i18n';

interface RestTimerProps {
  restEndsAt: string | null;
  onAdd: (seconds: number) => void;
  onSkip: () => void;
}

function RestRing({ progress }: { progress: number }) {
  const size = 72;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <Svg width={size} height={size}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={stroke}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={colors.primary}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export function RestTimer({ restEndsAt, onAdd, onSkip }: RestTimerProps) {
  const { t } = useI18n();
  const { remainingSeconds, isActive } = useRestTimer(restEndsAt);
  const initialSecondsRef = useRef(0);

  useEffect(() => {
    if (isActive && remainingSeconds > initialSecondsRef.current) {
      initialSecondsRef.current = remainingSeconds;
    }
    if (!isActive) {
      initialSecondsRef.current = 0;
    }
  }, [isActive, remainingSeconds]);

  if (!isActive) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const total = Math.max(initialSecondsRef.current, remainingSeconds, 1);
  const progress = remainingSeconds / total;

  return (
    <PremiumCard variant="ambient" className="mb-3 gap-4 p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-4">
          <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute' }}>
              <RestRing progress={progress} />
            </View>
            <Text variant="caption" tone="accent" className="font-semibold">
              {display}
            </Text>
          </View>
          <View className="gap-0.5">
            <Text variant="tiny" tone="muted" className="tracking-widest">
              {t('workout.rest')}
            </Text>
            <Text variant="subtitle">{t('workout.restHint')}</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onAdd(15)}
            className="rounded-pill border border-border-soft bg-bg-surface px-3 py-2"
          >
            <Text variant="caption">+15s</Text>
          </Pressable>
          <Pressable
            onPress={onSkip}
            className="rounded-pill border border-border-soft bg-bg-surface px-3 py-2"
          >
            <Text variant="caption" tone="accent">
              {t('workout.skipRest')}
            </Text>
          </Pressable>
        </View>
      </View>
    </PremiumCard>
  );
}
