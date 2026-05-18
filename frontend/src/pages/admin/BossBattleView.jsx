import React, { useEffect } from 'react';
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

  // Sync Firebase state with game adapter whenever either changes
  useEffect(() => {
    if (gameState) {
      gameStateAdapter.setGameState(gameState, teams);
    }
  }, [gameState, teams]);

  if (!gameState) {
    return (
      <div className="p-8 max-w-md">
        <h2 className="font-orbitron text-2xl text-[var(--neon-red)] mb-6">BOSS BATTLE</h2>
        <div className="bg-[var(--bg-raised)] border border-[var(--neon-red)] rounded p-6">
          <p className="font-rajdhani text-[var(--text-secondary)] mb-2">NO ACTIVE EVENT LOADED</p>
          <p className="font-mono text-xs text-[var(--text-tertiary)]">
            Select an event from Arena View first
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="App w-full h-full"
      data-testid="app-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
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
    </div>
  );
}

