import { useEffect, useState } from 'react';
import { monotonicNow } from '../lib/health/monotonic-clock';

/**
 * Re-renders at most every `intervalMs` while `active` is true, returning the
 * monotonic clock value. Use this for timers that must keep moving forward
 * even if the device wall-clock changes during the workout (NTP, manual
 * change, DST).
 */
export function useMonotonicTick(intervalMs: number, active: boolean): number {
  const [now, setNow] = useState<number>(() => monotonicNow());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(monotonicNow()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
