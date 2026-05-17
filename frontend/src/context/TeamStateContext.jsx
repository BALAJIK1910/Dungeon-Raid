import { createContext, useContext } from 'react';
import { useTeamState } from '../hooks';
import { useEvent } from './EventContext';
import { useAuth } from './AuthContext';

const TeamStateContext = createContext();

/**
 * Team State Provider - provides real-time team state to player components
 * Only provides data if user is authenticated as team
 */
export function TeamStateProvider({ children }) {
  const { eventId } = useEvent();
  const { claims } = useAuth();
  const teamId = claims?.teamId || sessionStorage.getItem('tw_teamId');

  const { teamState, loading, error } = useTeamState(eventId, teamId);

  const value = {
    teamState,
    teamId,
    loading,
    error,
  };

  return (
    <TeamStateContext.Provider value={value}>{children}</TeamStateContext.Provider>
  );
}

/**
 * Hook to access team state
 */
export function useTeamContext() {
  const context = useContext(TeamStateContext);
  if (!context) {
    throw new Error('useTeamContext must be used within TeamStateProvider');
  }
  return context;
}

export default TeamStateContext;
