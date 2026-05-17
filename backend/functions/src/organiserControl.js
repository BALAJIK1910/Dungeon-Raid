/**
 * Cloud Function: organiserControl
 * Handle organizer actions: START, PAUSE, RESUME, INSTANT_KILL, ADVANCE_PUZZLE
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { generateId } = require('./utils');
const {
    ORGANIZER_ONLY,
    EVENT_NOT_FOUND,
    createErrorResponse,
} = require('./errors');

const db = admin.firestore();

/**
 * organiserControl({
 *   eventId,
 *   action: 'START' | 'PAUSE' | 'RESUME' | 'INSTANT_KILL' | 'ADVANCE_PUZZLE' | 'TOGGLE_POWERUPS'
 * })
 * Any authorized organizer can control the game state
 */
exports.organiserControl = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new Error('UNAUTHENTICATED');
        }

        // Verify organizer role - check both custom claims and admin_users collection
        const isOrganizerByRole = context.auth.token.role === 'organizer';
        const adminDoc = await db.collection('admin_users').doc(context.auth.uid).get();
        const isAdminUser = adminDoc.exists && adminDoc.data().authorized === true;

        if (!isOrganizerByRole && !isAdminUser) {
            throw ORGANIZER_ONLY;
        }

        const { eventId, action } = data;

        if (!eventId || !action) {
            throw new Error('MISSING_REQUIRED_FIELDS');
        }

        const validActions = ['START', 'PAUSE', 'RESUME', 'INSTANT_KILL', 'ADVANCE_PUZZLE', 'TOGGLE_POWERUPS'];
        if (!validActions.includes(action)) {
            throw new Error('INVALID_ACTION');
        }

        // Run atomic transaction
        const result = await db.runTransaction(async (transaction) => {
            const eventRef = db.collection('events').doc(eventId);
            const eventSnap = await transaction.get(eventRef);

            if (!eventSnap.exists) {
                throw EVENT_NOT_FOUND;
            }

            const globalState = eventSnap.data();
            const now = new Date();
            const update = {};

            // Handle different actions
            switch (action) {
                case 'START':
                    if (globalState.game_status !== 'PENDING') {
                        throw new Error('GAME_ALREADY_STARTED');
                    }
                    update.game_status = 'ACTIVE';
                    update.started_at = admin.firestore.Timestamp.now();
                    // Set first puzzle as active
                    if (globalState.active_puzzle_id) {
                        update.active_puzzle_status = 'PLAYING';
                        update.active_puzzle_started_at = Date.now();
                    }
                    break;

                case 'PAUSE':
                    if (globalState.game_status !== 'ACTIVE') {
                        throw new Error('GAME_NOT_ACTIVE');
                    }
                    update.game_status = 'PAUSED';
                    update.paused_at = admin.firestore.Timestamp.now();
                    break;

                case 'RESUME':
                    if (globalState.game_status !== 'PAUSED') {
                        throw new Error('GAME_NOT_PAUSED');
                    }
                    update.game_status = 'ACTIVE';
                    update.resumed_at = admin.firestore.Timestamp.now();
                    break;

                case 'INSTANT_KILL':
                    update.game_status = 'CONCLUDED';
                    update.concluded_at = admin.firestore.Timestamp.now();
                    update.concluded_reason = 'INSTANT_KILL';
                    update.boss_current_hp = 0;
                    break;

                case 'ADVANCE_PUZZLE':
                    if (globalState.game_status !== 'ACTIVE') {
                        throw new Error('GAME_NOT_ACTIVE');
                    }
                    // Find next puzzle
                    const currentPuzzleOrder = globalState.active_puzzle_index || 0;
                    const nextPuzzleSnap = await transaction.get(
                        db.collection('events').doc(eventId).collection('puzzle_pool')
                            .where('sequence_order', '>', currentPuzzleOrder)
                            .orderBy('sequence_order', 'asc')
                            .limit(1)
                    );

                    if (nextPuzzleSnap.docs.length > 0) {
                        const nextPuzzle = nextPuzzleSnap.docs[0];
                        update.active_puzzle_id = nextPuzzle.id;
                        update.active_puzzle_index = nextPuzzle.data().sequence_order;
                        update.active_puzzle_status = 'PLAYING';
                        update.active_puzzle_started_at = Date.now();
                        update.intermission_until = null;
                    } else {
                        // No more puzzles
                        update.game_status = 'CONCLUDED';
                        update.concluded_at = admin.firestore.Timestamp.now();
                        update.concluded_reason = 'PUZZLES_EXHAUSTED';
                    }
                    break;

                case 'TOGGLE_POWERUPS':
                    update.powerups_enabled = !globalState.powerups_enabled;
                    break;
            }

            // Apply update
            transaction.update(eventRef, update);

            // Write to battle log
            const logId = generateId();
            const messages = {
                START: 'Game started by Raid Master',
                PAUSE: 'Game paused by Raid Master',
                RESUME: 'Game resumed by Raid Master',
                INSTANT_KILL: 'Boss defeated by Instant Kill',
                ADVANCE_PUZZLE: 'Puzzle advanced by Raid Master',
                TOGGLE_POWERUPS: `Power-ups ${update.powerups_enabled ? 'enabled' : 'disabled'}`,
            };

            transaction.set(
                db.collection('events').doc(eventId).collection('battle_log').doc(logId),
                {
                    log_id: logId,
                    timestamp: admin.firestore.Timestamp.now(),
                    event_type: 'GAME_EVENT',
                    action: action,
                    message: messages[action],
                }
            );

            return {
                status: 'SUCCESS',
                action: action,
                new_game_status: update.game_status || globalState.game_status,
                message: messages[action],
            };
        });

        return result;
    } catch (error) {
        console.error('organiserControl error:', error);
        return createErrorResponse(error);
    }
});
