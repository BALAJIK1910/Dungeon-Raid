import React, { useEffect, useCallback } from 'react';
import { useGlobalGameState, useLeaderboardContext } from '../../context';
import { gameStateAdapter } from '../../utils/gameStateAdapter';
import GameManager from '../../components/boss-battle/GameManager';
import HealthBar from '../../components/boss-battle/HealthBar';
import Leaderboard from '../../components/boss-battle/Leaderboard';
import ActionFigures from '../../components/boss-battle/ActionFigures';
import Scorecard from '../../components/boss-battle/Scorecard';

export default function BossBattleView() {
  const { gameState } = useGlobalGameState();
  const { teams } = useLeaderboardContext();

  useEffect(() => {
    if (gameState && teams) {
      gameStateAdapter.updateFromFirebase(gameState, teams);
    }
  }, [gameState, teams]);

  if (!gameState) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '300px',
          fontFamily: "'Courier New',monospace",
          color: '#3a5a20',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ fontSize: '13px', letterSpacing: '0.12em' }}>
          NO ACTIVE EVENT LOADED
        </div>
        <div style={{ fontSize: '10px', color: '#2a3a18' }}>
          Select an event from Arena View first
        </div>
      </div>
    );
  }

  return (
    <div
      className="App"
      data-testid="app-container"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        background: '#050505'
      }}
    >
      {/* Phaser Game Canvas Layer */}
      <GameManager />

      {/* React UI Overlay Layer */}
      <div
        className="absolute inset-0 z-10 flex flex-col justify-between"
        style={{ pointerEvents: 'none' }}
      >
        {/* Top UI Elements */}
        <div>
          <HealthBar />
          <Leaderboard />
        </div>

        {/* Bottom UI Elements */}
        <ActionFigures />
      </div>

      {/* Scorecard Overlay */}
      <Scorecard />

      {/* Instructions */}
      <div
        data-testid="instructions"
        className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md border border-yellow-400/30 p-4 max-w-xs z-20"
        style={{ pointerEvents: 'auto' }}
      >
        <p
          className="text-yellow-400 text-sm font-bold mb-2"
          style={{ fontFamily: 'Exo 2, sans-serif' }}
        >
          HOW TO PLAY
        </p>
        <p
          className="text-gray-300 text-xs"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          Click anywhere to attack! Watch teams battle the celestial dragon in
          real-time. First to defeat wins!
        </p>
      </div>
    </div>
  );
}
