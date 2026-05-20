import { useMemo } from 'react';
import useGameState from './useGameState';
import useLeaderboard from './useLeaderboard';
import useBattleLog from './useBattleLog';

const PHANTOM_TOKENS = ['phantom-gold', 'phantom-blue', 'phantom-red', 'phantom-purple', 'phantom-green'];

const tokenColorMap = {
  'phantom-gold': 'var(--phantom-gold)',
  'phantom-blue': 'var(--phantom-blue)',
  'phantom-red': 'var(--phantom-red)',
  'phantom-purple': 'var(--phantom-purple)',
  'phantom-green': 'var(--phantom-green)',
};

function transformTeamsToPlayers(leaderboard) {
  return (leaderboard || []).map((team, index) => ({
    id: team.teamId || team.team_id || `team-${index}`,
    name: team.team_name || `Team ${index + 1}`,
    class: 'Team Leader',
    image: `/assets/phantom_${PHANTOM_TOKENS[index % 5].split('-')[1]}.png`,
    token: PHANTOM_TOKENS[index % 5],
  }));
}

function buildDamageRecord(leaderboard) {
  return Object.fromEntries(
    (leaderboard || []).map((team, index) => [
      team.teamId || team.team_id || `team-${index}`,
      team.total_damage_dealt || 0
    ])
  );
}

function transformBattleLog(battleLog, players) {
  if (!battleLog || !players) return [];

  return battleLog.slice(0, 6).map(entry => {
    const teamId = entry.teamId || entry.team_id;
    const attacker = players.find(p => p.id === teamId);
    return {
      id: entry.logId || entry.log_id || Math.random(),
      attacker: attacker || { name: entry.team_name, id: teamId, token: 'phantom-gold' },
      amount: entry.damage_dealt || 0,
      crit: !!(entry.double_damage_applied || entry.time_bonus_applied),
      t: entry.timestamp?.toMillis?.() || Date.now(),
    };
  });
}

function getMvpPlayer(players, damages) {
  if (!players || players.length === 0) return null;
  const ranked = [...players].sort((a, b) => (damages[b.id] || 0) - (damages[a.id] || 0));
  return ranked[0] || null;
}

export function useBossBattleSync(eventId) {
  const { gameState } = useGameState(eventId);
  const { teams: leaderboard } = useLeaderboard(eventId);
  const { log: battleLog } = useBattleLog(eventId);

  const players = useMemo(() => transformTeamsToPlayers(leaderboard), [leaderboard]);
  const damages = useMemo(() => buildDamageRecord(leaderboard), [leaderboard]);
  const combatLog = useMemo(() => transformBattleLog(battleLog, players), [battleLog, players]);
  const mvpPlayer = useMemo(() => getMvpPlayer(players, damages), [players, damages]);

  const bossHealth = gameState?.boss_current_hp ?? 0;
  const bossMaxHealth = gameState?.boss_max_hp ?? 1000000;
  const gameStatus = gameState?.game_status || 'PENDING';
  const gameOutcome = gameState?.game_outcome || null;
  const gameStartedAt = gameState?.started_at || gameState?.active_puzzle_started_at || null;
  const gamePausedAt = gameState?.paused_at || null;
  const gameResumedAt = gameState?.resumed_at || null;

  const phaseRatio = bossHealth / bossMaxHealth;
  let phase = 'Phase I — Awakening';
  if (phaseRatio <= 0.33) phase = 'Phase III — Enrage';
  else if (phaseRatio <= 0.66) phase = 'Phase II — Fury';

  return {
    players,
    damages,
    bossHealth,
    bossMaxHealth,
    combatLog,
    gameStatus,
    gameOutcome,
    gameStartedAt,
    gamePausedAt,
    gameResumedAt,
    isGameOver: gameStatus === 'CONCLUDED',
    mvpPlayer,
    phase,
    lowHp: phaseRatio < 0.25 && !['PENDING', 'CONCLUDED'].includes(gameStatus),
  };
}
