import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { functions, db } from './config';
import { calculateCooldown, checkAnswer } from '../utils/gameUtils';

/**
 * Register a new team (Direct Firestore - works on free tier)
 * @param {object} data - { eventId, joinCode, teamName, memberNames }
 * @returns Promise<{data: object}>
 */
export const registerTeam = async (data) => {
  const { joinCode, teamName, memberNames, password } = data;

  if (!joinCode || !teamName || !memberNames || memberNames.length === 0 || !password) {
    const error = new Error('Missing required fields');
    error.code = 'MISSING_FIELDS';
    throw error;
  }

  try {
    console.log('🔍 Looking for event with join_code:', joinCode);

    // Find event by join_code
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('join_code', '==', joinCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.error('❌ Event not found with join_code:', joinCode);
      const error = new Error('INVALID_JOIN_CODE');
      error.code = 'INVALID_JOIN_CODE';
      throw error;
    }

    const eventDoc = querySnapshot.docs[0];
    const eventId = eventDoc.id;
    const eventData = eventDoc.data();
    console.log('✅ Found event:', eventId, eventData);

    // Check if event is active
    if (eventData.game_status === 'CONCLUDED') {
      console.error('❌ Event already concluded');
      const error = new Error('EVENT_ALREADY_CONCLUDED');
      error.code = 'EVENT_ALREADY_CONCLUDED';
      throw error;
    }

    // Check if team name already exists in this event
    const teamsRef = collection(db, 'events', eventId, 'teams');
    const teamQuery = query(teamsRef, where('team_name', '==', teamName));
    console.log('🔍 Checking if team name exists:', teamName);
    const teamSnapshot = await getDocs(teamQuery);

    if (!teamSnapshot.empty) {
      console.error('❌ Team name already exists');
      const error = new Error('TEAM_ALREADY_REGISTERED');
      error.code = 'TEAM_ALREADY_REGISTERED';
      throw error;
    }

    // Generate team ID
    const teamId = 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    console.log('✅ Creating team with ID:', teamId);

    // Create team document
    const teamRef = doc(db, 'events', eventId, 'teams', teamId);
    const teamData = {
      team_name: teamName,
      member_names: memberNames,
      total_damage_dealt: 0,
      hint_tokens: eventData.hint_tokens_per_team || 3,
      active_powerups: [],
      shield_active: false,
      submission_cooldown_expiry: 0,
      cooldown_strike_count: 0,
      registered_at: new Date().toISOString(),
      password: password,
    };

    console.log('📝 Writing team data to:', `events/${eventId}/teams/${teamId}`);
    await setDoc(teamRef, teamData);
    console.log('✅ Team document created');

    console.log('✅ Team registration complete');

    return {
      data: {
        eventId,
        teamId,
      },
    };
  } catch (err) {
    console.error('❌ Registration error:', err);
    if (err.code) {
      throw err;
    }
    throw new Error(`Team registration failed: ${err.message}`, { cause: err });
  }
};

/**
 * Login a team
 * @param {object} data - { joinCode, teamName, password }
 * @returns Promise<{data: object}>
 */
export const loginTeam = async (data) => {
  const { joinCode, teamName, password } = data;

  if (!joinCode || !teamName || !password) {
    const error = new Error('Missing required fields');
    error.code = 'MISSING_FIELDS';
    throw error;
  }

  try {
    // Find event by join_code
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('join_code', '==', joinCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      const error = new Error('INVALID_JOIN_CODE');
      error.code = 'INVALID_JOIN_CODE';
      throw error;
    }

    const eventDoc = querySnapshot.docs[0];
    const eventId = eventDoc.id;

    // Find team by teamName
    const teamsRef = collection(db, 'events', eventId, 'teams');
    const teamQuery = query(teamsRef, where('team_name', '==', teamName));
    const teamSnapshot = await getDocs(teamQuery);

    if (teamSnapshot.empty) {
      const error = new Error('TEAM_NOT_FOUND');
      error.code = 'TEAM_NOT_FOUND';
      throw error;
    }

    const teamDoc = teamSnapshot.docs[0];
    const teamData = teamDoc.data();

    if (teamData.password !== password) {
      const error = new Error('INVALID_PASSWORD');
      error.code = 'INVALID_PASSWORD';
      throw error;
    }

    return {
      data: {
        eventId,
        teamId: teamDoc.id,
        ...teamData,
      },
    };
  } catch (err) {
    console.error('❌ Login error:', err);
    if (err.code) throw err;
    throw new Error(`Team login failed: ${err.message}`, { cause: err });
  }
};

/**
 * Submit an answer to the current puzzle
 * @param {object} data - { eventId, puzzleId, answerText }
 * @returns Promise<{data: object}>
 */
export const submitAnswer = async (data) => {
  const { eventId, puzzleId, answerText } = data;
  const teamId = sessionStorage.getItem('tw_teamId');

  if (!eventId || !puzzleId || !answerText) {
    throw new Error('Missing eventId, puzzleId, or answerText');
  }

  if (!teamId) {
    throw new Error('No team session found. Join the event again.');
  }

  try {
    // Always fetch fresh puzzle order to avoid stale sessionStorage cache
    const puzzleOrderSnapshot = await getDocs(
      query(collection(db, 'events', eventId, 'puzzle_pool'), orderBy('sequence_order', 'asc'))
    );
    const puzzleOrder = puzzleOrderSnapshot.docs.map((snapshot) => ({
      puzzleId: snapshot.id,
      ...snapshot.data(),
    }));
    sessionStorage.setItem('tw_puzzleOrder', JSON.stringify(puzzleOrder));

    const result = await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'events', eventId);
      const teamRef = doc(db, 'events', eventId, 'teams', teamId);
      const puzzleRef = doc(db, 'events', eventId, 'puzzle_pool', puzzleId);

      const eventSnap = await transaction.get(eventRef);
      const teamSnap = await transaction.get(teamRef);
      const puzzleSnap = await transaction.get(puzzleRef);

      if (!eventSnap.exists()) {
        throw new Error('EVENT_NOT_FOUND');
      }

      const gameState = eventSnap.data();

      if (gameState.game_status !== 'ACTIVE') {
        throw new Error(gameState.game_status === 'PENDING' ? 'GAME_PENDING' : 'GAME_NOT_ACTIVE');
      }

      if (!teamSnap.exists()) {
        throw new Error('TEAM_NOT_FOUND');
      }

      if (!puzzleSnap.exists()) {
        throw new Error('PUZZLE_NOT_FOUND');
      }

      if (gameState.active_puzzle_id !== puzzleId) {
        return {
          status: 'TOO_LATE',
          message: 'Another team already advanced this puzzle.',
        };
      }

      const now = Date.now();
      const team = teamSnap.data();
      const puzzle = puzzleSnap.data();


      const correct = checkAnswer(
        answerText,
        puzzle.correct_answer,
        puzzle.answer_aliases || []
      );

      if (!correct) {
        return {
          status: 'WRONG',
          message: 'Incorrect answer',
        };
      }

      let damage = puzzle.fixed_damage_value || 50;
      const activePowerups = team.active_powerups || [];
      const hasDoubleDamage = activePowerups.includes('DOUBLE_DAMAGE');

      if (hasDoubleDamage) {
        damage *= 2;
      }

      const currentPuzzleIndex = puzzleOrder.findIndex(
        (orderedPuzzle) => orderedPuzzle.puzzleId === puzzleId
      );
      const nextPuzzle =
        currentPuzzleIndex >= 0 && currentPuzzleIndex < puzzleOrder.length - 1
          ? puzzleOrder[currentPuzzleIndex + 1]
          : null;

      const newBossHp = Math.max(0, (gameState.boss_current_hp || 0) - damage);
      const bossDefeated = newBossHp <= 0;
      const questionsExhausted = !nextPuzzle;
      const gameConcluded = bossDefeated || questionsExhausted;
      const gameOutcome = bossDefeated ? 'WON' : questionsExhausted ? 'LOST' : null;

      const gameUpdate = {
        boss_current_hp: newBossHp,
        last_solved_by_team: team.team_name,
        last_solved_at: now,
        intermission_until: 0,
      };

      if (gameConcluded) {
        gameUpdate.game_status = 'CONCLUDED';
        gameUpdate.game_outcome = gameOutcome;
        gameUpdate.concluded_reason = bossDefeated ? 'BOSS_DEFEATED' : 'QUESTIONS_EXHAUSTED';
        gameUpdate.concluded_at = now;
        gameUpdate.active_puzzle_status = 'COMPLETED';
      } else {
        gameUpdate.active_puzzle_id = nextPuzzle.puzzleId;
        gameUpdate.active_puzzle_index = nextPuzzle.sequence_order || (currentPuzzleIndex + 2);
        gameUpdate.active_puzzle_status = 'PLAYING';
        gameUpdate.active_puzzle_started_at = now;
      }

      const teamUpdate = {
        total_damage_dealt: (team.total_damage_dealt || 0) + damage,
        puzzles_solved: (team.puzzles_solved || 0) + 1,
        cooldown_strike_count: 0,
        submission_cooldown_expiry: 0,
      };

      if (hasDoubleDamage) {
        teamUpdate.active_powerups = activePowerups.filter(
          (powerup) => powerup !== 'DOUBLE_DAMAGE'
        );
      }

      const battleLogRef = doc(collection(db, 'events', eventId, 'battle_log'));
      const battleLog = {
        timestamp: now,
        event_type: 'PUZZLE_SOLVED',
        team_name: team.team_name,
        team_id: teamId,
        puzzle_id: puzzleId,
        damage_dealt: damage,
        boss_hp_after: newBossHp,
        double_damage_applied: hasDoubleDamage,
        message: gameOutcome
          ? `${team.team_name} dealt ${damage} damage. Raid ${gameOutcome}.`
          : `${team.team_name} dealt ${damage} damage. Next puzzle deployed.`,
      };

      transaction.update(eventRef, gameUpdate);
      transaction.update(teamRef, teamUpdate);
      transaction.update(puzzleRef, {
        status: 'SOLVED',
        solved_by_team: team.team_name,
        solved_by_team_id: teamId,
        solved_at: now,
      });
      transaction.set(battleLogRef, battleLog);

      return {
        status: 'CORRECT',
        damage_dealt: damage,
        new_team_total: teamUpdate.total_damage_dealt,
        new_boss_hp: newBossHp,
        game_concluded: gameConcluded,
        game_outcome: gameOutcome,
        next_puzzle_id: nextPuzzle?.puzzleId || null,
        double_damage_applied: hasDoubleDamage,
      };
    });

    return { data: result };
  } catch (err) {
    throw new Error(`Attack failed: ${err.message}`, { cause: err });
  }
};

/**
 * Use a hint token
 * @param {object} data - { eventId, puzzleId }
 * @returns Promise<{data: object}>
 */
export const useHint = httpsCallable(functions, 'useHint');

/**
 * Activate a power-up
 * @param {object} data - { eventId, powerupType, targetTeamId }
 * @returns Promise<{data: object}>
 */
export const activatePowerup = httpsCallable(functions, 'activatePowerup');

/**
 * Organizer game control (Direct Firestore - works on free tier)
 * @param {object} data - { eventId, action }
 * @returns Promise<object>
 */
export const organiserControl = async (data) => {
  const { eventId, action } = data;

  if (!eventId || !action) {
    throw new Error('Missing eventId or action');
  }

  const validActions = ['START', 'PAUSE', 'RESUME', 'INSTANT_KILL', 'ADVANCE_PUZZLE', 'RESET'];
  if (!validActions.includes(action)) {
    throw new Error('Invalid action: ' + action);
  }

  try {
    const eventRef = doc(db, 'events', eventId);
    const legacyStateRef = doc(db, 'events', eventId, 'global_state', 'state');
    const eventSnapshot = await getDoc(eventRef);

    if (!eventSnapshot.exists()) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const eventData = eventSnapshot.data();
    const update = {};
    let resetTeamDocs = [];
    let resetPuzzleDocs = [];

    switch (action) {
      case 'START': {
        // Get the first puzzle from puzzle_pool
        const puzzlePoolRef = collection(db, 'events', eventId, 'puzzle_pool');
        const puzzleQuery = query(puzzlePoolRef, orderBy('sequence_order', 'asc'), limit(1));
        const puzzleSnapshot = await getDocs(puzzleQuery);

        if (puzzleSnapshot.empty) {
          throw new Error('No puzzles in puzzle_pool');
        }

        const firstPuzzle = puzzleSnapshot.docs[0];
        const activePuzzleId = firstPuzzle.id;

        update.game_status = 'ACTIVE';
        update.active_puzzle_status = 'PLAYING';
        update.active_puzzle_id = activePuzzleId;
        update.active_puzzle_index = firstPuzzle.data().sequence_order || 1;
        update.started_at = new Date().toISOString();
        update.active_puzzle_started_at = Date.now();
        update.total_paused_duration_ms = 0;
        update.paused_at = null;
        update.resumed_at = null;
        break;
      }
      case 'PAUSE':
        update.game_status = 'PAUSED';
        update.paused_at = new Date().toISOString();
        break;
      case 'RESUME':
        update.game_status = 'ACTIVE';
        update.resumed_at = new Date().toISOString();
        if (eventData.active_puzzle_id) {
          update.active_puzzle_status = 'PLAYING';
        }
        if (eventData.paused_at) {
          const pauseStart = new Date(eventData.paused_at).getTime();
          const pauseEnd = Date.now();
          const lastPauseDuration = Math.max(0, pauseEnd - pauseStart);
          const currentTotal = eventData.total_paused_duration_ms || 0;
          update.total_paused_duration_ms = currentTotal + lastPauseDuration;
        }
        break;
      case 'INSTANT_KILL':
        update.boss_current_hp = 0;
        update.game_status = 'CONCLUDED';
        update.game_outcome = 'WON';
        update.concluded_reason = 'BOSS_DEFEATED';
        update.concluded_at = Date.now();
        break;
      case 'ADVANCE_PUZZLE': {
        const puzzlePoolRef = collection(db, 'events', eventId, 'puzzle_pool');
        const puzzleQuery = query(puzzlePoolRef, orderBy('sequence_order', 'asc'));
        const puzzleSnapshot = await getDocs(puzzleQuery);
        const orderedPuzzles = puzzleSnapshot.docs.map((snapshot) => ({
          puzzleId: snapshot.id,
          ...snapshot.data(),
        }));
        const currentIndex = orderedPuzzles.findIndex(
          (puzzle) => puzzle.puzzleId === eventData.active_puzzle_id
        );
        const nextPuzzle =
          currentIndex >= 0
            ? orderedPuzzles[currentIndex + 1]
            : orderedPuzzles.find((puzzle) => {
              return (
                (Number(puzzle.sequence_order) || 0) >
                (Number(eventData.active_puzzle_index) || 0)
              );
            });

        if (nextPuzzle) {
          update.active_puzzle_id = nextPuzzle.puzzleId;
          update.active_puzzle_index = nextPuzzle.sequence_order || currentIndex + 2;
          update.active_puzzle_status = 'PLAYING';
          update.active_puzzle_started_at = Date.now();
          update.intermission_until = 0;
        } else {
          const won = (eventData.boss_current_hp || 0) <= 0;
          update.game_status = 'CONCLUDED';
          update.game_outcome = won ? 'WON' : 'LOST';
          update.concluded_reason = won ? 'BOSS_DEFEATED' : 'QUESTIONS_EXHAUSTED';
          update.concluded_at = Date.now();
          update.active_puzzle_status = 'COMPLETED';
          update.intermission_until = 0;
        }
        break;
      }
      case 'RESET': {
        const teamsSnapshot = await getDocs(collection(db, 'events', eventId, 'teams'));
        const puzzleSnapshot = await getDocs(collection(db, 'events', eventId, 'puzzle_pool'));

        resetTeamDocs = teamsSnapshot.docs;
        resetPuzzleDocs = puzzleSnapshot.docs;

        update.game_status = 'PENDING';
        update.boss_current_hp = eventData.boss_max_hp || 1000;
        update.active_puzzle_id = null;
        update.active_puzzle_index = 0;
        update.active_puzzle_status = 'PENDING';
        update.intermission_until = 0;
        update.last_solved_by_team = null;
        update.last_solved_at = null;
        update.game_outcome = null;
        update.concluded_reason = null;
        update.concluded_at = null;
        update.active_puzzle_started_at = null;
        update.started_at = null;
        update.total_paused_duration_ms = 0;
        update.paused_at = null;
        update.resumed_at = null;
        break;
      }
    }

    const batch = writeBatch(db);
    batch.update(eventRef, update);
    batch.set(legacyStateRef, { ...eventData, ...update }, { merge: true });

    if (action === 'RESET') {
      resetTeamDocs.forEach((teamDoc) => {
        batch.update(teamDoc.ref, {
          total_damage_dealt: 0,
          puzzles_solved: 0,
          submission_cooldown_expiry: 0,
          cooldown_strike_count: 0,
          active_powerups: [],
          shield_active: false,
          hint_tokens: eventData.hint_tokens_per_team || 3,
        });
      });

      resetPuzzleDocs.forEach((puzzleDoc) => {
        batch.update(puzzleDoc.ref, {
          status: 'PENDING',
          solved_by_team: null,
          solved_by_team_id: null,
          solved_at: null,
        });
      });
    }

    await batch.commit();

    return { success: true, action, message: `${action} executed` };
  } catch (err) {
    throw new Error(`Failed to execute ${action}: ${err.message}`, { cause: err });
  }
};

/**
 * Create a new event
 * @param {object} data - Event configuration
 * @returns Promise<{data: object}>
 */
export const createEvent = httpsCallable(functions, 'createEvent');

/**
 * Health check endpoint
 * @returns Promise<{data: object}>
 */
export const healthCheck = httpsCallable(functions, 'healthCheck');

export default {
  registerTeam,
  loginTeam,
  submitAnswer,
  useHint,
  activatePowerup,
  organiserControl,
  createEvent,
  healthCheck,
};
