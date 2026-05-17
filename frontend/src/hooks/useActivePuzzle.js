import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook to listen to active puzzle
 * Listens to: /events/{eventId}/puzzle_pool/{puzzleId}
 * Security Rules restrict access to player-safe fields only
 * @param {string} eventId - The event ID
 * @param {string} puzzleId - The puzzle ID
 * @returns {object} { puzzle, loading, error }
 */
export function useActivePuzzle(eventId, puzzleId) {
  const [puzzle, setPuzzle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🧩 useActivePuzzle called:', { eventId, puzzleId });
    
    if (!eventId || !puzzleId) {
      console.log('⚠️ Missing params:', { hasEventId: !!eventId, hasPuzzleId: !!puzzleId });
      setLoading(false);
      return;
    }

    console.log(`📡 Subscribing to: /events/${eventId}/puzzle_pool/${puzzleId}`);
    
    const unsubscribe = onSnapshot(
      doc(db, 'events', eventId, 'puzzle_pool', puzzleId),
      (snapshot) => {
        if (snapshot.exists()) {
          console.log('✅ Puzzle loaded:', snapshot.data());
          setPuzzle(snapshot.data());
          setError(null);
        } else {
          console.log('❌ Puzzle document does not exist');
          setPuzzle(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('❌ Error fetching active puzzle:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [eventId, puzzleId]);

  return { puzzle, loading, error };
}

export default useActivePuzzle;
