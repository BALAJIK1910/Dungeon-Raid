import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './config';

const provider = new GoogleAuthProvider();

/**
 * Sign in with Google for organizers
 * @returns Promise<UserCredential>
 */
export const signInWithGoogle = () => signInWithPopup(auth, provider);

/**
 * Sign in anonymously (for teams after registerTeam)
 * @returns Promise<UserCredential>
 */
export const signInAnonymously = async () => {
  const { signInAnonymously: anonSignIn } = await import('firebase/auth');
  return anonSignIn(auth);
};

/**
 * Sign out current user
 * @returns Promise<void>
 */
export const signOutUser = () => signOut(auth);

/**
 * Listen to auth state changes
 * @param {function} callback - Called with user or null
 * @returns Unsubscribe function
 */
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

/**
 * Get current user's custom claims
 * @returns {object|null} Custom claims or null
 */
export const getCurrentClaims = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  const idTokenResult = await user.getIdTokenResult();
  return idTokenResult.claims;
};

export default auth;
