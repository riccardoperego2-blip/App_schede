import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api/sdk';
import { qk } from '../lib/api/query-keys';

export function useDashboard() {
  return useQuery({
    queryKey: qk.dashboard(),
    queryFn: () => api.dashboard.summary(),
    staleTime: 60_000,
  });
}

export function useTodaysWorkout() {
  return useQuery({
    queryKey: qk.workouts.todays(),
    queryFn: () => api.workouts.todays(),
    staleTime: 60_000,
  });
}
