/**
 * Cloud Function: activatePowerup
 * Handle power-up activation with atomic state updates
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { generateId } = require('./utils');
const {
    POWERUP_NOT_FOUND,
    POWERUPS_DISABLED,
    POWERUP_ACTIVE,
    EVENT_NOT_FOUND,
    TEAM_NOT_FOUND,
    createErrorResponse,
} = require('./errors');

const db = admin.firestore();

/**
 * activatePowerup({ eventId, powerupType, targetTeamId? })
 * Activates a power-up for the calling team
 * targetTeamId required for SABOTAGE power-ups
 */
exports.activatePowerup = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new Error('UNAUTHENTICATED');
        }

        const { eventId, powerupType, targetTeamId } = data;

        if (!eventId || !powerupType) {
            throw new Error('MISSING_REQUIRED_FIELDS');
        }

        const teamId = context.auth.token.teamId;
        const activatedAt = Date.now();

        // Validate powerup type
        const validPowerups = ['SHIELD', 'DOUBLE_DAMAGE', 'TIME_FREEZE', 'SABOTAGE'];
        if (!validPowerups.includes(powerupType)) {
            throw new Error('INVALID_POWERUP_TYPE');
        }

        // Get event and check if powerups enabled
        const eventRef = db.collection('events').doc(eventId);
        const eventSnap = await eventRef.get();

        if (!eventSnap.exists) {
            throw EVENT_NOT_FOUND;
        }

        if (eventSnap.data().powerups_enabled === false) {
            throw POWERUPS_DISABLED;
        }

        // Run atomic transaction
        const result = await db.runTransaction(async (transaction) => {
            // Get team and check for power-ups
            const teamRef = db.collection('events').doc(eventId).collection('teams').doc(teamId);
            const teamSnap = await transaction.get(teamRef);

            if (!teamSnap.exists) {
                throw TEAM_NOT_FOUND;
            }

            const team = teamSnap.data();

            // Check if power-up is available
            if (!team.active_powerups || !team.active_powerups.includes(powerupType)) {
                throw POWERUP_NOT_FOUND;
            }

            // Determine power-up duration
            const durations = {
                SHIELD: null, // Single use, consumed immediately
                DOUBLE_DAMAGE: null, // Single use
                TIME_FREEZE: 10 * 1000, // 10 seconds
                SABOTAGE: 15 * 1000, // 15 seconds lockout
            };

            const duration = durations[powerupType];
            const expiresAt = duration ? new Date(activatedAt + duration) : null;

            // Remove from active powerups
            const updatedPowerups = team.active_powerups.filter(p => p !== powerupType);

            // Apply effect based on type
            let targetUpdate = null;
            if (powerupType === 'SABOTAGE' && targetTeamId) {
                // Get target team and apply lockout
                const targetRef = db.collection('events').doc(eventId).collection('teams').doc(targetTeamId);
                const targetSnap = await transaction.get(targetRef);

                if (!targetSnap.exists) {
                    throw TEAM_NOT_FOUND;
                }

                targetUpdate = {
                    submission_cooldown_expiry: new Date(activatedAt + duration),
                    sabotaged: true,
                    sabotage_expires_at: expiresAt,
                };

                transaction.update(targetRef, targetUpdate);
            }

            // Update calling team
            transaction.update(teamRef, {
                active_powerups: updatedPowerups,
                [`powerup_${powerupType.toLowerCase()}_activated_at`]: new Date(activatedAt),
            });

            // Optionally apply TIME_FREEZE to global intermission
            if (powerupType === 'TIME_FREEZE') {
                const globalRef = db.collection('events').doc(eventId);
                const globalSnap = await transaction.get(globalRef);
                const global = globalSnap.data();

                if (global.intermission_until) {
                    const currentIntermission = new Date(global.intermission_until);
                    const newIntermission = new Date(currentIntermission.getTime() + 10 * 1000);
                    transaction.update(globalRef, {
                        intermission_until: newIntermission,
                    });
                }
            }

            // Write to powerup ledger
            const ledgerId = generateId();
            transaction.set(
                db.collection('events').doc(eventId).collection('powerup_ledger').doc(ledgerId),
                {
                    ledger_id: ledgerId,
                    team_id: teamId,
                    team_name: team.team_name,
                    powerup_type: powerupType,
                    activated_at: admin.firestore.Timestamp.now(),
                    expires_at: expiresAt ? admin.firestore.Timestamp.fromDate(expiresAt) : null,
                    target_team_id: targetTeamId || null,
                    target_team_name: targetUpdate ? targetUpdate.team_name : null,
                }
            );

            // Write to battle log
            const logId = generateId();
            const messages = {
                SHIELD: `${team.team_name} activated Shield!`,
                DOUBLE_DAMAGE: `${team.team_name} activated Double Damage!`,
                TIME_FREEZE: `${team.team_name} activated Time Freeze!`,
                SABOTAGE: `${team.team_name} sabotaged the opposition!`,
            };

            transaction.set(
                db.collection('events').doc(eventId).collection('battle_log').doc(logId),
                {
                    log_id: logId,
                    timestamp: admin.firestore.Timestamp.now(),
                    event_type: 'POWERUP_ACTIVATED',
                    team_name: team.team_name,
                    team_id: teamId,
                    powerup_type: powerupType,
                    target_team_id: targetTeamId || null,
                    message: messages[powerupType],
                }
            );

            return {
                status: 'ACTIVATED',
                powerup_type: powerupType,
                duration_ms: duration,
                message: messages[powerupType],
            };
        });

        return result;
    } catch (error) {
        console.error('activatePowerup error:', error);
        return createErrorResponse(error);
    }
});
