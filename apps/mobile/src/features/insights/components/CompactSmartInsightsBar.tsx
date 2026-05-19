import { ScrollView, View } from 'react-native';
import { FadeInSection, Text } from '../../../design-system';
import { colors } from '../../../theme';
import type { SmartInsight } from '../lib/generate-insights';
import { CompactInsightChip } from './CompactInsightChip';

interface CompactSmartInsightsBarProps {
  insights: readonly SmartInsight[];
  delay?: number;
}

export function CompactSmartInsightsBar({ insights, delay = 50 }: CompactSmartInsightsBarProps) {
  if (insights.length === 0) return null;

  return (
    <FadeInSection delay={delay} className="gap-2">
      <View className="flex-row items-center gap-2 px-0.5">
        <View
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOpacity: 0.8,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
        <Text variant="tiny" tone="muted" className="tracking-widest">
          LIVE FITNESS INTELLIGENCE
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 4 }}
      >
        {insights.map((insight) => (
          <CompactInsightChip key={insight.id} insight={insight} />
        ))}
      </ScrollView>
    </FadeInSection>
  );
}
