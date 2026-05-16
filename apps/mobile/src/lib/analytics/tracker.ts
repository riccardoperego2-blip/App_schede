import { AppState, type NativeEventSubscription, Platform } from 'react-native';
import * as Application from 'expo-application';
import { onlineManager } from '@tanstack/react-query';
import { mmkv } from '../storage/mmkv';
import { logger } from '../logging/logger';
import { isEnabled } from '../feature-flags/flags';
import { useSettingsStore } from '../../stores/settings.store';
import { analyticsQueue, AnalyticsQueue } from './queue';
import { RageTapDetector } from './rage-tap-detector';
import { httpAnalyticsTransport, type AnalyticsTransport } from './transport';
import type {
  AnalyticsEvent,
  AnalyticsEventEnvelope,
  AnalyticsCategory,
} from './events';

const FLUSH_INTERVAL_MS = 15_000;
const FLUSH_BATCH_SIZE = 50;
const MAX_BATCH_PER_TICK = 5;

interface IdentityContext {
  userId: string | null;
  locale: string;
  appVersion: string;
  os: 'ios' | 'android';
  osVersion: string;
}

interface TrackerConfig {
  readonly transport: AnalyticsTransport;
  readonly queue: AnalyticsQueue;
  readonly flushIntervalMs: number;
  readonly batchSize: number;
}

function generateId(): string {
  if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
    return (globalThis.crypto as Crypto).randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function readClientSessionId(): string {
  const key = 'schede.analytics.client_session_id';
  const existing = mmkv.getString(key);
  if (existing) return existing;
  const fresh = generateId();
  mmkv.set(key, fresh);
  return fresh;
}

/**
 * Strongly-typed product analytics tracker.
 *
 * Responsibilities:
 *  - Strictly-typed `track()` against the `AnalyticsEvent` union.
 *  - Persistent in-memory + MMKV buffer with periodic + opportunistic flush.
 *  - Identity propagation (userId, locale, app version, os).
 *  - UX heuristics (rage taps, sync events, latency).
 *
 * Non-responsibilities:
 *  - Network mutations (use `offlineQueue` + `http`).
 *  - Auth state (read from auth store at flush time).
 *  - PII collection. Identity is propagated by id only.
 */
export class AnalyticsTracker {
  private readonly transport: AnalyticsTransport;
  private readonly queue: AnalyticsQueue;
  private readonly flushIntervalMs: number;
  private readonly batchSize: number;
  private readonly rageTapDetector = new RageTapDetector();

  private identity: IdentityContext = {
    userId: null,
    locale: 'en-US',
    appVersion: '0.0.0',
    os: Platform.OS === 'ios' ? 'ios' : 'android',
    osVersion: String(Platform.Version ?? ''),
  };

  private clientSessionId: string = readClientSessionId();
  private flushing = false;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private appStateSub: NativeEventSubscription | null = null;
  private onlineUnsubscribe: (() => void) | null = null;
  private started = false;

  constructor(config?: Partial<TrackerConfig>) {
    this.transport = config?.transport ?? httpAnalyticsTransport;
    this.queue = config?.queue ?? analyticsQueue;
    this.flushIntervalMs = config?.flushIntervalMs ?? FLUSH_INTERVAL_MS;
    this.batchSize = config?.batchSize ?? FLUSH_BATCH_SIZE;
  }

  start(): () => void {
    if (this.started) return () => undefined;
    this.started = true;

    this.identity = {
      ...this.identity,
      locale: this.identity.locale,
      appVersion: Application.nativeApplicationVersion ?? this.identity.appVersion,
    };

    this.appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void this.flush('foreground');
      }
    });

    this.onlineUnsubscribe = onlineManager.subscribe((isOnline) => {
      if (isOnline) void this.flush('online');
    });

    this.intervalHandle = setInterval(() => {
      void this.flush('interval');
    }, this.flushIntervalMs);

    return () => this.stop();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.appStateSub?.remove();
    this.appStateSub = null;
    this.onlineUnsubscribe?.();
    this.onlineUnsubscribe = null;
  }

  identify(userId: string | null, locale?: string): void {
    this.identity = {
      ...this.identity,
      userId,
      locale: locale ?? this.identity.locale,
    };
  }

  /** Reset the client_session_id, e.g. on explicit sign-out. */
  resetClientSession(): void {
    this.clientSessionId = generateId();
    mmkv.set('schede.analytics.client_session_id', this.clientSessionId);
  }

  /**
   * Track a strictly-typed event. The compiler enforces correct properties.
   * The actual network send happens asynchronously through the queue.
   */
  track<T extends AnalyticsEvent>(event: T): void {
    if (!this.respectsConsent(event.category)) return;
    const envelope: AnalyticsEventEnvelope = {
      event_id: generateId(),
      name: event.name,
      category: event.category,
      properties: event.properties as Record<string, unknown>,
      occurred_at: new Date().toISOString(),
      client_session_id: this.clientSessionId,
      app_version: this.identity.appVersion,
      os: this.identity.os,
      os_version: this.identity.osVersion,
      locale: this.identity.locale,
      schema_version: 1,
    };
    const { dropped } = this.queue.enqueueMany([envelope]);
    if (dropped > 0) {
      logger.warn('Analytics queue overflowed', { dropped });
    }
  }

  /**
   * Convenience helpers around recurring patterns. They are typed against
   * the event union so adding properties to an event is a single change.
   */
  screen(screen: string, previousScreen: string | null, timeToInteractiveMs: number | null): void {
    this.track({
      name: 'screen.viewed',
      category: 'screen',
      properties: { screen, previous_screen: previousScreen, time_to_interactive_ms: timeToInteractiveMs },
    });
  }

  feature(featureKey: string, value?: string | number | boolean): void {
    this.track({
      name: 'feature.used',
      category: 'feature',
      properties: value !== undefined ? { feature_key: featureKey, value } : { feature_key: featureKey },
    });
  }

  rageTap(screen: string, target: string): void {
    const detection = this.rageTapDetector.record(target);
    if (!detection) return;
    this.track({
      name: 'ux.rage_tap',
      category: 'ux',
      properties: { screen, ...detection },
    });
  }

  perfApiLatency(endpoint: string, method: string, status: number, durationMs: number): void {
    this.track({
      name: 'perf.api_latency',
      category: 'perf',
      properties: { endpoint, method, status, duration_ms: durationMs },
    });
  }

  async flush(reason: 'foreground' | 'online' | 'interval' | 'manual'): Promise<{ flushed: number; remaining: number }> {
    if (this.flushing) return { flushed: 0, remaining: this.queue.size() };
    this.flushing = true;
    let flushed = 0;
    try {
      for (let i = 0; i < MAX_BATCH_PER_TICK; i += 1) {
        const batch = this.queue.reserveBatch(this.batchSize);
        if (batch.length === 0) break;
        try {
          const response = await this.transport.send(batch);
          this.queue.ack(response.accepted_event_ids);
          flushed += response.accepted_event_ids.length;
          if (response.accepted_event_ids.length === 0) break;
        } catch (error) {
          logger.warn('Analytics flush failed', { reason, error: (error as Error).message });
          break;
        }
      }
    } finally {
      this.flushing = false;
    }
    return { flushed, remaining: this.queue.size() };
  }

  private respectsConsent(category: AnalyticsCategory): boolean {
    // Hard kill switch first: if the alpha disables analytics globally
    // (e.g. via an OTA flag flip during an incident), drop everything
    // except critical errors that already opt-in for crash visibility.
    if (!isEnabled('analytics_enabled')) {
      return category === 'error';
    }
    if (category === 'error') return true;
    const consent = useSettingsStore.getState().notificationsEnabled;
    // Telemetry consent should be its own setting; reuse the existing one as
    // a placeholder until we ship a dedicated `telemetryConsent` field.
    return consent !== false;
  }
}

export const analytics = new AnalyticsTracker();
