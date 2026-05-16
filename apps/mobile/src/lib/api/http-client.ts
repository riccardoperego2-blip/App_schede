import { env } from '../env';
import { getAccessToken, supabase } from '../supabase/client';
import { ApiError, mapStatusToKind } from './errors';
import { circuitBreakers, CircuitOpenError } from '../health/circuit-breaker';
import { isEnabled } from '../feature-flags/flags';

if (__DEV__) {
  console.log('[api] EXPO_PUBLIC_API_BASE_URL →', env.apiBaseUrl);
}

const API_VERSION = 'v1';
const DEFAULT_TIMEOUT_MS = 15_000;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
  /** When true, request will not retry on 401 (used for refresh fallback). */
  skipAuthRetry?: boolean;
  /** Optional idempotency key for POST mutations (used by offline queue replay). */
  idempotencyKey?: string;
  /** Override circuit-breaker key. Defaults to `<method>:<endpoint-root>`. */
  circuitKey?: string;
  /** Disable the circuit breaker for a specific call (rare). */
  skipCircuit?: boolean;
}

interface HttpClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>;
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T>(path: string, options?: RequestOptions): Promise<T>;
}

/**
 * Default circuit-key collapses paths to their first two segments. This keeps
 * `/workouts/day/:id` and `/workouts/day/:id` sharing a breaker so backend
 * regressions on the same route do not require N separate trip events.
 */
function defaultCircuitKey(method: string, path: string): string {
  const segments = path.split('/').filter(Boolean).slice(0, 2).join('/');
  return `${method}:${segments}`;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${env.apiBaseUrl}/${API_VERSION}${path}`;
  const circuitKey = options.circuitKey ?? defaultCircuitKey(method, path);
  const breaker = circuitBreakers.get(circuitKey);
  // The breaker is a runtime safety net; if it ever generates false positives
  // (e.g. backend instability we are already addressing manually) we can flip
  // `circuit_breaker_enabled` off via OTA without rebuilding the binary.
  const breakerEnabled = isEnabled('circuit_breaker_enabled') && !options.skipCircuit;

  if (breakerEnabled && !breaker.allowRequest()) {
    throw new ApiError({
      kind: 'network',
      status: null,
      message: `Circuit open for ${circuitKey}`,
      details: { circuitKey },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let accessToken: string | null;
  try {
    accessToken = await getAccessToken();
  } catch {
    accessToken = null;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Client': 'mobile',
    'X-Client-Version': '1.0.0',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (__DEV__) {
    console.log('[api] →', {
      method,
      url,
      body: options.body,
    });
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      signal: options.signal ?? controller.signal,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 401 && !options.skipAuthRetry) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return request<T>(method, path, { ...options, skipAuthRetry: true });
      }
    }

    if (!response.ok) {
      const traceId = response.headers.get('x-trace-id') ?? undefined;
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterMs = parseRetryAfter(retryAfterHeader);
      const payload = await safeJson(response);
      const message =
        (payload && typeof payload === 'object' && 'message' in payload && typeof (payload as { message: unknown }).message === 'string'
          ? ((payload as { message: string }).message)
          : null) ?? response.statusText;

      const apiError = new ApiError({
        kind: mapStatusToKind(response.status),
        status: response.status,
        message,
        ...(traceId ? { traceId } : {}),
        details: { ...(payload && typeof payload === 'object' ? payload : {}), retryAfterMs },
      });

      // The breaker only cares about retryable, server-side failure modes.
      if (breakerEnabled && apiError.isRetryable) {
        breaker.recordFailure();
      } else if (breakerEnabled) {
        breaker.recordSuccess();
      }
      throw apiError;
    }

    if (breakerEnabled) breaker.recordSuccess();
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } catch (error) {
    if (__DEV__) {
      const err = error as Error & { cause?: unknown };
      console.warn('[api] fetch failed', {
        method,
        url,
        body: options.body,
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
        cause: err?.cause,
        raw: String(error),
      });
    }
    if (error instanceof CircuitOpenError) throw error;
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      if (breakerEnabled) breaker.recordFailure();
      throw new ApiError({ kind: 'timeout', status: null, message: 'Request timed out' });
    }
    if (breakerEnabled) breaker.recordFailure();
    const msg =
      error instanceof Error && error.message
        ? `Network unavailable (${error.message})`
        : 'Network unavailable';
    throw new ApiError({ kind: 'network', status: null, message: msg });
  } finally {
    clearTimeout(timeout);
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const asSeconds = Number(header);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) return asSeconds * 1000;
  const asDate = Date.parse(header);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && data.session !== null;
  } catch {
    return false;
  }
}

export const http: HttpClient = {
  get: (path, options) => request('GET', path, options),
  post: (path, body, options) => request('POST', path, { ...options, body }),
  put: (path, body, options) => request('PUT', path, { ...options, body }),
  patch: (path, body, options) => request('PATCH', path, { ...options, body }),
  delete: (path, options) => request('DELETE', path, options),
};
