import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook to listen to battle log (latest 50 entries)
 * Listens to: /events/{eventId}/battle_log (ordered by timestamp DESC, limit 50)
 * @param {string} eventId - The event ID
 * @returns {object} { log, loading, error }
 */
export function useBattleLog(eventId) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'events', eventId, 'battle_log'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logData = snapshot.docs.map((doc) => ({
          logId: doc.id,
          ...doc.data(),
        }));
        setLog(logData);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching battle log:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [eventId]);

  return { log, loading, error };
}

export default useBattleLog;
