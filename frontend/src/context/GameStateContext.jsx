import { createContext, useContext } from 'react';
import { useGameState } from '../hooks';
import { useEvent } from './EventContext';

const GameStateContext = createContext();

/**
 * Game State Provider - provides real-time game state to entire app
 * Prevents multiple subscriptions by centralizing the listener
 */
export function GameStateProvider({ children }) {
  const { eventId } = useEvent();
  const { gameState, loading, error } = useGameState(eventId);

  const value = {
    gameState,
    loading,
    error,
  };

  return (
    <GameStateContext.Provider value={value}>{children}</GameStateContext.Provider>
  );
}

/**
 * Hook to access game state
 */
export function useGlobalGameState() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGlobalGameState must be used within GameStateProvider');
  }
  return context;
}

export default GameStateContext;
