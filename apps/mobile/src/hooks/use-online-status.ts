import { useEffect, useState } from 'react';
import { onlineManager } from '@tanstack/react-query';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(onlineManager.isOnline());
  useEffect(() => {
    const unsubscribe = onlineManager.subscribe((value) => setIsOnline(value));
    return () => {
      unsubscribe();
    };
  }, []);
  return isOnline;
}
