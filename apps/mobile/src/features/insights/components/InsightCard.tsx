import { View } from 'react-native';
import { PremiumCard, Text } from '../../../design-system';
import type { SmartInsight } from '../lib/generate-insights';

interface InsightCardProps {
  insight: SmartInsight;
}

export function InsightCard({ insight }: InsightCardProps) {
  const accent = insight.accentColor ?? '#39FF88';

  return (
    <PremiumCard
      variant="glow"
      className="w-[268px] gap-3 p-4"
      style={{
        borderColor: `${accent}33`,
      }}
    >
      <View className="flex-row items-start gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-full border border-border-soft bg-bg-surface"
          style={{
            shadowColor: accent,
            shadowOpacity: 0.25,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Text className="text-xl leading-6">{insight.icon ?? '✦'}</Text>
        </View>
        <View className="min-h-[44px] flex-1 justify-center gap-1">
          <Text variant="caption" className="font-semibold leading-5" numberOfLines={2}>
            {insight.title}
          </Text>
          {insight.subtitle ? (
            <Text variant="tiny" tone="muted" numberOfLines={2}>
              {insight.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </PremiumCard>
  );
}
