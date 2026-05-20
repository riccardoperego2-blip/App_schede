import { ScrollView } from 'react-native';
import { FadeInSection, SectionHeader, Text } from '../../../design-system';
import { useI18n } from '../../../i18n/use-i18n';
import type { SmartInsight } from '../lib/generate-insights';
import { InsightCard } from './InsightCard';

interface SmartInsightsSectionProps {
  insights: readonly SmartInsight[];
  delay?: number;
}

export function SmartInsightsSection({ insights, delay = 80 }: SmartInsightsSectionProps) {
  const { t } = useI18n();
  if (insights.length === 0) return null;

  return (
    <FadeInSection delay={delay} className="gap-3">
      <SectionHeader
        eyebrow={t('insights.eyebrow')}
        title={t('insights.title')}
        subtitle={t('insights.subtitle')}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 4 }}
      >
        {insights.map((insight, index) => (
          <FadeInSection key={insight.id} delay={delay + 30 + index * 40}>
            <InsightCard insight={insight} />
          </FadeInSection>
        ))}
      </ScrollView>
      <Text variant="tiny" tone="muted">
        {t('insights.footer')}
      </Text>
    </FadeInSection>
  );
}
