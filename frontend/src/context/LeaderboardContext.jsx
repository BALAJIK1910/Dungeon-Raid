import { createContext, useContext } from 'react';
import { useLeaderboard } from '../hooks';
import { useEvent } from './EventContext';

const LeaderboardContext = createContext();

/**
 * Leaderboard Provider - provides real-time team rankings
 * Shared by both player and organizer views
 */
export function LeaderboardProvider({ children }) {
  const { eventId } = useEvent();
  const { teams, loading, error } = useLeaderboard(eventId);

  const value = {
    teams,
    loading,
    error,
  };

  return (
    <LeaderboardContext.Provider value={value}>{children}</LeaderboardContext.Provider>
  );
}

/**
 * Hook to access leaderboard
 */
export function useLeaderboardContext() {
  const context = useContext(LeaderboardContext);
  if (!context) {
    throw new Error('useLeaderboardContext must be used within LeaderboardProvider');
  }
  return context;
}

export default LeaderboardContext;
