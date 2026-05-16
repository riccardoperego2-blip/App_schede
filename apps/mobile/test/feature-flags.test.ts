/**
 * Feature-flag resolution tests.
 *
 * We re-import the module under test inside `jest.isolateModules` so the
 * top-level `snapshot` is re-resolved against the controlled `process.env`
 * and `expo-constants` mock in each scenario.
 */

describe('feature-flags', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  function loadFlagsWithExtra(extraFlags?: Record<string, unknown>) {
    jest.resetModules();
    jest.doMock('expo-constants', () => ({
      default: {
        expoConfig: {
          extra: {
            apiBaseUrl: 'https://api.test.local',
            ...(extraFlags ? { flags: extraFlags } : {}),
          },
        },
      },
      expoConfig: {
        extra: {
          apiBaseUrl: 'https://api.test.local',
          ...(extraFlags ? { flags: extraFlags } : {}),
        },
      },
    }));
    return require('../src/lib/feature-flags/flags') as typeof import('../src/lib/feature-flags/flags');
  }

  it('defaults all flags to true', () => {
    const { flags } = loadFlagsWithExtra();
    expect(flags()).toEqual({
      analytics_enabled: true,
      realtime_enabled: true,
      offline_queue_enabled: true,
      circuit_breaker_enabled: true,
      keep_awake_default: true,
    });
  });

  it('env var EXPO_PUBLIC_FLAG_* wins over default', () => {
    process.env.EXPO_PUBLIC_FLAG_ANALYTICS_ENABLED = 'false';
    const { isEnabled } = loadFlagsWithExtra();
    expect(isEnabled('analytics_enabled')).toBe(false);
    expect(isEnabled('realtime_enabled')).toBe(true);
  });

  it('env var beats extra.flags OTA override', () => {
    process.env.EXPO_PUBLIC_FLAG_REALTIME_ENABLED = 'true';
    const { isEnabled } = loadFlagsWithExtra({ realtime_enabled: false });
    expect(isEnabled('realtime_enabled')).toBe(true);
  });

  it('extra.flags is used when env var is absent', () => {
    const { isEnabled } = loadFlagsWithExtra({ circuit_breaker_enabled: false });
    expect(isEnabled('circuit_breaker_enabled')).toBe(false);
  });

  it('accepts common boolean-like strings', () => {
    process.env.EXPO_PUBLIC_FLAG_ANALYTICS_ENABLED = '0';
    process.env.EXPO_PUBLIC_FLAG_REALTIME_ENABLED = 'yes';
    process.env.EXPO_PUBLIC_FLAG_KEEP_AWAKE_DEFAULT = 'off';
    const { isEnabled } = loadFlagsWithExtra();
    expect(isEnabled('analytics_enabled')).toBe(false);
    expect(isEnabled('realtime_enabled')).toBe(true);
    expect(isEnabled('keep_awake_default')).toBe(false);
  });

  it('__setFlagsForTests overrides snapshot until reset', () => {
    const mod = loadFlagsWithExtra();
    expect(mod.isEnabled('analytics_enabled')).toBe(true);
    mod.__setFlagsForTests({ analytics_enabled: false });
    expect(mod.isEnabled('analytics_enabled')).toBe(false);
    mod.__setFlagsForTests();
    expect(mod.isEnabled('analytics_enabled')).toBe(true);
  });
});
