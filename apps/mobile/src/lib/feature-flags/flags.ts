/**
 * Minimal feature-flag layer for the internal alpha.
 *
 * Design constraints:
 *  - No backend dependency. Flags are resolved at app start from
 *    `EXPO_PUBLIC_FLAG_*` env vars (build-time) and from
 *    `Constants.expoConfig.extra.flags` overrides (OTA-updatable).
 *  - Only kill-switches for already-shipped subsystems. We do **not**
 *    use flags to gate new product features during alpha; that is a
 *    deliberate choice to keep alpha small and predictable.
 *  - Resolution is synchronous and immutable for the app lifetime.
 *    A hot-reload-friendly override hook exists for tests only.
 */
import Constants from 'expo-constants';

export const FEATURE_FLAGS = [
  'analytics_enabled',
  'realtime_enabled',
  'offline_queue_enabled',
  'circuit_breaker_enabled',
  'keep_awake_default',
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export type FeatureFlagSnapshot = Readonly<Record<FeatureFlag, boolean>>;

const DEFAULTS: FeatureFlagSnapshot = Object.freeze({
  analytics_enabled: true,
  realtime_enabled: true,
  offline_queue_enabled: true,
  circuit_breaker_enabled: true,
  keep_awake_default: true,
});

function parseBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === '1' || v === 'true' || v === 'yes' || v === 'on') return true;
    if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false;
  }
  return fallback;
}

function envKeyFor(flag: FeatureFlag): string {
  return `EXPO_PUBLIC_FLAG_${flag.toUpperCase()}`;
}

function resolveSnapshot(): FeatureFlagSnapshot {
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    flags?: Partial<Record<FeatureFlag, unknown>>;
  };
  const overrides = extra.flags ?? {};
  const result = { ...DEFAULTS } as Record<FeatureFlag, boolean>;

  for (const flag of FEATURE_FLAGS) {
    const fromEnv = process.env[envKeyFor(flag)];
    const fromExtra = overrides[flag];
    const base = result[flag];
    const withExtra = fromExtra !== undefined ? parseBool(fromExtra, base) : base;
    result[flag] = fromEnv !== undefined ? parseBool(fromEnv, withExtra) : withExtra;
  }

  return Object.freeze(result);
}

let snapshot: FeatureFlagSnapshot = resolveSnapshot();

export function isEnabled(flag: FeatureFlag): boolean {
  return snapshot[flag];
}

export function flags(): FeatureFlagSnapshot {
  return snapshot;
}

/**
 * Test-only override. Do not call from production code. Resets to the
 * resolved snapshot when `next` is undefined.
 */
export function __setFlagsForTests(next?: Partial<Record<FeatureFlag, boolean>>): void {
  if (next === undefined) {
    snapshot = resolveSnapshot();
    return;
  }
  snapshot = Object.freeze({ ...snapshot, ...next });
}
