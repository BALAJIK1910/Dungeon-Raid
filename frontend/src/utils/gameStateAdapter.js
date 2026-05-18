// Adapter to bridge Firebase game state with component interface
let listeners = [];
let currentGameState = null;
let currentTeams = [];

export const gameStateAdapter = {
  setGameState(gameState, teams) {
    currentGameState = gameState;
    currentTeams = teams || [];
    this.notifyListeners();
  },

  getPlayers() {
    return (currentTeams || []).map((team, index) => ({
      id: team.team_id || `team-${index}`,
      name: team.team_name || `Team ${index}`,
      damage: team.total_damage_dealt || 0,
      team: team.team_name || `Team ${index}`,
      color: ['#FFE81F', '#39FF14', '#FF3B30', '#00D9FF', '#FF00FF'][index % 5]
    }));
  },

  getTopPlayers(count = 5) {
    const players = this.getPlayers();
    return [...players]
      .sort((a, b) => (b.damage || 0) - (a.damage || 0))
      .slice(0, count);
  },

  getAllPlayersSorted() {
    const players = this.getPlayers();
    return [...players].sort((a, b) => (b.damage || 0) - (a.damage || 0));
  },

  isBossDefeated() {
    return (currentGameState?.boss_current_hp ?? 0) <= 0;
  },

  isGameConcluded() {
    return currentGameState?.game_status === 'CONCLUDED';
  },

  getGameOutcome() {
    return currentGameState?.game_outcome || null;
  },

  getBossHealthPercentage() {
    const current = currentGameState?.boss_current_hp ?? 0;
    const max = currentGameState?.boss_max_hp ?? 1;
    return max > 0 ? (current / max) * 100 : 0;
  },

  subscribe(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  },

  notifyListeners() {
    const state = this.getState();
    listeners.forEach(callback => callback(state));
  },

  getState() {
    return {
      players: this.getPlayers(),
      topPlayers: this.getTopPlayers(),
      allPlayersSorted: this.getAllPlayersSorted(),
      bossHealth: currentGameState?.boss_current_hp ?? 0,
      bossMaxHealth: currentGameState?.boss_max_hp ?? 1,
      bossHealthPercentage: this.getBossHealthPercentage(),
      bossDefeated: this.isBossDefeated(),
      gameStatus: currentGameState?.game_status || 'PENDING',
      gameOutcome: this.getGameOutcome(),
      gameConcluded: this.isGameConcluded()
    };
  }
};


