import React, { useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { useBossBattleSync } from '../../hooks/useBossBattleSync';
import BossBattleRaid from '../../components/boss-battle/BossBattleRaid';

export default function BossBattleView() {
  const { eventId } = useEvent();
  const battleData = useBossBattleSync(eventId);

  if (!eventId) {
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
      className="w-full h-full"
      data-testid="boss-battle-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <BossBattleRaid
        players={battleData.players}
        damages={battleData.damages}
        bossHealth={battleData.bossHealth}
        bossMaxHealth={battleData.bossMaxHealth}
        combatLog={battleData.combatLog}
        phase={battleData.phase}
        currentRound={battleData.currentRound}
        isGameOver={battleData.isGameOver}
        mvpPlayer={battleData.mvpPlayer}
        gameOutcome={battleData.gameOutcome}
        lowHp={battleData.lowHp}
        gameStatus={battleData.gameStatus}
        gameStartedAt={battleData.gameStartedAt}
        gamePausedAt={battleData.gamePausedAt}
        gameResumedAt={battleData.gameResumedAt}
        concludedAt={battleData.concludedAt}
        totalPausedDurationMs={battleData.totalPausedDurationMs}
      />
    </div>
  );
}

