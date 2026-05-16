export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'validation'
  | 'server'
  | 'unknown';

export interface ApiErrorPayload {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly message: string;
  readonly traceId?: string;
  readonly details?: unknown;
}

export class ApiError extends Error {
  public readonly kind: ApiErrorKind;
  public readonly status: number | null;
  public readonly traceId?: string;
  public readonly details?: unknown;

  constructor(payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.kind = payload.kind;
    this.status = payload.status;
    this.traceId = payload.traceId;
    this.details = payload.details;
  }

  get isRetryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'timeout' ||
      this.kind === 'server' ||
      this.kind === 'rate_limited'
    );
  }

  get isAuthError(): boolean {
    return this.kind === 'unauthorized' || this.kind === 'forbidden';
  }

  /** Hint from the server (Retry-After header) about how long to wait, in ms. */
  get retryAfterMs(): number | null {
    if (!this.details || typeof this.details !== 'object') return null;
    const value = (this.details as { retryAfterMs?: unknown }).retryAfterMs;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  }
}

export function mapStatusToKind(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}
