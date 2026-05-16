import { AppState } from 'react-native';
import { onlineManager } from '@tanstack/react-query';
import { offlineQueue } from './queue';
import { logger } from '../logging/logger';
import { isEnabled } from '../feature-flags/flags';

const FLUSH_INTERVAL_MS = 30_000;

/**
 * Background sync engine:
 *  - Flushes the offline mutation queue on app foreground and connectivity change.
 *  - Runs a periodic safety flush every 30s while foregrounded.
 *  - Stays cheap: no work when queue is empty.
 */
export function startSyncEngine(): () => void {
  let interval: ReturnType<typeof setInterval> | null = null;

  const triggerFlush = async (reason: string) => {
    if (!isEnabled('offline_queue_enabled')) return;
    if (offlineQueue.list().length === 0) return;
    try {
      const result = await offlineQueue.flush();
      logger.debug('offline flush', { reason, ...result });
    } catch (error) {
      logger.error('offline flush failed', error);
    }
  };

  const startInterval = () => {
    if (interval) return;
    interval = setInterval(() => {
      void triggerFlush('interval');
    }, FLUSH_INTERVAL_MS);
  };

  const stopInterval = () => {
    if (!interval) return;
    clearInterval(interval);
    interval = null;
  };

  const appStateSub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void triggerFlush('foreground');
      startInterval();
    } else {
      stopInterval();
    }
  });

  const onlineUnsubscribe = onlineManager.subscribe((isOnline) => {
    if (isOnline) void triggerFlush('online');
  });

  if (AppState.currentState === 'active') {
    void triggerFlush('boot');
    startInterval();
  }

  return () => {
    appStateSub.remove();
    onlineUnsubscribe();
    stopInterval();
  };
}
