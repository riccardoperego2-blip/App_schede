import { View } from 'react-native';
import { Text } from '../../../design-system';
import type { SmartInsight } from '../lib/generate-insights';

interface CompactInsightChipProps {
  insight: SmartInsight;
}

export function CompactInsightChip({ insight }: CompactInsightChipProps) {
  const accent = insight.accentColor ?? '#39FF88';

  return (
    <View
      className="flex-row items-center gap-2 rounded-pill border px-3.5 py-2"
      style={{
        borderColor: `${accent}40`,
        backgroundColor: `${accent}12`,
        shadowColor: accent,
        shadowOpacity: 0.2,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Text className="text-base leading-5">{insight.icon ?? '✦'}</Text>
      <Text variant="caption" className="font-semibold" numberOfLines={1}>
        {insight.compactTitle ?? insight.title}
      </Text>
    </View>
  );
}
