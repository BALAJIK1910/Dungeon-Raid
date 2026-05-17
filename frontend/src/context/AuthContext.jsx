import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthChange, getCurrentClaims } from '../firebase/auth';

const AuthContext = createContext();

/**
 * Auth Provider - manages Firebase auth state
 * Provides user and claims to entire app
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            isAnonymous: firebaseUser.isAnonymous,
          });
          const userClaims = await getCurrentClaims();
          setClaims(userClaims);
        } else {
          setUser(null);
          setClaims(null);
        }
      } catch (err) {
        console.error('Error fetching auth state:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    claims,
    loading,
    error,
    isAuthenticated: !!user,
    isTeam: claims?.role === 'team',
    isOrganizer: claims?.role === 'organizer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
