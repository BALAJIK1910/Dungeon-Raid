/**
 * Cloud Function: submitAnswer
 * Handle team answer submissions with atomic validation and damage computation
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {
    validateAnswer,
    calculateCooldown,
    calculateDamage,
    isWithinTimeBonus,
    generateId,
} = require('./utils');
const {
    GAME_NOT_ACTIVE,
    GAME_PAUSED,
    GAME_CONCLUDED,
    TOO_LATE,
    ANSWER_WRONG,
    ANSWER_CORRECT,
    SUBMISSION_LOCKED,
    PUZZLE_NOT_FOUND,
    EVENT_NOT_FOUND,
    TEAM_NOT_FOUND,
    createErrorResponse,
} = require('./errors');

const db = admin.firestore();

/**
 * submitAnswer({ eventId, puzzleId, answerText })
 * Validates answer and applies damage atomically
 */
exports.submitAnswer = functions.https.onCall(async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new Error('UNAUTHENTICATED');
        }

        const { eventId, puzzleId, answerText } = data;

        // Validate input
        if (!eventId || !puzzleId || !answerText) {
            throw new Error('MISSING_REQUIRED_FIELDS');
        }

        const teamId = context.auth.token.teamId;
        const submittedAt = Date.now();

        // Run atomic transaction
        const result = await db.runTransaction(async (transaction) => {
            // 1. Get event and verify it exists + status
            const eventRef = db.collection('events').doc(eventId);
            const eventSnap = await transaction.get(eventRef);

            if (!eventSnap.exists) {
                throw EVENT_NOT_FOUND;
            }

            const globalState = eventSnap.data();

            // Verify game status
            if (globalState.game_status === 'PENDING') {
                throw new Error('GAME_PENDING');
            }
            if (globalState.game_status === 'PAUSED') {
                throw GAME_PAUSED;
            }
            if (globalState.game_status === 'CONCLUDED') {
                throw GAME_CONCLUDED;
            }
            if (globalState.game_status !== 'ACTIVE') {
                throw GAME_NOT_ACTIVE;
            }

            // 2. Get team document and check cooldown
            const teamRef = db.collection('events').doc(eventId).collection('teams').doc(teamId);
            const teamSnap = await transaction.get(teamRef);

            if (!teamSnap.exists) {
                throw TEAM_NOT_FOUND;
            }

            const team = teamSnap.data();
            const now = Date.now();

            // Check submission cooldown
            if (team.submission_cooldown_expiry && team.submission_cooldown_expiry > now) {
                const remainingMs = team.submission_cooldown_expiry - now;
                throw new Error(JSON.stringify({
                    code: 'SUBMISSION_LOCKED',
                    cooldown_ms: remainingMs,
                    cooldown_seconds: Math.ceil(remainingMs / 1000),
                }));
            }

            // 3. Verify puzzle is active and matches
            if (globalState.active_puzzle_id !== puzzleId) {
                throw TOO_LATE;
            }

            // 4. Get puzzle and validate answer
            const puzzleRef = db.collection('events').doc(eventId).collection('puzzle_pool').doc(puzzleId);
            const puzzleSnap = await transaction.get(puzzleRef);

            if (!puzzleSnap.exists) {
                throw PUZZLE_NOT_FOUND;
            }

            const puzzle = puzzleSnap.data();
            const isCorrect = validateAnswer(
                answerText,
                puzzle.correct_answer,
                puzzle.answer_aliases || []
            );

            // 5a. WRONG ANSWER BRANCH
            if (!isCorrect) {
                const newStrikeCount = (team.cooldown_strike_count || 0) + 1;
                const cooldown = calculateCooldown(newStrikeCount);

                // If Shield is active, consume it instead of applying cooldown
                let hasShield = team.shield_active || false;
                if (hasShield) {
                    transaction.update(teamRef, {
                        shield_active: false,
                        last_shield_used_at: admin.firestore.Timestamp.now(),
                    });
                } else {
                    transaction.update(teamRef, {
                        cooldown_strike_count: newStrikeCount,
                        submission_cooldown_expiry: now + cooldown * 1000,
                    });
                }

                return {
                    status: 'WRONG',
                    message: hasShield ? 'Shield absorbed the penalty!' : 'Incorrect answer',
                    shield_used: hasShield,
                    cooldown_seconds: hasShield ? 0 : cooldown,
                    strike_count: newStrikeCount,
                };
            }

            // 5b. CORRECT ANSWER BRANCH
            // Calculate damage
            let damage = puzzle.fixed_damage_value || 50;

            // Check for Double Damage powerup
            const hasDoubleDamage = (team.active_powerups || []).includes('DOUBLE_DAMAGE');
            if (hasDoubleDamage) {
                damage = calculateDamage(damage, true);
                // Remove powerup after use
                const updatedPowerups = team.active_powerups.filter(p => p !== 'DOUBLE_DAMAGE');
                transaction.update(teamRef, {
                    active_powerups: updatedPowerups,
                });
            }

            // Check for time bonus
            let timeBonusApplied = false;
            if (puzzle.time_bonus_enabled && globalState.active_puzzle_started_at) {
                if (isWithinTimeBonus(
                    globalState.active_puzzle_started_at,
                    submittedAt,
                    puzzle.time_bonus_window_seconds
                )) {
                    damage += puzzle.time_bonus_damage || 0;
                    timeBonusApplied = true;
                }
            }

            // Update boss HP
            const newBossHp = Math.max(0, globalState.boss_current_hp - damage);
            const bossDefeated = newBossHp <= 0;

            // Update global state
            const globalStateUpdate = {
                boss_current_hp: newBossHp,
                last_solved_by_team: team.team_name,
                last_solved_at: admin.firestore.Timestamp.now(),
                intermission_until: null,
            };

            if (!bossDefeated) {
                // Find next puzzle
                const nextPuzzleSnap = await transaction.get(
                    db.collection('events').doc(eventId).collection('puzzle_pool')
                        .where('sequence_order', '>', puzzle.sequence_order)
                        .orderBy('sequence_order', 'asc')
                        .limit(1)
                );
                if (nextPuzzleSnap.docs.length > 0) {
                    globalStateUpdate.active_puzzle_id = nextPuzzleSnap.docs[0].id;
                    globalStateUpdate.active_puzzle_index = nextPuzzleSnap.docs[0].data().sequence_order;
                    globalStateUpdate.active_puzzle_status = 'PLAYING';
                    globalStateUpdate.active_puzzle_started_at = Date.now();
                } else {
                    // No more puzzles and boss is still alive: players lose.
                    globalStateUpdate.game_status = 'CONCLUDED';
                    globalStateUpdate.game_outcome = 'LOST';
                    globalStateUpdate.concluded_reason = 'QUESTIONS_EXHAUSTED';
                    globalStateUpdate.concluded_at = admin.firestore.Timestamp.now();
                    globalStateUpdate.active_puzzle_status = 'COMPLETED';
                }
            } else {
                // Boss defeated: players win immediately, even if puzzles remain.
                globalStateUpdate.game_status = 'CONCLUDED';
                globalStateUpdate.game_outcome = 'WON';
                globalStateUpdate.concluded_reason = 'BOSS_DEFEATED';
                globalStateUpdate.concluded_at = admin.firestore.Timestamp.now();
                globalStateUpdate.active_puzzle_status = 'COMPLETED';
            }

            transaction.update(eventRef, globalStateUpdate);
            transaction.update(puzzleRef, {
                status: 'SOLVED',
                solved_by_team: team.team_name,
                solved_by_team_id: teamId,
                solved_at: admin.firestore.Timestamp.now(),
            });

            // Update team
            transaction.update(teamRef, {
                total_damage_dealt: (team.total_damage_dealt || 0) + damage,
                puzzles_solved: (team.puzzles_solved || 0) + 1,
                cooldown_strike_count: 0,
                submission_cooldown_expiry: null,
            });

            // Write battle log entry
            const logId = generateId();
            const logData = {
                log_id: logId,
                timestamp: admin.firestore.Timestamp.now(),
                event_type: 'PUZZLE_SOLVED',
                team_name: team.team_name,
                team_id: teamId,
                puzzle_id: puzzleId,
                damage_dealt: damage,
                boss_hp_after: newBossHp,
                time_bonus_applied: timeBonusApplied,
                double_damage_applied: hasDoubleDamage,
                message: `${team.team_name} dealt ${damage} damage! Boss HP: ${newBossHp}/${globalState.boss_max_hp}`,
            };

            transaction.set(
                db.collection('events').doc(eventId).collection('battle_log').doc(logId),
                logData
            );

            return {
                status: 'CORRECT',
                damage_dealt: damage,
                new_team_total: (team.total_damage_dealt || 0) + damage,
                new_boss_hp: newBossHp,
                game_concluded: globalStateUpdate.game_status === 'CONCLUDED',
                game_outcome: globalStateUpdate.game_outcome || null,
                time_bonus_applied: timeBonusApplied,
                double_damage_applied: hasDoubleDamage,
            };
        });

        return result;
    } catch (error) {
        console.error('submitAnswer error:', error);
        return createErrorResponse(error);
    }
});
