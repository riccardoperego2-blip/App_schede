import { useInfiniteQuery } from '@tanstack/react-query';

import { api } from '../lib/api/sdk';

import { qk } from '../lib/api/query-keys';

import { mapHistoryResponse, type MappedHistoryListResponse } from '../lib/api/mappers/workout-history';



export function useWorkoutHistory() {

  return useInfiniteQuery<MappedHistoryListResponse>({

    queryKey: qk.workouts.history(),

    queryFn: async ({ pageParam }) => {

      const raw = await api.workouts.history(typeof pageParam === 'string' ? pageParam : undefined);

      return mapHistoryResponse(raw);

    },

    initialPageParam: undefined as string | undefined,

    getNextPageParam: (last) => last.nextCursor ?? undefined,

    staleTime: 0,

    refetchOnMount: 'always',

  });

}


