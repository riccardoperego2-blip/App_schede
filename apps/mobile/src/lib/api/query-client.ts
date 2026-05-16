import { QueryClient, focusManager, onlineManager, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus } from 'react-native';
import { ApiError } from './errors';

const ONE_MIN = 60_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * ONE_MIN,
      gcTime: 24 * 60 * ONE_MIN,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && !error.isRetryable) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'schede.rq.cache.v1',
  throttleTime: 1_000,
});

/** Persist only stable, low-churn queries. Sessions/streams stay in memory. */
export function shouldDehydrateQuery(query: Query): boolean {
  const root = query.queryKey[0];
  if (typeof root !== 'string') return false;
  if (root === 'workouts' && query.queryKey[1] === 'history') return false;
  if (root === 'analytics' && query.queryKey[1] === 'overview') return false;
  return ['profile', 'plans', 'exercises', 'analytics', 'workouts'].includes(root);
}

/**
 * Bridge React Native lifecycle into React Query so background refetch
 * triggers correctly when the user returns to the app.
 */
export function bindReactQueryToAppState(): () => void {
  onlineManager.setEventListener((setOnline) => {
    setOnline(true);
    return () => undefined;
  });

  const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    focusManager.setFocused(state === 'active');
  });

  return () => subscription.remove();
}
