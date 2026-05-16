import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/sdk';
import { qk } from '../lib/api/query-keys';
import type { ActivePlanFull } from '../lib/api/contracts';

export function useActivePlanFull() {
  return useQuery<ActivePlanFull>({
    queryKey: qk.plans.activeFull(),
    queryFn: () => api.plans.activeFull(),
    staleTime: 60_000,
  });
}
