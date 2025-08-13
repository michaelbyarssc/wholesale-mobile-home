
import { useMemo } from 'react';

/**
 * Standalone storage maintenance utilities that avoid importing SessionManager or any auth hooks
 * to prevent circular dependencies and TDZ runtime errors.
 */
export const useStorageMaintenance = () => {
  const checkStorageIntegrity = useMemo(() => {
    return () => {
      try {
        // Ensure localStorage is accessible
        if (typeof window === 'undefined' || !window.localStorage) {
          return true;
        }

        const raw = localStorage.getItem('wmh_sessions');
        if (!raw) return true;

        try {
          const parsed = JSON.parse(raw);
          // Basic sanity check on structure
          if (!Array.isArray(parsed)) {
            localStorage.removeItem('wmh_sessions');
            localStorage.removeItem('wmh_active_session');
            console.warn('🔐 Storage integrity: invalid shape, cleared sessions');
            return false;
          }
          return true;
        } catch (e) {
          // Corrupt JSON: clear and report false so caller can short-circuit load
          localStorage.removeItem('wmh_sessions');
          localStorage.removeItem('wmh_active_session');
          console.warn('🔐 Storage integrity: JSON parse failed, cleared sessions');
          return false;
        }
      } catch (err) {
        console.error('🔐 Storage integrity check failed:', err);
        return true; // avoid blocking initialization in unexpected environments
      }
    };
  }, []);

  const cleanupOrphanedStorage = useMemo(() => {
    return () => {
      try {
        if (typeof window === 'undefined' || !window.localStorage) return;

        const raw = localStorage.getItem('wmh_sessions');
        const activeId = localStorage.getItem('wmh_active_session');
        if (!raw) return;

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;

        // Remove malformed entries
        const cleaned = parsed.filter((s) => {
          return s && s.id && s.user && s.user.id && s.createdAt;
        });

        if (cleaned.length !== parsed.length) {
          localStorage.setItem('wmh_sessions', JSON.stringify(cleaned));
          console.log('🔐 Cleaned malformed session entries:', parsed.length - cleaned.length);
        }

        // Ensure active session id exists
        if (activeId && !cleaned.some((s: any) => s.id === activeId)) {
          localStorage.removeItem('wmh_active_session');
          console.log('🔐 Removed orphaned active session id:', activeId);
        }
      } catch (err) {
        console.error('🔐 Orphaned storage cleanup error:', err);
      }
    };
  }, []);

  return { checkStorageIntegrity, cleanupOrphanedStorage };
};
