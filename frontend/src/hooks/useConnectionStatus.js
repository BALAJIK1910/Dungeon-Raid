import { useState, useEffect } from 'react';

/**
 * Hook to monitor browser network status.
 * Firestore does not support the Realtime Database .info/connected sentinel.
 * @returns {boolean} True if the browser reports an active network connection
 */
export function useConnectionStatus() {
  const [online, setOnline] = useState(() => {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  });

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
}

export default useConnectionStatus;
