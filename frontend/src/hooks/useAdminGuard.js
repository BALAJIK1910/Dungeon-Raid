import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Hook to check if user is authorized as admin
 * Checks: /admin_users/{uid} exists
 * @param {string} uid - User UID
 * @returns {boolean|null} True if authorized, false if not, null if loading
 */
export function useAdminGuard(uid) {
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    if (!uid) {
      setAuthorized(false);
      return;
    }

    const checkAuthorization = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'admin_users', uid));
        setAuthorized(snapshot.exists());
      } catch (error) {
        console.error('Error checking admin authorization:', error);
        setAuthorized(false);
      }
    };

    checkAuthorization();
  }, [uid]);

  return authorized;
}

export default useAdminGuard;
