import { useEffect } from 'react';
import { supabase } from '../lib/supabase/client';
import { logger } from '../lib/logging/logger';
import { isEnabled } from '../lib/feature-flags/flags';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationRow {
  readonly id: string;
  readonly user_id: string;
  readonly title: string;
  readonly body: string;
  readonly created_at: string;
}

type Listener = (notification: NotificationRow) => void;

/**
 * Subscribes to realtime row inserts on `public.notifications` scoped to the
 * authenticated user. Supabase RLS guarantees other users' rows never reach the client.
 */
export function useRealtimeNotifications(userId: string | undefined, onInsert: Listener): void {
  useEffect(() => {
    if (!userId) return undefined;
    if (!isEnabled('realtime_enabled')) return undefined;
    let channel: RealtimeChannel | null = null;
    try {
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as NotificationRow | undefined;
            if (row) onInsert(row);
          },
        )
        .subscribe();
    } catch (error) {
      logger.error('Realtime subscribe failed', error);
    }
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, onInsert]);
}
