import { useRootNavigationState } from 'expo-router';

/**
 * Entry path `/` — AuthGate in `_layout.tsx` routes to sign-in, onboarding, or tabs.
 * No redirect here to avoid an extra sign-in hop before the gate runs.
 */
export default function Index() {
  const rootNavigationState = useRootNavigationState();
  if (!rootNavigationState?.key) return null;
  return null;
}
