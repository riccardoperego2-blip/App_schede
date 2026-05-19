import 'react-native-reanimated';
import '../src/design-system/global.css';
import { Stack, usePathname, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { AppProviders } from '../src/providers/AppProviders';
import { useAuthBootstrap } from '../src/hooks/use-auth-bootstrap';
import { useAuthStore } from '../src/stores/auth.store';
import { logAuthGateTiming, resetAuthGateTiming } from '../src/lib/auth/auth-gate-timing';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
resetAuthGateTiming();

function useAuthPersistHydrated(): boolean {
  const [ready, setReady] = useState(() => useAuthStore.persist.hasHydrated());
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setReady(true);
      logAuthGateTiming('persist:hydrated-sync');
      return undefined;
    }
    return useAuthStore.persist.onFinishHydration(() => {
      setReady(true);
      logAuthGateTiming('persist:hydrated-async');
    });
  }, []);
  return ready;
}

/**
 * Single navigation authority for auth + onboarding.
 * Splash hides once session + persist are ready; plan check runs in background.
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const navigationReady = !!rootNavigationState?.key;
  const status = useAuthStore((s) => s.status);
  const persistReady = useAuthPersistHydrated();
  const bootstrap = useAuthBootstrap();
  const splashHiddenRef = useRef(false);

  const gateReady = navigationReady && persistReady && bootstrap.ready;

  useEffect(() => {
    logAuthGateTiming('gate:navigation', { navigationReady });
  }, [navigationReady]);

  useEffect(() => {
    logAuthGateTiming('gate:session', { status, persistReady, bootstrapReady: bootstrap.ready });
  }, [status, persistReady, bootstrap.ready]);

  useEffect(() => {
    if (!gateReady || splashHiddenRef.current) return;
    splashHiddenRef.current = true;
    logAuthGateTiming('gate:splash-hide', {
      hasActivePlan: bootstrap.hasActivePlan,
      planConfirmed: bootstrap.planConfirmed,
    });
    void SplashScreen.hideAsync();
  }, [gateReady, bootstrap.hasActivePlan, bootstrap.planConfirmed]);

  useEffect(() => {
    if (!gateReady) return;

    const root = segments[0];
    const inAuthGroup = root === '(auth)';
    const inOnboarding = root === 'onboarding';
    const inNetworkDebug = root === 'network-debug';

    if (status === 'unauthenticated') {
      if (!inAuthGroup && !inNetworkDebug) {
        logAuthGateTiming('gate:redirect', { target: '/(auth)/sign-in' });
        router.replace('/(auth)/sign-in');
      }
      return;
    }

    if (status === 'authenticated') {
      if (bootstrap.planConfirmed && !bootstrap.hasActivePlan) {
        if (!inOnboarding) {
          logAuthGateTiming('gate:redirect', { target: '/onboarding' });
          router.replace('/onboarding');
        }
        return;
      }

      if (bootstrap.hasActivePlan) {
        if (inOnboarding && !bootstrap.planConfirmed) return;

        const inTabs = root === '(tabs)';
        const inWorkout = root === 'workout';
        const inPlan = root === 'plan';
        if (!inTabs && !inWorkout && !inPlan && !inNetworkDebug) {
          logAuthGateTiming('gate:redirect', { target: '/(tabs)' });
          router.replace('/(tabs)');
        }
      }
    }
  }, [
    status,
    segments,
    bootstrap.hasActivePlan,
    bootstrap.planConfirmed,
    gateReady,
    pathname,
    router,
  ]);

  return null;
}

export default function RootLayout() {
  useEffect(() => {
    logAuthGateTiming('root-layout:mounted');
  }, []);

  return (
    <AppProviders>
      <AuthGate />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0F14' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen
          name="workout/session"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="plan" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </AppProviders>
  );
}
