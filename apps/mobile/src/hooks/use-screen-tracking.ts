import { useEffect, useRef } from 'react';
import { analytics } from '../lib/analytics';

let lastScreen: string | null = null;

/**
 * Records a `screen.viewed` event when the screen mounts and records the
 * time-to-interactive once content is ready (caller signals readiness via
 * the optional `ready` flag).
 *
 * Usage:
 *   useScreenTracking('Dashboard', { ready: !dashboard.isLoading });
 */
export function useScreenTracking(screen: string, opts?: { ready?: boolean }): void {
  const mountedAt = useRef<number>(Date.now());
  const reportedReady = useRef<boolean>(false);

  useEffect(() => {
    const previous = lastScreen;
    lastScreen = screen;
    analytics.screen(screen, previous, null);
    return () => {
      // Intentionally leave `lastScreen` set — next mount records this as previous.
    };
  }, [screen]);

  useEffect(() => {
    if (!opts?.ready || reportedReady.current) return;
    reportedReady.current = true;
    const tti = Date.now() - mountedAt.current;
    analytics.track({
      name: 'perf.screen_load',
      category: 'perf',
      properties: { screen, time_to_interactive_ms: tti },
    });
  }, [opts?.ready, screen]);
}
