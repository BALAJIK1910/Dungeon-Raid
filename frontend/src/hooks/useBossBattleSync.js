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

function transformBattleLog(battleLog, players, gameStartedAt) {
  if (!battleLog || !players) return [];

  let filteredLogs = battleLog;
  if (gameStartedAt) {
    const startTime = typeof gameStartedAt === 'number'
      ? gameStartedAt
      : typeof gameStartedAt === 'string'
      ? new Date(gameStartedAt).getTime()
      : typeof gameStartedAt.toMillis === 'function'
      ? gameStartedAt.toMillis()
      : typeof gameStartedAt.toDate === 'function'
      ? gameStartedAt.toDate().getTime()
      : gameStartedAt.seconds !== undefined
      ? gameStartedAt.seconds * 1000
      : 0;

    if (startTime > 0) {
      filteredLogs = battleLog.filter(entry => {
        const entryTime = typeof entry.timestamp === 'number'
          ? entry.timestamp
          : entry.timestamp?.toMillis?.() || 
            (entry.timestamp instanceof Date ? entry.timestamp.getTime() : 
            (typeof entry.timestamp === 'string' ? new Date(entry.timestamp).getTime() : 
            (entry.timestamp?.seconds !== undefined ? entry.timestamp.seconds * 1000 : 0)));
        // Buffer by up to 1 second to account for slight server/client timestamp offsets
        return entryTime >= startTime - 1000;
      });
    }
  }

  return filteredLogs.slice(0, 6).map(entry => {
    const teamId = entry.teamId || entry.team_id;
    const attacker = players.find(p => p.id === teamId);
    const entryTime = typeof entry.timestamp === 'number'
      ? entry.timestamp
      : entry.timestamp?.toMillis?.() || 
        (entry.timestamp instanceof Date ? entry.timestamp.getTime() : 
        (typeof entry.timestamp === 'string' ? new Date(entry.timestamp).getTime() : 
        (entry.timestamp?.seconds !== undefined ? entry.timestamp.seconds * 1000 : Date.now())));

    return {
      id: entry.logId || entry.log_id || Math.random(),
      attacker: attacker || { name: entry.team_name, id: teamId, token: 'phantom-gold' },
      amount: entry.damage_dealt || 0,
      crit: !!(entry.double_damage_applied || entry.time_bonus_applied),
      t: entryTime,
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

  const gameStartedAt = gameState?.started_at || gameState?.active_puzzle_started_at || null;

  const players = useMemo(() => transformTeamsToPlayers(leaderboard), [leaderboard]);
  const damages = useMemo(() => buildDamageRecord(leaderboard), [leaderboard]);
  const combatLog = useMemo(() => transformBattleLog(battleLog, players, gameStartedAt), [battleLog, players, gameStartedAt]);
  const mvpPlayer = useMemo(() => getMvpPlayer(players, damages), [players, damages]);

  const bossHealth = gameState?.boss_current_hp ?? 0;
  const bossMaxHealth = gameState?.boss_max_hp ?? 1000000;
  const gameStatus = gameState?.game_status || 'PENDING';
  const gameOutcome = gameState?.game_outcome || null;
  const gamePausedAt = gameState?.paused_at || null;
  const gameResumedAt = gameState?.resumed_at || null;
  const concludedAt = gameState?.concluded_at || null;
  const totalPausedDurationMs = gameState?.total_paused_duration_ms || 0;

  const hpRatio = bossHealth / bossMaxHealth;
  let currentRound = 1;
  let phase = 'Round 1 — Awakening';
  if (hpRatio <= 0.30) {
    currentRound = 3;
    phase = 'Round 3 — Final Stand';
  } else if (hpRatio <= 0.70) {
    currentRound = 2;
    phase = 'Round 2 — Fury';
  }

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
    concludedAt,
    totalPausedDurationMs,
    isGameOver: gameStatus === 'CONCLUDED',
    mvpPlayer,
    phase,
    currentRound,
    lowHp: hpRatio <= 0.30 && !['PENDING', 'CONCLUDED'].includes(gameStatus),
  };
}
