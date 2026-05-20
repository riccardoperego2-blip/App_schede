import { View, Pressable } from 'react-native';
import {
  PremiumCard,
  Text,
  StatPill,
  AnimatedProgressBar,
} from '../../../design-system';
import { useI18n } from '../../../i18n/use-i18n';
import { formatElapsed } from '../hooks/use-session-elapsed';

interface SessionHeaderProps {
  dayLabel: string;
  weekNumber: number;
  elapsedSec: number;
  completedSets: number;
  plannedSets: number;
  totalVolumeKg: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onCancel: () => void;
}

export function SessionHeader({
  dayLabel,
  weekNumber,
  elapsedSec,
  completedSets,
  plannedSets,
  totalVolumeKg,
  isPaused,
  onTogglePause,
  onCancel,
}: SessionHeaderProps) {
  const { t } = useI18n();
  const progressPct = plannedSets > 0 ? Math.round((completedSets / plannedSets) * 100) : 0;

  return (
    <PremiumCard variant="ambient" className="gap-4 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text variant="tiny" tone="muted" className="tracking-widest">
            {dayLabel.toUpperCase()} · {t('workout.weekLabel', { week: weekNumber })}
          </Text>
          <Text variant="title">{dayLabel}</Text>
          <Text variant="subtitle" tone="accent" className="font-semibold">
            {formatElapsed(elapsedSec)}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            onPress={onTogglePause}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? t('workout.resume') : t('workout.pause')}
            className="rounded-pill border border-border-soft bg-bg-surface px-4 py-2.5"
          >
            <Text variant="caption">{isPaused ? '▶' : '❚❚'}</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t('workout.cancelSession')}
            className="rounded-pill border border-border-soft bg-bg-surface px-4 py-2.5"
          >
            <Text tone="danger" variant="caption">
              ✕
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-row gap-2">
        <StatPill label={t('stat.volume')} value={`${Math.round(totalVolumeKg)} kg`} active={totalVolumeKg > 0} />
        <StatPill label={t('stat.sets')} value={`${completedSets}/${plannedSets}`} active={completedSets > 0} />
        <StatPill label={t('stat.progress')} value={`${progressPct}%`} />
      </View>

      <View className="gap-2">
        <View className="flex-row items-center justify-between">
          <Text variant="caption" tone="muted">
            {t('workout.sessionCompletion')}
          </Text>
          <Text variant="caption" tone="secondary">
            {t('workout.setsCount', { done: completedSets, total: plannedSets })}
          </Text>
        </View>
        <AnimatedProgressBar value={completedSets} max={plannedSets || 1} />
      </View>
    </PremiumCard>
  );
}
