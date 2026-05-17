import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGlobalGameState,
  useTeamContext,
  useLeaderboardContext,
  useEvent,
  useAuth,
} from '../context';
import {
  useActivePuzzle,
  useConnectionStatus,
} from '../hooks';
import { submitAnswer } from '../firebase/functions';
import { getTimeRemaining, msToMMSS } from '../utils/gameUtils';
import HudPanel from '../components/layout/HudPanel';
import HudButton from '../components/layout/HudButton';

/**
 * Loading screen with animated circuit trace
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
      <div className="text-center">
        <div className="font-orbitron text-3xl text-[var(--neon-cyan)] mb-6 animate-pulse">
          ◄►
        </div>
        <p className="font-rajdhani text-[var(--neon-cyan)]">
          INITIALIZING WARZONE CONNECTION...
        </p>
      </div>
    </div>
  );
}

/**
 * Pending/Standby screen - waiting for organizer to start
 */
function StandbyScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)] p-4">
      <HudPanel className="text-center max-w-md p-8">
        <div className="font-orbitron text-4xl text-[var(--neon-cyan)] mb-4 animate-pulse">
          ◆
        </div>
        <h2 className="font-orbitron text-xl text-[var(--text-primary)] mb-2">
          AWAITING RAID MASTER
        </h2>
        <p className="font-rajdhani text-[var(--text-secondary)] mb-6">
          Authorization pending... live scoreboard active
        </p>
        <div className="h-[1px] w-full bg-[var(--neon-cyan)] opacity-20 my-6"></div>
        <p className="font-mono text-xs text-[var(--text-muted)] animate-pulse">
          ⟳ Waiting for event start...
        </p>
      </HudPanel>
    </div>
  );
}

/**
 * Pause overlay - game is paused
 */
function PauseOverlay() {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <HudPanel className="text-center max-w-md p-8">
        <div className="font-orbitron text-4xl text-[var(--neon-amber)] mb-4">
          ⏸
        </div>
        <h2 className="font-orbitron text-2xl text-[var(--neon-amber)]">
          GAME PAUSED
        </h2>
        <p className="font-rajdhani text-[var(--text-secondary)] mt-4">
          Raid Master has suspended operations
        </p>
      </HudPanel>
    </div>
  );
}

/**
 * Cooldown overlay - team has submitted wrong answer
 */
function CooldownOverlay({ cooldownExpiry, strikeCount }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(cooldownExpiry));
    }, 100);
    return () => clearInterval(interval);
  }, [cooldownExpiry]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
      <HudPanel className="text-center max-w-md p-8">
        <div className="font-orbitron text-4xl text-[var(--neon-red)] mb-4 animate-pulse">
          ⚠
        </div>
        <h2 className="font-orbitron text-2xl text-[var(--neon-red)] mb-2">
          STRIKE {strikeCount}
        </h2>
        <p className="font-rajdhani text-[var(--text-secondary)] mb-6">
          SYSTEM LOCK ACTIVE — RECHARGE IN
        </p>
        <div className="font-orbitron text-5xl text-[var(--neon-red)] tracking-widest mb-4">
          {msToMMSS(remaining)}
        </div>
        <p className="font-mono text-xs text-[var(--text-muted)]">
          PENALTY MULTIPLIER APPLIED
        </p>
      </HudPanel>
    </div>
  );
}

/**
 * Intermission overlay - between puzzles
 */
function IntermissionOverlay({ intermissionExpiry, lastSolvedBy }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(intermissionExpiry));
    }, 100);
    return () => clearInterval(interval);
  }, [intermissionExpiry]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
      <HudPanel className="text-center max-w-md p-8">
        <div className="font-orbitron text-4xl text-[var(--neon-green)] mb-4 animate-bounce">
          ★
        </div>
        <h2 className="font-orbitron text-xl text-[var(--neon-green)] mb-2">
          CRITICAL HIT
        </h2>
        <p className="font-rajdhani text-[var(--neon-amber)]">
          {lastSolvedBy?.toUpperCase()}
        </p>
        <div className="h-[1px] w-full bg-[var(--neon-green)] opacity-20 my-4"></div>
        <p className="font-rajdhani text-[var(--text-secondary)] mb-4">
          NEXT DIRECTIVE IN
        </p>
        <div className="font-orbitron text-3xl text-[var(--neon-cyan)]">
          {msToMMSS(remaining)}
        </div>
      </HudPanel>
    </div>
  );
}

/**
 * Conclusion overlay - game has ended
 */
function VictoryScreen({ gameState }) {
  const won = gameState?.game_outcome === 'WON' || (gameState?.boss_current_hp || 0) <= 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <HudPanel className="text-center max-w-md p-8">
        <div
          className={`font-orbitron text-5xl mb-4 animate-pulse ${
            won ? 'text-[var(--neon-green)]' : 'text-[var(--neon-red)]'
          }`}
        >
          ✦✧✦
        </div>
        <h2
          className={`font-orbitron text-3xl ${
            won ? 'text-[var(--neon-green)]' : 'text-[var(--neon-red)]'
          }`}
        >
          {won ? 'RAID WON' : 'RAID FAILED'}
        </h2>
        <p className="font-rajdhani text-[var(--text-secondary)] mt-4">
          {won ? 'THE BOSS HAS FALLEN' : 'QUESTION POOL EXHAUSTED'}
        </p>
        <p className="font-mono text-sm text-[var(--text-muted)] mt-4">
          BOSS HP: {gameState?.boss_current_hp || 0} / {gameState?.boss_max_hp || 0}
        </p>
      </HudPanel>
    </div>
  );
}

/**
 * Answer input form
 */
function AnswerInput({ puzzle, onSubmit, isLoading }) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    await onSubmit(answer);
    setAnswer('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative border border-[var(--border-dim)] bg-[var(--bg-raised)] p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-[var(--neon-cyan)] font-mono">&gt;</span>
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={isLoading}
          autoFocus
          placeholder="ENTER SOLUTION"
          className="bg-transparent border-none outline-none text-[var(--text-primary)] font-mono flex-1 placeholder:text-[var(--text-muted)]"
        />
      </div>
      <HudButton
        type="submit"
        variant="success"
        disabled={isLoading || !answer.trim()}
        className="w-full flex items-center justify-center gap-2"
      >
        <span className="text-xl">⚡</span> {isLoading ? 'SUBMITTING...' : 'DEPLOY ATTACK'}
      </HudButton>
    </form>
  );
}

/**
 * Main Player Portal component with game state machine
 */
export default function PlayerPortal() {
  const navigate = useNavigate();
  const { eventId } = useEvent();
  const { user } = useAuth();
  const { gameState, loading: gameLoading, error: gameError } = useGlobalGameState();
  const { teamState, loading: teamLoading } = useTeamContext();
  const { teams } = useLeaderboardContext();
  const online = useConnectionStatus();

  const { puzzle } = useActivePuzzle(eventId, gameState?.active_puzzle_id);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');

  // DEBUG: Log component mount
  useEffect(() => {
    console.log('🎮 PlayerPortal mounted');
    console.log('  eventId:', eventId);
    console.log('  teamId:', sessionStorage.getItem('tw_teamId'));
    console.log('  gameState:', gameState);
    console.log('  gameError:', gameError);
    console.log('  gameLoading:', gameLoading);
    console.log('  teamState:', teamState);
    console.log('  active_puzzle_id:', gameState?.active_puzzle_id);
    console.log('  puzzle:', puzzle);
  }, [eventId, gameState, gameError, gameLoading, teamState, puzzle]);

  // Guard: require team registration (sessionStorage)
  const teamId = sessionStorage.getItem('tw_teamId');
  if (!eventId || !teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <HudPanel className="text-center p-8">
          <p className="font-rajdhani text-[var(--neon-red)] mb-4">
            NO VALID SESSION
          </p>
          <button
            onClick={() => navigate('/join')}
            className="px-4 py-2 bg-[var(--neon-blue)] text-black font-rajdhani rounded"
          >
            RETURN TO JOIN
          </button>
        </HudPanel>
      </div>
    );
  }

  // Loading states
  if (gameLoading || teamLoading) {
    return <LoadingScreen />;
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <HudPanel className="text-center p-8">
          <p className="font-rajdhani text-[var(--neon-red)]">
            EVENT NOT FOUND — CHECK CONNECTION CODE
          </p>
        </HudPanel>
      </div>
    );
  }

  if (!teamState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <HudPanel className="text-center p-8 max-w-md">
          <p className="font-rajdhani text-[var(--neon-red)] mb-4 text-xl">
            TEAM LOGIN REMOVED
          </p>
          <p className="font-mono text-sm text-[var(--text-secondary)] mb-6">
            Raid Master revoked this team session.
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem('tw_eventId');
              sessionStorage.removeItem('tw_teamId');
              sessionStorage.removeItem('tw_teamName');
              navigate('/join');
            }}
            className="px-4 py-2 bg-[var(--neon-red)] text-white font-rajdhani rounded"
          >
            RETURN TO JOIN
          </button>
        </HudPanel>
      </div>
    );
  }

  // Connection status banner
  if (!online) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-deep)]">
        <HudPanel className="text-center max-w-md p-8">
          <p className="font-rajdhani text-[var(--neon-amber)] mb-4">
            ⚠ SIGNAL LOST
          </p>
          <p className="font-mono text-sm text-[var(--text-secondary)]">
            Reconnecting to warzone servers...
          </p>
        </HudPanel>
      </div>
    );
  }

  // Handle answer submission
  const handleSubmitAnswer = async (answerText) => {
    setSubmitting(true);
    setSubmitError('');
    setSubmitMessage('');

    try {
      const result = await submitAnswer({
        eventId,
        puzzleId: gameState.active_puzzle_id,
        answerText,
      });

      const { status, message } = result.data;

      if (status === 'CORRECT') {
        setSubmitMessage(`✓ CRITICAL HIT: +${result.data.damage_dealt} DMG`);
        setTimeout(() => setSubmitMessage(''), 3000);
      } else if (status === 'WRONG') {
        setSubmitError(`✗ INCORRECT — COOLDOWN ${result.data.cooldown_seconds}s`);
      } else if (status === 'TOO_LATE') {
        setSubmitError('⏱ TOO LATE — ANOTHER OPERATIVE STRUCK FIRST');
      } else {
        setSubmitError(message || 'Submission failed');
      }
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Game state machine
  if (gameState.game_status === 'PENDING') {
    return <StandbyScreen />;
  }

  if (gameState.game_status === 'PAUSED') {
    return <PauseOverlay />;
  }

  if (gameState.game_status === 'CONCLUDED') {
    return <VictoryScreen gameState={gameState} />;
  }

  // Main game view (ACTIVE)
  const isCooldownActive =
    teamState?.submission_cooldown_expiry &&
    getTimeRemaining(teamState.submission_cooldown_expiry) > 0;

  const isIntermission =
    gameState.active_puzzle_status === 'INTERMISSION' &&
    getTimeRemaining(gameState.intermission_until) > 0;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-[60px] bg-[var(--bg-deep)] border-b border-[var(--neon-cyan)] shadow-[var(--glow-cyan)] flex items-center px-4 sticky top-0 z-50">
        <h1 className="font-orbitron text-[var(--text-primary)] text-xl">TECH WARZONE</h1>
        <div className="mx-auto flex gap-6 items-center">
          <span className="font-rajdhani font-bold text-[var(--neon-cyan)] text-lg">
            TEAM: {teamState?.team_name?.toUpperCase()}
          </span>
          <span className="font-orbitron font-bold text-[var(--neon-green)]">
            {teamState?.total_damage_dealt || 0} DMG
          </span>
          <span className="font-mono text-[var(--neon-amber)]">
            🔑 × {teamState?.hint_tokens || 0}
          </span>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Main content */}
        <main className="flex-1 p-6 flex flex-col items-center relative">
          {isIntermission && (
            <IntermissionOverlay
              intermissionExpiry={gameState.intermission_until}
              lastSolvedBy={gameState.last_solved_by_team}
            />
          )}

          {isCooldownActive && (
            <CooldownOverlay
              cooldownExpiry={teamState.submission_cooldown_expiry}
              strikeCount={teamState.cooldown_strike_count || 0}
            />
          )}

          <div className="w-full max-w-3xl">
            {/* Puzzle header */}
            <div className="mb-4">
              <h2 className="font-orbitron font-bold text-xs text-[var(--neon-cyan)] tracking-[0.4em]">
                DIRECTIVE #{puzzle?.sequence_order || '?'}
              </h2>
              <p className="font-mono text-[var(--text-secondary)]">
                {puzzle?.question_type || 'PUZZLE'} — AWAITING INPUT...
              </p>
              <div className="h-[1px] w-full bg-[var(--neon-cyan)] opacity-20 mt-2"></div>
            </div>

            {/* Puzzle content */}
            {puzzle ? (
              <div className="font-mono text-[var(--text-primary)] leading-loose mb-8 whitespace-pre-wrap">
                {puzzle.question_payload}
              </div>
            ) : (
              <div className="font-mono text-[var(--text-secondary)] mb-8">
                LOADING PUZZLE DATA...
              </div>
            )}

            {/* Messages */}
            {submitMessage && (
              <div className="mb-4 p-3 bg-[var(--neon-green)]/10 border border-[var(--neon-green)] text-[var(--neon-green)] font-mono text-sm rounded animate-pulse">
                {submitMessage}
              </div>
            )}

            {submitError && (
              <div className="mb-4 p-3 bg-[var(--neon-red)]/10 border border-[var(--neon-red)] text-[var(--neon-red)] font-mono text-sm rounded animate-pulse">
                {submitError}
              </div>
            )}

            {/* Answer input */}
            <AnswerInput
              puzzle={puzzle}
              onSubmit={handleSubmitAnswer}
              isLoading={submitting || isIntermission || isCooldownActive}
            />
          </div>
        </main>

        {/* Sidebar - Scoreboard */}
        <aside className="w-[320px] border-l border-[var(--border-dim)] p-4 bg-[var(--bg-deep)] max-h-[calc(100vh-60px)] overflow-y-auto">
          <h3 className="font-rajdhani font-bold text-[var(--neon-cyan)] tracking-[0.3em] mb-4 border-b border-[var(--border-dim)] pb-2">
            ◈ COMBAT RANKINGS
          </h3>
          <div className="flex flex-col gap-3">
            {teams.slice(0, 10).map((team, idx) => (
              <div key={team.teamId} className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="font-rajdhani font-semibold text-[var(--text-primary)]">
                    <span className="font-orbitron text-xs text-[var(--text-muted)]">
                      #{idx + 1}
                    </span>{' '}
                    {team.team_name}
                  </span>
                  <span className="font-mono text-[var(--neon-green)] text-sm">
                    {team.total_damage_dealt} DMG
                  </span>
                </div>
                <div className="h-1 bg-[var(--bg-raised)] w-full">
                  <div
                    className="h-full bg-[var(--neon-green)]"
                    style={{
                      width: `${Math.max(
                        (team.total_damage_dealt / (teams[0]?.total_damage_dealt || 1)) * 100,
                        5
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
