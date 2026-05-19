import { useEffect, useMemo, useState } from 'react';

/** Ticks every second while a session is in progress so elapsed time stays live. */
export function useSessionElapsed(
  startedAt: string | null,
  totalPausedMs: number,
  active: boolean,
): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active || !startedAt) return undefined;
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [active, startedAt]);

  return useMemo(() => {
    if (!startedAt) return 0;
    return Math.floor((Date.now() - Date.parse(startedAt) - totalPausedMs) / 1000);
  }, [startedAt, totalPausedMs, tick]);
}

export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}' ${secs.toString().padStart(2, '0')}"`;
}
