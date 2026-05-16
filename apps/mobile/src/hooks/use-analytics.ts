import { useQuery } from '@tanstack/react-query';

import { api } from '../lib/api/sdk';

import { qk } from '../lib/api/query-keys';

import { mapAnalyticsOverview } from '../lib/api/mappers/analytics-overview';

import type { AnalyticsOverview } from '../lib/api/contracts';



export function useAnalyticsOverview(range: '4w' | '12w' | '6m' = '4w') {

  return useQuery<AnalyticsOverview>({

    queryKey: qk.analytics.overview(range),

    queryFn: async () => {

      const raw = await api.analytics.overview(range);

      return mapAnalyticsOverview(raw);

    },

    staleTime: 0,

    refetchOnMount: 'always',

  });

}


