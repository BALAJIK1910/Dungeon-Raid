/**
 * Database Initialization Helpers
 * Utility functions to set up event structure and demo data
 */

const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Create a complete event structure with optional demo puzzles
 * @param {string} eventId - Event identifier
 * @param {Object} config - Event configuration
 * @param {Array} puzzles - Optional array of puzzle data
 */
async function initializeEvent(eventId, config, puzzles = []) {
    const batch = db.batch();

    // Create global state document
    const globalStateRef = db.collection('events').doc(eventId);
    batch.set(globalStateRef, {
        event_name: config.event_name,
        game_status: 'PENDING',
        boss_name: config.boss_name,
        boss_avatar_url: config.boss_avatar_url || 'https://via.placeholder.com/400',
        boss_max_hp: config.boss_max_hp,
        boss_current_hp: config.boss_max_hp,
        active_puzzle_id: null,
        active_puzzle_index: 0,
        active_puzzle_status: 'PENDING',
        intermission_until: null,
        intermission_duration_ms: config.intermission_duration_ms || 5000,
        last_solved_by_team: null,
        last_solved_at: null,
        created_at: admin.firestore.Timestamp.now(),
        join_code: config.join_code,
        hint_tokens_per_team: config.hint_tokens_per_team || 2,
        powerups_enabled: config.powerups_enabled !== false,
    });

    // Add puzzles if provided
    if (puzzles && puzzles.length > 0) {
        puzzles.forEach((puzzle, index) => {
            const puzzleRef = db
                .collection('events')
                .doc(eventId)
                .collection('puzzle_pool')
                .doc(puzzle.puzzle_id || `puzzle_${index}`);

            batch.set(puzzleRef, {
                puzzle_id: puzzle.puzzle_id || `puzzle_${index}`,
                sequence_order: index,
                question_payload: puzzle.question_payload,
                question_type: puzzle.question_type || 'TEXT',
                correct_answer: puzzle.correct_answer.toLowerCase().trim(),
                answer_aliases: (puzzle.answer_aliases || []).map(a => a.toLowerCase().trim()),
                fixed_damage_value: puzzle.fixed_damage_value || 50,
                hint_text: puzzle.hint_text || 'Use your logic!',
                hint_damage_penalty: puzzle.hint_damage_penalty || 10,
                time_bonus_enabled: puzzle.time_bonus_enabled || false,
                time_bonus_window_seconds: puzzle.time_bonus_window_seconds || 10,
                time_bonus_damage: puzzle.time_bonus_damage || 25,
                created_at: admin.firestore.Timestamp.now(),
            });
        });
    }

    await batch.commit();
    console.log(`✓ Event "${config.event_name}" initialized`);
}

/**
 * Delete an entire event (for cleanup/testing)
 * @param {string} eventId - Event to delete
 */
async function deleteEvent(eventId) {
    // Delete all subcollections
    const collections = ['teams', 'puzzle_pool', 'battle_log', 'powerup_ledger'];

    for (const collection of collections) {
        const docs = await db
            .collection('events')
            .doc(eventId)
            .collection(collection)
            .get();

        const batch = db.batch();
        docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    // Delete event document
    await db.collection('events').doc(eventId).delete();
    console.log(`✓ Event "${eventId}" deleted`);
}

/**
 * Award power-up to a team
 * @param {string} eventId - Event ID
 * @param {string} teamId - Team ID
 * @param {string} powerupType - SHIELD, DOUBLE_DAMAGE, TIME_FREEZE, SABOTAGE
 */
async function awardPowerup(eventId, teamId, powerupType) {
    const teamRef = db
        .collection('events')
        .doc(eventId)
        .collection('teams')
        .doc(teamId);

    await db.runTransaction(async (transaction) => {
        const teamSnap = await transaction.get(teamRef);
        const activePowerups = teamSnap.data().active_powerups || [];

        if (!activePowerups.includes(powerupType)) {
            transaction.update(teamRef, {
                active_powerups: [...activePowerups, powerupType],
            });
        }
    });

    console.log(`✓ Awarded ${powerupType} to team ${teamId}`);
}

/**
 * Export event results for reporting
 * @param {string} eventId - Event ID
 * @returns {Object} Event summary with rankings
 */
async function getEventResults(eventId) {
    const eventSnap = await db.collection('events').doc(eventId).get();
    const teamsSnap = await db
        .collection('events')
        .doc(eventId)
        .collection('teams')
        .orderBy('total_damage_dealt', 'desc')
        .get();

    const teams = teamsSnap.docs.map((doc, index) => ({
        rank: index + 1,
        ...doc.data(),
    }));

    return {
        event: eventSnap.data(),
        teams,
        total_teams: teams.length,
        top_team: teams[0] || null,
    };
}

module.exports = {
    initializeEvent,
    deleteEvent,
    awardPowerup,
    getEventResults,
};
