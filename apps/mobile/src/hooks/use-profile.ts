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

export async function invalidateWorkoutDataCaches(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.dashboard() }),
    queryClient.invalidateQueries({ queryKey: qk.workouts.todays() }),
    queryClient.invalidateQueries({ queryKey: qk.workouts.history() }),
    queryClient.invalidateQueries({ queryKey: qk.plans.active() }),
    queryClient.invalidateQueries({ queryKey: qk.plans.activeFull() }),
    queryClient.invalidateQueries({ queryKey: ['analytics'] }),
  ]);
}
