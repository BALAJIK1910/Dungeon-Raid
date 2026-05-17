/**
 * Cloud Functions Entry Point (Firebase v2)
 * All game logic functions for Tech Warzone 2026
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Export all Cloud Functions
exports.submitAnswer = require('./submitAnswer').submitAnswer;
exports.activatePowerup = require('./activatePowerup').activatePowerup;
exports.useHint = require('./useHint').useHint;
exports.organiserControl = require('./organiserControl').organiserControl;
exports.registerTeam = require('./registerTeam').registerTeam;
exports.createEvent = require('./createEvent').createEvent;

// Health check function
exports.healthCheck = functions.https.onCall(async (data, context) => {
    return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        functions_available: [
            'submitAnswer',
            'activatePowerup',
            'useHint',
            'organiserControl',
            'registerTeam',
            'createEvent',
        ],
    };
});

console.log('Tech Warzone 2026 Cloud Functions initialized');
