import { useEffect, useState } from 'react';

export function useRestTimer(restEndsAt: string | null): { remainingSeconds: number; isActive: boolean } {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!restEndsAt) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [restEndsAt]);

  if (!restEndsAt) return { remainingSeconds: 0, isActive: false };
  const remaining = Math.max(0, Math.ceil((Date.parse(restEndsAt) - now) / 1000));
  return { remainingSeconds: remaining, isActive: remaining > 0 };
}
