import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/sdk';
import { qk } from '../lib/api/query-keys';
import type { UserProfile } from '../lib/api/contracts';

export function useProfile() {
  return useQuery({
    queryKey: qk.profile(),
    queryFn: () => api.profile.me(),
    staleTime: 30_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserProfile>) => api.profile.update(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(qk.profile(), data);
    },
  });
}

export async function invalidateWorkoutDataCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  activePlan?: { planId: string; versionId: string },
): Promise<void> {
  if (activePlan) {
    queryClient.setQueryData(qk.plans.active(), activePlan);
  }

  const invalidateTargets = [
    qk.profile(),
    qk.dashboard(),
    qk.workouts.todays(),
    qk.workouts.history(),
    qk.plans.active(),
    qk.plans.activeFull(),
    qk.analytics.overview('4w'),
    qk.analytics.overview('12w'),
    qk.analytics.overview('6m'),
    ['workouts', 'day'] as const,
  ];

  await Promise.all(
    invalidateTargets.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );

  await Promise.all([
    queryClient.refetchQueries({ queryKey: qk.profile(), type: 'active' }),
    queryClient.refetchQueries({ queryKey: qk.dashboard(), type: 'active' }),
    queryClient.refetchQueries({ queryKey: qk.workouts.todays(), type: 'active' }),
    queryClient.refetchQueries({ queryKey: qk.plans.active(), type: 'active' }),
    queryClient.refetchQueries({ queryKey: qk.plans.activeFull(), type: 'active' }),
    queryClient.refetchQueries({ queryKey: qk.workouts.history(), type: 'active' }),
    queryClient.refetchQueries({ queryKey: qk.analytics.overview('4w'), type: 'active' }),
  ]);
}
