/**
 * Cloud Function: useHint
 * Allow team to consume a hint token and reveal hint text
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { generateId } = require('./utils');
const {
    NO_HINT_TOKENS,
    PUZZLE_NOT_FOUND,
    EVENT_NOT_FOUND,
    TEAM_NOT_FOUND,
    createErrorResponse,
} = require('./errors');

const db = admin.firestore();

/**
 * useHint({ eventId, puzzleId })
 * Consume a hint token and deduct penalty from team damage
 */
exports.useHint = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new Error('UNAUTHENTICATED');
        }

        const { eventId, puzzleId } = data;

        if (!eventId || !puzzleId) {
            throw new Error('MISSING_REQUIRED_FIELDS');
        }

        const teamId = context.auth.token.teamId;

        // Run atomic transaction
        const result = await db.runTransaction(async (transaction) => {
            // Get event
            const eventRef = db.collection('events').doc(eventId);
            const eventSnap = await transaction.get(eventRef);

            if (!eventSnap.exists) {
                throw EVENT_NOT_FOUND;
            }

            // Get team
            const teamRef = db.collection('events').doc(eventId).collection('teams').doc(teamId);
            const teamSnap = await transaction.get(teamRef);

            if (!teamSnap.exists) {
                throw TEAM_NOT_FOUND;
            }

            const team = teamSnap.data();
            const hintTokens = team.hint_tokens || 0;

            // Check hint tokens available
            if (hintTokens <= 0) {
                throw NO_HINT_TOKENS;
            }

            // Get puzzle
            const puzzleRef = db.collection('events').doc(eventId).collection('puzzle_pool').doc(puzzleId);
            const puzzleSnap = await transaction.get(puzzleRef);

            if (!puzzleSnap.exists) {
                throw PUZZLE_NOT_FOUND;
            }

            const puzzle = puzzleSnap.data();
            const penalty = puzzle.hint_damage_penalty || 0;
            const hintText = puzzle.hint_text || 'No hint available';

            // Deduct penalty from total damage (floor at 0)
            const newTotalDamage = Math.max(0, (team.total_damage_dealt || 0) - penalty);
            const penalty_applied = (team.total_damage_dealt || 0) - newTotalDamage;

            // Update team
            transaction.update(teamRef, {
                hint_tokens: hintTokens - 1,
                total_damage_dealt: newTotalDamage,
                last_hint_used_at: admin.firestore.Timestamp.now(),
            });

            // Write to battle log
            const logId = generateId();
            transaction.set(
                db.collection('events').doc(eventId).collection('battle_log').doc(logId),
                {
                    log_id: logId,
                    timestamp: admin.firestore.Timestamp.now(),
                    event_type: 'HINT_USED',
                    team_name: team.team_name,
                    team_id: teamId,
                    puzzle_id: puzzleId,
                    penalty_applied: penalty_applied,
                    message: `${team.team_name} used a hint (${penalty_applied} damage penalty applied)`,
                }
            );

            return {
                status: 'SUCCESS',
                hint_text: hintText,
                penalty_applied: penalty_applied,
                remaining_hint_tokens: hintTokens - 1,
                new_total_damage: newTotalDamage,
            };
        });

        return result;
    } catch (error) {
        console.error('useHint error:', error);
        return createErrorResponse(error);
    }
});
