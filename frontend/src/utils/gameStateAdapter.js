// Adapter to bridge Firebase game state with component interface
let listeners = [];

export const gameStateAdapter = {
  getPlayers() {
    // Return top 5 players from Firebase game state
    // This will be populated from Firebase listeners
    return window.__gameStatePlayers || [];
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

  addDamage(playerId, amount) {
    const state = window.__currentGameState || {};
    if (state.boss_current_hp !== undefined) {
      state.boss_current_hp = Math.max(0, state.boss_current_hp - amount);
      if (state.boss_current_hp === 0) {
        state.bossDefeated = true;
      }
    }
    this.notifyListeners();
  },

  isBossDefeated() {
    const state = window.__currentGameState || {};
    return state.boss_current_hp <= 0;
  },

  getBossHealthPercentage() {
    const state = window.__currentGameState || {};
    const current = state.boss_current_hp ?? 0;
    const max = state.boss_max_hp ?? 1;
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
    const gameState = window.__currentGameState || {};
    return {
      players: this.getPlayers(),
      topPlayers: this.getTopPlayers(),
      allPlayersSorted: this.getAllPlayersSorted(),
      bossHealth: gameState.boss_current_hp ?? 0,
      bossMaxHealth: gameState.boss_max_hp ?? 1,
      bossHealthPercentage: this.getBossHealthPercentage(),
      bossDefeated: this.isBossDefeated()
    };
  },

  // Called from external listeners to update state
  updateFromFirebase(gameState, teams) {
    window.__currentGameState = gameState;

    // Build players array from teams with damage
    const players = (teams || []).map((team, index) => ({
      id: team.team_id || `team-${index}`,
      name: team.team_name || `Team ${index}`,
      damage: team.total_damage_dealt || 0,
      team: team.team_name || `Team ${index}`,
      color: ['#FFE81F', '#39FF14', '#FF3B30', '#00D9FF', '#FF00FF'][index % 5]
    }));

    window.__gameStatePlayers = players;
    this.notifyListeners();
  }
};
