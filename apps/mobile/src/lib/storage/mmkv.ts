import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { logger } from '../logging/logger';

/**
 * Minimal sync KV surface (MMKV 3.x API when native TurboModule is available).
 * Expo Go does not ship the MMKV native binary — use an in-memory engine there
 * so the JS bundle runs in Expo Go with New Architecture. Standalone / custom
 * native builds use react-native-mmkv 3.x (TurboModules).
 */
interface MmkvEngine {
  set(key: string, value: boolean | string | number): void;
  getString(key: string): string | undefined;
  delete(key: string): void;
}

class MemoryMmkv implements MmkvEngine {
  private readonly store = new Map<string, string>();

  set(key: string, value: boolean | string | number): void {
    this.store.set(key, typeof value === 'string' ? value : String(value));
  }

  getString(key: string): string | undefined {
    return this.store.get(key);
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}

function shouldUseMemoryEngine(): boolean {
  if (Platform.OS === 'web') return true;
  return Constants.appOwnership === 'expo';
}

function createMmkvEngine(): MmkvEngine {
  if (shouldUseMemoryEngine()) {
    if (__DEV__) {
      logger.info('Using in-memory KV (Expo Go / web): native MMKV is unavailable; data resets on reload.');
    }
    return new MemoryMmkv();
  }
  // Avoid loading the native module in Expo Go (import would still register the TurboModule graph).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { MMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
  return new MMKV({ id: 'schede.app.cache' });
}

export const mmkv: MmkvEngine = createMmkvEngine();

const QUARANTINE_PREFIX = '__quarantine__:';

/**
 * Persistent JSON store with corruption recovery.
 *
 * MMKV itself does not corrupt easily, but the *payload* can: a crash mid-write,
 * a schema change between releases, or a partially-written upgrade can leave a
 * key in an unparseable state. We never propagate that to consumers. Instead:
 *
 *  - `get` returns `undefined` on parse failure and quarantines the offending
 *    blob under `__quarantine__:<key>` so we can recover it from a support
 *    bundle without keeping a poison pill in the live key.
 *  - `getWithDecoder` lets the caller validate the shape; anything that fails
 *    the decoder is treated as corruption.
 *  - `set` is atomic from the consumer's point of view (MMKV write is sync).
 */
export const mmkvJson = {
  get<T>(key: string): T | undefined {
    const raw = mmkv.getString(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      logger.warn('mmkvJson parse failed; quarantining key', {
        key,
        bytes: raw.length,
      });
      mmkv.set(QUARANTINE_PREFIX + key, raw);
      mmkv.delete(key);
      void error;
      return undefined;
    }
  },

  /**
   * Like `get` but validates the parsed shape with `decode`. Use for any key
   * that crosses a schema-version boundary or comes from another release.
   */
  getWithDecoder<T>(key: string, decode: (value: unknown) => T | null): T | undefined {
    const raw = this.get<unknown>(key);
    if (raw === undefined) return undefined;
    const decoded = decode(raw);
    if (decoded === null) {
      logger.warn('mmkvJson decode rejected key; quarantining', { key });
      const blob = mmkv.getString(key);
      if (blob) mmkv.set(QUARANTINE_PREFIX + key, blob);
      mmkv.delete(key);
      return undefined;
    }
    return decoded;
  },

  set<T>(key: string, value: T): void {
    mmkv.set(key, JSON.stringify(value));
  },

  remove(key: string): void {
    mmkv.delete(key);
  },
};
