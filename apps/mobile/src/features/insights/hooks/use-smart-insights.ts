import { useMemo } from 'react';
import { useAnalyticsOverview } from '../../../hooks/use-analytics';
import { useWorkoutHistory } from '../../../hooks/use-history';
import {
  generateInsights,
  pickCompactInsights,
  type InsightsContext,
  type SmartInsight,
} from '../lib/generate-insights';

function useInsightsContext(range: '4w' | '12w' | '6m'): InsightsContext {
  const { data: analytics } = useAnalyticsOverview(range);
  const { data: historyData } = useWorkoutHistory();

  const historyItems = useMemo(
    () => historyData?.pages.flatMap((page) => page.items) ?? [],
    [historyData?.pages],
  );

  return useMemo(
    () => ({
      analytics: analytics ?? null,
      historyItems,
    }),
    [analytics, historyItems],
  );
}

export function useSmartInsights(range: '4w' | '12w' | '6m' = '4w'): readonly SmartInsight[] {
  const ctx = useInsightsContext(range);
  return useMemo(() => generateInsights(ctx), [ctx]);
}

export function useCompactSmartInsights(range: '4w' | '12w' | '6m' = '4w'): readonly SmartInsight[] {
  const ctx = useInsightsContext(range);
  return useMemo(() => pickCompactInsights(generateInsights(ctx)), [ctx]);
}
