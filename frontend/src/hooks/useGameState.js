import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook to listen to global game state
 * Listens to the event document and legacy global_state mirror
 * @param {string} eventId - The event ID
 * @returns {object} { gameState, loading, error }
 */
export function useGameState(eventId) {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    let eventState = null;
    let legacyState = null;
    let eventLoaded = false;
    let legacyLoaded = false;
    let lastError = null;

    const publishState = () => {
      if (!eventLoaded && !legacyLoaded) return;

      const mergedState = {
        ...(legacyState || {}),
        ...(eventState || {}),
      };

      setGameState(Object.keys(mergedState).length > 0 ? mergedState : null);
      setError(lastError);
      setLoading(false);
    };

    const unsubscribeEvent = onSnapshot(
      doc(db, 'events', eventId),
      (snapshot) => {
        eventLoaded = true;
        eventState = snapshot.exists() ? { eventId: snapshot.id, ...snapshot.data() } : null;
        lastError = null;
        publishState();
      },
      (err) => {
        console.error('Error fetching event state:', err);
        eventLoaded = true;
        lastError = err.message;
        publishState();
      }
    );

    const unsubscribeLegacyState = onSnapshot(
      doc(db, 'events', eventId, 'global_state', 'state'),
      (snapshot) => {
        legacyLoaded = true;
        legacyState = snapshot.exists() ? snapshot.data() : null;
        publishState();
      },
      (err) => {
        console.warn('Legacy game state mirror unavailable:', err);
        legacyLoaded = true;
        publishState();
      }
    );

    return () => {
      unsubscribeEvent();
      unsubscribeLegacyState();
    };
  }, [eventId]);

  return { gameState, loading, error };
}

export default useGameState;
