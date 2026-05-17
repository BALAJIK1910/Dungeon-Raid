/**
 * Custom error types for game logic
 */

class GameError extends Error {
    constructor(code, message, statusCode = 400) {
        super(message);
        this.name = 'GameError';
        this.code = code;
        this.statusCode = statusCode;
    }

    toJSON() {
        return {
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
        };
    }
}

// Game state errors
const GAME_NOT_ACTIVE = new GameError('GAME_NOT_ACTIVE', 'Game is not currently active', 409);
const GAME_PAUSED = new GameError('GAME_PAUSED', 'Game is paused', 409);
const GAME_CONCLUDED = new GameError('GAME_CONCLUDED', 'Game has concluded', 409);
const GAME_PENDING = new GameError('GAME_PENDING', 'Game has not started yet', 409);

// Authentication errors
const UNAUTHORIZED = new GameError('UNAUTHORIZED', 'Unauthorized action', 403);
const TEAM_NOT_FOUND = new GameError('TEAM_NOT_FOUND', 'Team not found', 404);
const EVENT_NOT_FOUND = new GameError('EVENT_NOT_FOUND', 'Event not found', 404);
const ORGANIZER_ONLY = new GameError('ORGANIZER_ONLY', 'Only organizers can perform this action', 403);
const TEAM_ALREADY_REGISTERED = new GameError('TEAM_ALREADY_REGISTERED', 'Team already registered in this event', 409);
const INVALID_JOIN_CODE = new GameError('INVALID_JOIN_CODE', 'Invalid join code', 400);

// Submission errors
const PUZZLE_NOT_FOUND = new GameError('PUZZLE_NOT_FOUND', 'Puzzle not found', 404);
const ANSWER_WRONG = new GameError('ANSWER_WRONG', 'Incorrect answer', 400);
const ANSWER_CORRECT = new GameError('ANSWER_CORRECT', 'Correct answer! Damage dealt.', 201);
const SUBMISSION_LOCKED = new GameError('SUBMISSION_LOCKED', 'Submission locked due to cooldown', 429);
const PUZZLE_ALREADY_SOLVED = new GameError('PUZZLE_ALREADY_SOLVED', 'This puzzle has already been solved', 409);
const TOO_LATE = new GameError('TOO_LATE', 'Answer submitted after puzzle was solved', 409);

// Powerup errors
const POWERUP_NOT_FOUND = new GameError('POWERUP_NOT_FOUND', 'Power-up not found', 404);
const POWERUPS_DISABLED = new GameError('POWERUPS_DISABLED', 'Power-ups are disabled for this event', 409);
const POWERUP_ACTIVE = new GameError('POWERUP_ACTIVE', 'A power-up is already active', 409);

// Hint errors
const NO_HINT_TOKENS = new GameError('NO_HINT_TOKENS', 'No hint tokens remaining', 400);
const INVALID_PUZZLE_ID = new GameError('INVALID_PUZZLE_ID', 'Invalid puzzle ID for this event', 400);

// Validation errors
const INVALID_INPUT = new GameError('INVALID_INPUT', 'Invalid input provided', 400);
const MISSING_FIELD = (field) => new GameError('MISSING_FIELD', `Missing required field: ${field}`, 400);

function createErrorResponse(error) {
    if (error instanceof GameError) {
        return {
            status: 'error',
            ...error.toJSON(),
        };
    }
    return {
        status: 'error',
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred',
        statusCode: 500,
    };
}

module.exports = {
    GameError,
    GAME_NOT_ACTIVE,
    GAME_PAUSED,
    GAME_CONCLUDED,
    GAME_PENDING,
    UNAUTHORIZED,
    TEAM_NOT_FOUND,
    EVENT_NOT_FOUND,
    ORGANIZER_ONLY,
    TEAM_ALREADY_REGISTERED,
    INVALID_JOIN_CODE,
    PUZZLE_NOT_FOUND,
    ANSWER_WRONG,
    ANSWER_CORRECT,
    SUBMISSION_LOCKED,
    PUZZLE_ALREADY_SOLVED,
    TOO_LATE,
    POWERUP_NOT_FOUND,
    POWERUPS_DISABLED,
    POWERUP_ACTIVE,
    NO_HINT_TOKENS,
    INVALID_PUZZLE_ID,
    INVALID_INPUT,
    MISSING_FIELD,
    createErrorResponse,
};
