/**
 * Per-endpoint circuit breaker for the HTTP client.
 *
 * Rationale:
 *  - Without a breaker, a backend hiccup turns into a thundering herd: every
 *    React Query refetch, every offline-queue flush, every analytics flush
 *    keeps retrying simultaneously, burning battery and worsening recovery.
 *  - With a breaker, repeated failures on the *same endpoint* open the circuit
 *    for a cooldown. New requests fail fast locally during that window.
 *  - Independent endpoints are isolated: a slow /analytics/events does not
 *    stop /workouts/complete from working.
 *
 * Three states:
 *   closed   → requests pass through, failures counted
 *   open     → requests fail fast with a typed signal
 *   half_open→ a single probe is allowed; success closes, failure re-opens
 *
 * This is intentionally tiny: no global registry, no exotic policies. The
 * breaker is constructed per endpoint by the HTTP client.
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  /** Number of consecutive failures that opens the breaker. */
  readonly failureThreshold: number;
  /** How long the breaker stays open before allowing one probe. */
  readonly openMs: number;
  /** Time horizon for counting failures while closed. */
  readonly windowMs: number;
}

const DEFAULTS: CircuitBreakerOptions = {
  failureThreshold: 5,
  openMs: 30_000,
  windowMs: 60_000,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures: number[] = [];
  private openedAt: number | null = null;
  private readonly opts: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.opts = { ...DEFAULTS, ...options };
  }

  /** Returns true if the caller is allowed to attempt a request. */
  allowRequest(now: number = Date.now()): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (this.openedAt !== null && now - this.openedAt >= this.opts.openMs) {
        this.state = 'half_open';
        return true;
      }
      return false;
    }
    return true;
  }

  /** Record a successful response — closes a half-open breaker, resets failures. */
  recordSuccess(): void {
    this.failures = [];
    this.state = 'closed';
    this.openedAt = null;
  }

  /** Record a retryable failure. May transition the breaker to open. */
  recordFailure(now: number = Date.now()): void {
    if (this.state === 'half_open') {
      this.state = 'open';
      this.openedAt = now;
      this.failures = [];
      return;
    }
    this.failures = this.failures.filter((t) => now - t <= this.opts.windowMs);
    this.failures.push(now);
    if (this.failures.length >= this.opts.failureThreshold) {
      this.state = 'open';
      this.openedAt = now;
      this.failures = [];
    }
  }

  /** For tests / observability. */
  inspect(): { state: CircuitState; failureCount: number; openedAt: number | null } {
    return { state: this.state, failureCount: this.failures.length, openedAt: this.openedAt };
  }
}

/**
 * Registry of circuit breakers keyed by endpoint pattern. The HTTP client uses
 * this so all callers of the same endpoint share fate.
 */
class CircuitBreakerRegistry {
  private readonly breakers = new Map<string, CircuitBreaker>();

  get(key: string, options?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    let breaker = this.breakers.get(key);
    if (!breaker) {
      breaker = new CircuitBreaker(options);
      this.breakers.set(key, breaker);
    }
    return breaker;
  }

  /** For tests only. */
  reset(): void {
    this.breakers.clear();
  }
}

export const circuitBreakers = new CircuitBreakerRegistry();

export class CircuitOpenError extends Error {
  constructor(public readonly endpoint: string) {
    super(`Circuit open for ${endpoint}`);
    this.name = 'CircuitOpenError';
  }
}
