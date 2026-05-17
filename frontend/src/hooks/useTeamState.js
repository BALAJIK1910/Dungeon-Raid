import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook to listen to team state
 * Listens to: /events/{eventId}/teams/{teamId}
 * @param {string} eventId - The event ID
 * @param {string} teamId - The team ID
 * @returns {object} { teamState, loading, error }
 */
export function useTeamState(eventId, teamId) {
  const [teamState, setTeamState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId || !teamId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'events', eventId, 'teams', teamId),
      (snapshot) => {
        if (snapshot.exists()) {
          setTeamState(snapshot.data());
          setError(null);
        } else {
          setTeamState(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching team state:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [eventId, teamId]);

  return { teamState, loading, error };
}

export default useTeamState;
