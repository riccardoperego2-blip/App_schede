/**
 * Monotonic clock anchored at module load.
 *
 * `Date.now()` is wall-clock and can jump backwards (manual time changes,
 * NTP corrections, time-zone DST). For interval math during a workout —
 * elapsed time, paused durations, rest timer — we need a clock that only
 * moves forward.
 *
 * Strategy:
 *  - Record an anchor of `(wallClock, performanceNow)` at module load.
 *  - `monotonicNow()` returns wallClock + performanceNowDelta.
 *  - If the wall clock jumps relative to performance time by more than
 *    1 second, we re-anchor to the new wall clock. This avoids tiny
 *    drift accumulating forever after a real time change.
 */

const DRIFT_RESYNC_THRESHOLD_MS = 1000;

let wallAnchor = Date.now();
let perfAnchor = nowPerf();

function nowPerf(): number {
  // `performance.now` is available on Hermes & JSC; fall back to Date.now
  // when the runtime does not expose it (e.g. some test environments).
  const perf = (globalThis as { performance?: { now: () => number } }).performance;
  return perf && typeof perf.now === 'function' ? perf.now() : Date.now();
}

export function monotonicNow(): number {
  const wallNow = Date.now();
  const perfNow = nowPerf();
  const perfDelta = perfNow - perfAnchor;
  const expectedWall = wallAnchor + perfDelta;
  const drift = wallNow - expectedWall;
  if (Math.abs(drift) > DRIFT_RESYNC_THRESHOLD_MS) {
    wallAnchor = wallNow;
    perfAnchor = perfNow;
    return wallNow;
  }
  return expectedWall;
}

/** For tests only. */
export function resetMonotonicAnchorForTests(now: number = Date.now()): void {
  wallAnchor = now;
  perfAnchor = nowPerf();
}
