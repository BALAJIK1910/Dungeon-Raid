/**
 * Cloud Function: createEvent
 * Create a new event and initialize game state
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { generateJoinCode, generateId } = require('./utils');
const {
    ORGANIZER_ONLY,
    createErrorResponse,
} = require('./errors');

const db = admin.firestore();

/**
 * createEvent({
 *   event_name: string,
 *   boss_name: string,
 *   boss_avatar_url: string,
 *   boss_max_hp: number,
 *   intermission_duration_ms: number (optional, default: 5000),
 *   hint_tokens_per_team: number (optional, default: 2),
 *   powerups_enabled: boolean (optional, default: true)
 * })
 * Create a new event with initialized global state
 */
exports.createEvent = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new Error('UNAUTHENTICATED');
        }

        // Verify organizer role
        if (context.auth.token.role !== 'organizer') {
            throw ORGANIZER_ONLY;
        }

        const {
            event_name,
            boss_name,
            boss_avatar_url,
            boss_max_hp,
            intermission_duration_ms = 5000,
            hint_tokens_per_team = 2,
            powerups_enabled = true,
        } = data;

        // Validate input
        if (!event_name || !boss_name || !boss_max_hp) {
            throw new Error('MISSING_REQUIRED_FIELDS');
        }

        if (boss_max_hp <= 0) {
            throw new Error('INVALID_BOSS_HP');
        }

        if (intermission_duration_ms < 1000 || intermission_duration_ms > 60000) {
            throw new Error('INVALID_INTERMISSION_DURATION');
        }

        // Generate event ID and join code
        const eventId = generateId();
        const joinCode = generateJoinCode();

        // Create global state
        const globalStateData = {
            event_name: event_name,
            game_status: 'PENDING',
            boss_name: boss_name,
            boss_avatar_url: boss_avatar_url || 'https://via.placeholder.com/400',
            boss_max_hp: boss_max_hp,
            boss_current_hp: boss_max_hp,
            active_puzzle_id: null,
            active_puzzle_index: 0,
            active_puzzle_status: 'PENDING',
            intermission_until: null,
            intermission_duration_ms: intermission_duration_ms,
            last_solved_by_team: null,
            last_solved_at: null,
            created_at: admin.firestore.Timestamp.now(),
            created_by: context.auth.uid,
            join_code: joinCode,
            hint_tokens_per_team: hint_tokens_per_team,
            powerups_enabled: powerups_enabled,
        };

        // Write event
        await db.collection('events').doc(eventId).set(globalStateData);

        return {
            status: 'SUCCESS',
            event_id: eventId,
            join_code: joinCode,
            event_name: event_name,
            boss_name: boss_name,
            message: `Event "${event_name}" created successfully. Share code: ${joinCode}`,
        };
    } catch (error) {
        console.error('createEvent error:', error);
        return createErrorResponse(error);
    }
});
