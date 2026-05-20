import React, { useState, useEffect } from 'react';
import { useGlobalGameState, useLeaderboardContext, useEvent } from '../../context';
import { useBattleLog } from '../../hooks';
import { organiserControl } from '../../firebase/functions';
import HudPanel from '../../components/layout/HudPanel';
import HudButton from '../../components/layout/HudButton';

/**
 * Arena View - Organizer game control console
 */
export default function ArenaView() {
  const { eventId: contextEventId, setEventId } = useEvent();
  const [selectedEventId, setSelectedEventId] = useState(contextEventId);

  // Update when context changes
  useEffect(() => {
    if (contextEventId) {
      setSelectedEventId(contextEventId);
    } else {
      // Try to get from sessionStorage
      const stored = sessionStorage.getItem('tw_eventId');
      if (stored) {
        setSelectedEventId(stored);
      }
    }
  }, [contextEventId]);

  const { gameState } = useGlobalGameState();
  const { teams } = useLeaderboardContext();
  const { log } = useBattleLog(selectedEventId);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleControl = async (action) => {
    setLoading(true);
    setMessage('');

    try {
      await organiserControl({
        eventId: selectedEventId,
        action,
      });

      setMessage(`✓ ${action} EXECUTED`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Control error:', err);
      setMessage(`✗ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Show message if no event selected
  if (!selectedEventId) {
    return (
      <div className="p-8 max-w-md">
        <h2 className="font-orbitron text-2xl text-[var(--neon-cyan)] mb-6">NO EVENT SELECTED</h2>
        <HudPanel className="p-6">
          <p className="font-rajdhani text-[var(--text-secondary)] mb-4">
            Please select an event from the Event Genesis page to begin.
          </p>
          <p className="font-mono text-xs text-[var(--text-muted)]">
            Navigate to Event Genesis, select an event from the Recent Events section, and try again.
          </p>
        </HudPanel>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="p-8">
        <p className="font-rajdhani text-[var(--neon-yellow)] mb-4">
          Loading event: {selectedEventId}...
        </p>
        <p className="font-mono text-[var(--text-secondary)] text-sm mb-6">
          Make sure this event exists in Firestore
        </p>
        <button
          onClick={() => {
            setSelectedEventId('');
            setEventId(null);
          }}
          className="px-4 py-2 bg-[var(--neon-red)] text-white font-rajdhani rounded hover:bg-[var(--neon-red)]/80"
        >
          CHANGE EVENT
        </button>
      </div>
    );
  }

  const bossHpPercent =
    gameState.boss_max_hp > 0
      ? (gameState.boss_current_hp / gameState.boss_max_hp) * 100
      : 0;

  return (
    <div className="p-8 flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="font-orbitron text-4xl text-[var(--neon-red)] mb-2">
          BOSS: {gameState.boss_name?.toUpperCase() || 'UNKNOWN'}
        </h1>
        <p className="font-mono text-[var(--text-secondary)] text-sm">
          EVENT: {selectedEventId} | STATUS: {gameState.game_status}
        </p>
      </div>

      {/* Boss HP Display */}
      <HudPanel className="p-6">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-rajdhani font-bold text-[var(--text-primary)]">
              BOSS VITALITY
            </span>
            <span className="font-mono text-[var(--neon-red)]">
              {gameState.boss_current_hp} / {gameState.boss_max_hp} HP
            </span>
          </div>
          <div className="h-4 bg-[var(--bg-raised)] border border-[var(--neon-red)] rounded-sm overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--neon-red)] to-[var(--neon-amber)] transition-all duration-300"
              style={{ width: `${bossHpPercent}%` }}
            ></div>
          </div>
          <div className="text-right text-xs font-mono text-[var(--text-muted)] mt-1">
            {Math.round(bossHpPercent)}% OPERATIONAL
          </div>
        </div>
      </HudPanel>

      {/* Game Controls */}
      <HudPanel className="p-6">
        <h2 className="font-rajdhani font-bold text-[var(--neon-cyan)] tracking-[0.3em] mb-4">
          GAME CONTROLS
        </h2>

        {message && (
          <div className="mb-4 p-3 bg-[var(--neon-green)]/10 border border-[var(--neon-green)] text-[var(--neon-green)] font-mono text-sm rounded">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <HudButton
            variant={
              gameState.game_status === 'ACTIVE'
                ? 'danger'
                : 'success'
            }
            disabled={loading}
            onClick={() =>
              handleControl(
                gameState.game_status === 'ACTIVE' ? 'PAUSE' : 'START'
              )
            }
            className="w-full"
          >
            {gameState.game_status === 'ACTIVE' ? '⏸ PAUSE' : '▶ START'}
          </HudButton>

          {gameState.game_status === 'PAUSED' && (
            <HudButton
              disabled={loading}
              onClick={() => handleControl('RESUME')}
              className="w-full"
            >
              ▶ RESUME
            </HudButton>
          )}

          <HudButton
            variant="danger"
            disabled={loading}
            onClick={() => handleControl('ADVANCE_PUZZLE')}
            className="w-full"
          >
            → SKIP PUZZLE
          </HudButton>

          <HudButton
            variant="danger"
            disabled={loading}
            onClick={() => {
              if (
                window.confirm(
                  'END THE GAME AND SHOW FINAL PODIUM?'
                )
              ) {
                handleControl('INSTANT_KILL');
              }
            }}
            className="w-full col-span-2"
          >
            ⚰ INSTANT KILL
          </HudButton>

          <HudButton
            variant="danger"
            disabled={loading}
            onClick={() => {
              if (window.confirm('RESET BOSS TO FULL HEALTH?')) {
                handleControl('RESET');
              }
            }}
            className="w-full col-span-2"
          >
            🔄 RESET GAME
          </HudButton>
        </div>
      </HudPanel>

      {/* Leaderboard */}
      <HudPanel className="p-6">
        <h2 className="font-rajdhani font-bold text-[var(--neon-cyan)] tracking-[0.3em] mb-4">
          LIVE LEADERBOARD
        </h2>
        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {teams.slice(0, 15).map((team, idx) => (
            <div
              key={team.teamId}
              className="flex justify-between items-center p-3 bg-[var(--bg-raised)] rounded border border-[var(--border-dim)]"
            >
              <div className="flex-1">
                <div className="font-rajdhani font-semibold text-[var(--text-primary)]">
                  <span className="font-orbitron text-xs text-[var(--text-muted)] mr-2">
                    #{idx + 1}
                  </span>
                  {team.team_name}
                </div>
                <div className="text-xs font-mono text-[var(--text-muted)]">
                  {team.puzzles_solved} solved | {team.hint_tokens} hints
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[var(--neon-green)] font-bold">
                  {team.total_damage_dealt} DMG
                </div>
              </div>
            </div>
          ))}
        </div>
      </HudPanel>

      {/* Battle Log */}
      <HudPanel className="p-6">
        <h2 className="font-rajdhani font-bold text-[var(--neon-cyan)] tracking-[0.3em] mb-4">
          BATTLE LOG
        </h2>
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto font-mono text-xs">
          {log.length === 0 ? (
            <p className="text-[var(--text-muted)]">No events yet...</p>
          ) : (
            log.map((entry, idx) => (
              <div key={idx} className="text-[var(--text-secondary)]">
                <span className="text-[var(--neon-cyan)]">[{entry.timestamp?.toDate?.()?.toLocaleTimeString() || '?'}]</span>{' '}
                <span className="text-[var(--neon-amber)]">{entry.team_name}</span> •{' '}
                {entry.message}
              </div>
            ))
          )}
        </div>
      </HudPanel>
    </div>
  );
}
