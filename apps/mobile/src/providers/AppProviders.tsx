import { useEffect, useState, type PropsWithChildren } from 'react';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  bindReactQueryToAppState,
  queryClient,
  queryPersister,
  shouldDehydrateQuery,
} from '../lib/api/query-client';
import { startSyncEngine } from '../lib/offline/sync-engine';
import { useAuthStore } from '../stores/auth.store';

export function AppProviders({ children }: PropsWithChildren) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [persistorReady, setPersistorReady] = useState(false);

  useEffect(() => {
    focusManager.setFocused(true);
    void hydrate();
    const unbindRQ = bindReactQueryToAppState();
    const stopSync = startSyncEngine();
    return () => {
      unbindRQ();
      stopSync();
    };
  }, [hydrate]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: queryPersister,
            maxAge: 24 * 60 * 60 * 1000,
            dehydrateOptions: { shouldDehydrateQuery },
            buster: 'v1',
          }}
          onSuccess={() => setPersistorReady(true)}
        >
          {persistorReady ? (
            children
          ) : (
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          )}
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
