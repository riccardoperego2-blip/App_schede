import { monotonicNow, resetMonotonicAnchorForTests } from '../src/lib/health/monotonic-clock';

describe('monotonic clock', () => {
  beforeEach(() => {
    resetMonotonicAnchorForTests();
  });

  it('moves forward on each call', async () => {
    const first = monotonicNow();
    await new Promise((r) => setTimeout(r, 5));
    const second = monotonicNow();
    expect(second).toBeGreaterThanOrEqual(first);
  });

  it('is resilient to large wall-clock jumps by re-anchoring', () => {
    const originalNow = Date.now;
    let mocked = originalNow();
    Date.now = () => mocked;
    try {
      resetMonotonicAnchorForTests(mocked);
      const baseline = monotonicNow();
      // Wall clock jumps backwards by 1 hour. We should not return a smaller
      // value than the new wall clock — the clock re-anchors.
      mocked = mocked - 60 * 60 * 1000;
      const afterJump = monotonicNow();
      expect(afterJump).toBeGreaterThanOrEqual(mocked);
      expect(afterJump).not.toBeGreaterThan(baseline);
    } finally {
      Date.now = originalNow;
    }
  });
});
