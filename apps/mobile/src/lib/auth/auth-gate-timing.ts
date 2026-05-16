let originMs = Date.now();

export function resetAuthGateTiming(): void {
  originMs = Date.now();
}

/** Dev-only relative timing for cold-start / auth gate. */
export function logAuthGateTiming(phase: string, extra?: Record<string, unknown>): void {
  if (!__DEV__) return;
  const elapsedMs = Date.now() - originMs;
  if (extra) {
    console.log(`[auth-timing] ${phase} +${elapsedMs}ms`, extra);
  } else {
    console.log(`[auth-timing] ${phase} +${elapsedMs}ms`);
  }
}
