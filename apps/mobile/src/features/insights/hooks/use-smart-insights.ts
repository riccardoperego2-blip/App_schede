import { useMemo } from 'react';
import { useAnalyticsOverview } from '../../../hooks/use-analytics';
import { useWorkoutHistory } from '../../../hooks/use-history';
import { generateInsights, type SmartInsight } from '../lib/generate-insights';

export function useSmartInsights(range: '4w' | '12w' | '6m' = '4w'): readonly SmartInsight[] {
  const { data: analytics } = useAnalyticsOverview(range);
  const { data: historyData } = useWorkoutHistory();

  const historyItems = useMemo(
    () => historyData?.pages.flatMap((page) => page.items) ?? [],
    [historyData?.pages],
  );

  return useMemo(
    () =>
      generateInsights({
        analytics: analytics ?? null,
        historyItems,
      }),
    [analytics, historyItems],
  );
}
