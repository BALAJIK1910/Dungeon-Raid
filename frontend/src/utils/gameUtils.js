/**
 * Normalize an answer for comparison
 * @param {string} text - Raw user input
 * @returns {string} Normalized answer
 */
export function normalizeAnswer(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // collapse internal whitespace
}

/**
 * Check if a submitted answer is correct
 * @param {string} submitted - User's answer
 * @param {string} correct - Correct answer
 * @param {string[]} aliases - Alternative correct answers
 * @returns {boolean} True if answer matches
 */
export function checkAnswer(submitted, correct, aliases = []) {
  const norm = normalizeAnswer(submitted);
  return norm === normalizeAnswer(correct || '') || aliases.map(normalizeAnswer).includes(norm);
}

/**
 * Calculate cooldown seconds based on strike count
 * @param {number} strikeCount - Number of wrong submissions
 * @returns {number} Cooldown in seconds, capped at 120
 */
export function calculateCooldown(strikeCount) {
  if (strikeCount === 0) return 0;
  const base = 10;
  const multiplier = Math.pow(2, strikeCount - 1);
  return Math.min(base * multiplier, 120);
}

/**
 * Format a timestamp for display
 * @param {number|Date|Timestamp} ts - Timestamp to format
 * @returns {string} ISO string or empty
 */
export function formatTimestamp(ts) {
  if (!ts) return '';
  if (typeof ts === 'number') return new Date(ts).toISOString();
  if (ts.toDate) return ts.toDate().toISOString();
  return ts.toISOString?.() || '';
}

/**
 * Calculate time remaining from expiry timestamp
 * @param {number} expiryMs - Expiry timestamp in ms
 * @returns {number} Milliseconds remaining (min 0)
 */
export function getTimeRemaining(expiryMs) {
  if (!expiryMs) return 0;
  return Math.max(0, expiryMs - Date.now());
}

/**
 * Convert milliseconds to MM:SS format
 * @param {number} ms - Milliseconds
 * @returns {string} "MM:SS" format
 */
export function msToMMSS(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default {
  normalizeAnswer,
  checkAnswer,
  calculateCooldown,
  formatTimestamp,
  getTimeRemaining,
  msToMMSS,
};
