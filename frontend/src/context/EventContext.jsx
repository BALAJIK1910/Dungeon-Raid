import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';

const EventContext = createContext();

/**
 * Event Provider - manages current event ID
 * Provides eventId to hooks that need it
 */
export function EventProvider({ children }) {
  const location = useLocation();
  const routeEventId = useMemo(() => {
    const match = location.pathname.match(/^\/play\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [location.pathname]);

  const [manualEventId, setManualEventId] = useState(() => {
    return sessionStorage.getItem('tw_eventId');
  });

  const selectEventId = useCallback((nextEventId) => {
    const normalizedEventId = nextEventId?.trim();

    if (normalizedEventId) {
      setManualEventId(normalizedEventId);
      sessionStorage.setItem('tw_eventId', normalizedEventId);
    } else {
      setManualEventId(null);
      sessionStorage.removeItem('tw_eventId');
    }
  }, []);

  useEffect(() => {
    if (routeEventId) {
      sessionStorage.setItem('tw_eventId', routeEventId);
    }
  }, [routeEventId]);

  const eventId = routeEventId || manualEventId;
  const value = { eventId, setEventId: selectEventId };

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

/**
 * Hook to access event context
 */
export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within EventProvider');
  }
  return context;
}

export default EventContext;
