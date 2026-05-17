/**
 * Custom Authentication Middleware
 * Set up custom claims and auth verification
 */

const admin = require('firebase-admin');
const auth = admin.auth();

/**
 * Create or upgrade organizer user
 * @param {string} uid - Firebase Auth UID
 * @param {string} email - Organizer email
 */
async function createOrganizerUser(uid, email) {
    try {
        // Create user or get existing
        let user;
        try {
            user = await auth.getUser(uid);
        } catch (err) {
            user = await auth.createUser({ uid, email });
        }

        // Set organizer claims
        await auth.setCustomUserClaims(uid, {
            role: 'organizer',
            created_at: Date.now(),
        });

        console.log(`✓ Organizer user created: ${email}`);
        return user;
    } catch (error) {
        console.error('Error creating organizer user:', error);
        throw error;
    }
}

/**
 * Revoke organizer privileges
 * @param {string} uid - Firebase Auth UID
 */
async function revokeOrganizerClaims(uid) {
    try {
        await auth.setCustomUserClaims(uid, {});
        console.log(`✓ Organizer claims revoked: ${uid}`);
    } catch (error) {
        console.error('Error revoking claims:', error);
        throw error;
    }
}

/**
 * Verify custom token and extract claims
 * @param {string} token - Custom token from team registration
 * @returns {Object} Decoded token with claims
 */
async function verifyToken(token) {
    try {
        const decoded = await auth.verifyIdToken(token);
        return decoded;
    } catch (error) {
        console.error('Token verification failed:', error);
        throw error;
    }
}

module.exports = {
    createOrganizerUser,
    revokeOrganizerClaims,
    verifyToken,
};
