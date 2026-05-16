import { CircuitBreaker } from '../src/lib/health/circuit-breaker';

describe('CircuitBreaker', () => {
  it('starts closed and allows requests', () => {
    const cb = new CircuitBreaker();
    expect(cb.allowRequest()).toBe(true);
    expect(cb.inspect().state).toBe('closed');
  });

  it('opens after N consecutive failures inside the window', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, openMs: 30_000, windowMs: 60_000 });
    let t = 0;
    cb.recordFailure(t);
    cb.recordFailure((t += 1_000));
    cb.recordFailure((t += 1_000));
    expect(cb.inspect().state).toBe('open');
    expect(cb.allowRequest(t)).toBe(false);
  });

  it('resets failure count after the window elapses', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, openMs: 30_000, windowMs: 1_000 });
    cb.recordFailure(0);
    cb.recordFailure(500);
    // After window: old failures are evicted before counting the new one.
    cb.recordFailure(5_000);
    expect(cb.inspect().state).toBe('closed');
  });

  it('moves to half_open after openMs and closes on probe success', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, openMs: 100, windowMs: 60_000 });
    cb.recordFailure(0);
    expect(cb.allowRequest(50)).toBe(false);
    expect(cb.allowRequest(200)).toBe(true);
    expect(cb.inspect().state).toBe('half_open');
    cb.recordSuccess();
    expect(cb.inspect().state).toBe('closed');
  });

  it('reopens on a probe failure', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, openMs: 100, windowMs: 60_000 });
    cb.recordFailure(0);
    cb.allowRequest(200);
    cb.recordFailure(210);
    expect(cb.inspect().state).toBe('open');
  });
});
