import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook to listen to puzzle pool (admin only)
 * Listens to: /events/{eventId}/puzzle_pool (ordered by sequence_order ASC)
 * @param {string} eventId - The event ID
 * @returns {object} { puzzles, loading, error }
 */
export function usePuzzlePool(eventId) {
  const [puzzles, setPuzzles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'events', eventId, 'puzzle_pool'),
      orderBy('sequence_order', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const puzzlesData = snapshot.docs.map((doc) => ({
          puzzleId: doc.id,
          ...doc.data(),
        }));
        setPuzzles(puzzlesData);
        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching puzzle pool:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [eventId]);

  return { puzzles, loading, error };
}

export default usePuzzlePool;
