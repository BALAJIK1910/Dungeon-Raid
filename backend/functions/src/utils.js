/**
 * Utility functions for game logic
 */

/**
 * Normalize answer text: lowercase, trim, and check against aliases
 * @param {string} input - Raw user input
 * @param {string} correctAnswer - Normalized correct answer
 * @param {Array<string>} aliases - Alternative correct answers
 * @returns {boolean} True if input matches correct answer or aliases
 */
function validateAnswer(input, correctAnswer, aliases = []) {
    const normalized = input.toLowerCase().trim();
    const allValid = [correctAnswer, ...aliases];
    return allValid.some(valid => valid.toLowerCase().trim() === normalized);
}

/**
 * Normalize a string for storage: lowercase, trim
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeAnswer(text) {
    return text.toLowerCase().trim();
}

/**
 * Calculate cooldown seconds based on strike count
 * Formula: 10 * 2^(strike_count - 1), capped at 120 seconds
 * @param {number} strikeCount - Current consecutive wrong attempts
 * @returns {number} Cooldown in seconds
 */
function calculateCooldown(strikeCount) {
    if (strikeCount <= 0) return 0;
    const cooldown = 10 * Math.pow(2, strikeCount - 1);
    return Math.min(cooldown, 120);
}

/**
 * Calculate total damage for a correct answer submission
 * @param {number} fixedDamage - Base damage value from puzzle
 * @param {boolean} doubleDamageActive - Whether Double Damage powerup is active
 * @param {boolean} timeBonus - Whether time bonus applies
 * @param {number} timeBonusDamage - Bonus damage value
 * @returns {number} Total damage to apply
 */
function calculateDamage(fixedDamage, doubleDamageActive = false, timeBonus = false, timeBonusDamage = 0) {
    let damage = fixedDamage;
    if (doubleDamageActive) {
        damage *= 2;
    }
    if (timeBonus) {
        damage += timeBonusDamage;
    }
    return Math.max(damage, 1); // Ensure at least 1 damage
}

/**
 * Check if a submission is within the time bonus window
 * @param {number} puzzleStartedAt - Timestamp when puzzle was activated (ms)
 * @param {number} submittedAt - Timestamp of submission (ms)
 * @param {number} windowSeconds - Time window in seconds
 * @returns {boolean} True if within window
 */
function isWithinTimeBonus(puzzleStartedAt, submittedAt, windowSeconds) {
    const elapsed = (submittedAt - puzzleStartedAt) / 1000;
    return elapsed >= 0 && elapsed <= windowSeconds;
}

/**
 * Generate a random 6-character alphanumeric join code
 * @returns {string} Join code (e.g., "A7K92M")
 */
function generateJoinCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Generate a random ID (alphanumeric, 20 chars)
 * @returns {string} Random ID
 */
function generateId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 20; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

/**
 * Format timestamp for logging
 * @param {number|Object} timestamp - Firestore timestamp or Date
 * @returns {string} ISO string
 */
function formatTimestamp(timestamp) {
    if (timestamp.toDate) {
        return timestamp.toDate().toISOString();
    }
    return new Date(timestamp).toISOString();
}

module.exports = {
    validateAnswer,
    normalizeAnswer,
    calculateCooldown,
    calculateDamage,
    isWithinTimeBonus,
    generateJoinCode,
    generateId,
    formatTimestamp,
};
