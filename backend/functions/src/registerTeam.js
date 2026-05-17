/**
 * Cloud Function: registerTeam
 * Handle team registration and authentication
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { generateId } = require('./utils');
const {
    EVENT_NOT_FOUND,
    TEAM_ALREADY_REGISTERED,
    INVALID_JOIN_CODE,
    TEAM_NOT_FOUND,
    createErrorResponse,
} = require('./errors');

const db = admin.firestore();
const auth = admin.auth();

/**
 * registerTeam({
 *   eventId,
 *   joinCode,
 *   teamName,
 *   memberNames: Array<string>
 * })
 * Register a team for an event and return an auth token
 */
exports.registerTeam = functions.https.onCall(async (data, context) => {
    try {
        const { eventId, joinCode, teamName, memberNames } = data;

        // Validate input
        if (!eventId || !joinCode || !teamName || !memberNames || !Array.isArray(memberNames)) {
            throw new Error('MISSING_REQUIRED_FIELDS');
        }

        if (memberNames.length === 0 || memberNames.length > 10) {
            throw new Error('INVALID_MEMBER_COUNT');
        }

        if (teamName.length < 2 || teamName.length > 50) {
            throw new Error('INVALID_TEAM_NAME');
        }

        // Get event and verify join code
        const eventRef = db.collection('events').doc(eventId);
        const eventSnap = await eventRef.get();

        if (!eventSnap.exists) {
            throw EVENT_NOT_FOUND;
        }

        const globalState = eventSnap.data();

        if (globalState.join_code !== joinCode.toUpperCase()) {
            throw INVALID_JOIN_CODE;
        }

        // Run atomic transaction
        const result = await db.runTransaction(async (transaction) => {
            // Check if team already registered under this event
            const existingTeamSnap = await transaction.get(
                db.collection('events').doc(eventId).collection('teams')
                    .where('team_name', '==', teamName)
            );

            if (existingTeamSnap.docs.length > 0) {
                throw TEAM_ALREADY_REGISTERED;
            }

            // Create anonymous auth user for team
            const anonymousUser = await auth.createUser();

            // Generate team ID
            const teamId = generateId();

            // Create team document
            const teamData = {
                team_id: teamId,
                team_name: teamName,
                registered_members: memberNames,
                total_damage_dealt: 0,
                puzzles_solved: 0,
                submission_cooldown_expiry: null,
                cooldown_strike_count: 0,
                active_powerups: [],
                hint_tokens: globalState.hint_tokens_per_team || 2,
                shield_active: false,
                registered_at: admin.firestore.Timestamp.now(),
                uid: anonymousUser.uid,
            };

            const teamRef = db.collection('events').doc(eventId).collection('teams').doc(teamId);
            transaction.set(teamRef, teamData);

            // Set custom claims on the user
            await auth.setCustomUserClaims(anonymousUser.uid, {
                teamId: teamId,
                eventId: eventId,
                role: 'team',
            });

            // Generate a custom token for the team
            const customToken = await auth.createCustomToken(anonymousUser.uid);

            return {
                status: 'REGISTERED',
                team_id: teamId,
                team_name: teamName,
                custom_token: customToken,
                hint_tokens: teamData.hint_tokens,
                message: `Welcome, ${teamName}! You've joined the battle.`,
            };
        });

        return result;
    } catch (error) {
        console.error('registerTeam error:', error);
        return createErrorResponse(error);
    }
});
