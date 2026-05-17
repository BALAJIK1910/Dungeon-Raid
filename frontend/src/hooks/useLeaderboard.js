import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook to listen to leaderboard (teams ordered by damage)
 * Listens to: /events/{eventId}/teams (ordered by total_damage_dealt DESC)
 * @param {string} eventId - The event ID
 * @returns {object} { teams, loading, error }
 */
export function useLeaderboard(eventId) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'events', eventId, 'teams'),
      orderBy('total_damage_dealt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const teamsData = snapshot.docs.map((doc) => ({
          teamId: doc.id,
          ...doc.data(),
        }));
        setTeams(teamsData);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching leaderboard:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [eventId]);

  return { teams, loading, error };
}

export default useLeaderboard;
