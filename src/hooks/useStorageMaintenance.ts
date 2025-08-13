
import { useMemo } from 'react';
import { StorageQuotaManager } from '@/utils/storageQuotaManager';
import { devLog, devError } from '@/utils/environmentUtils';

/**
 * Enhanced storage maintenance utilities with quota management
 * Prevents localStorage quota exceeded errors and manages storage efficiently
 */
export const useStorageMaintenance = () => {
  const checkStorageIntegrity = useMemo(() => {
    return () => {
      try {
        // Ensure localStorage is accessible
        if (typeof window === 'undefined' || !window.localStorage) {
          return true;
        }

        // Check quota status first
        const quotaCheck = StorageQuotaManager.checkQuota();
        if (quotaCheck.critical) {
          devLog('🚨 Storage quota critical during integrity check, performing emergency cleanup');
          StorageQuotaManager.emergencyCleanup();
        }

        const raw = localStorage.getItem('wmh_sessions');
        if (!raw) return true;

        try {
          const parsed = JSON.parse(raw);
          // Basic sanity check on structure
          if (!Array.isArray(parsed)) {
            localStorage.removeItem('wmh_sessions');
            localStorage.removeItem('wmh_active_session');
            devLog('🔐 Storage integrity: invalid shape, cleared sessions');
            return false;
          }
          return true;
        } catch (e) {
          // Corrupt JSON: clear and report false so caller can short-circuit load
          localStorage.removeItem('wmh_sessions');
          localStorage.removeItem('wmh_active_session');
          devLog('🔐 Storage integrity: JSON parse failed, cleared sessions');
          return false;
        }
      } catch (err) {
        devError('🔐 Storage integrity check failed:', err);
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
          const success = StorageQuotaManager.safeSetItem('wmh_sessions', JSON.stringify(cleaned));
          if (success) {
            devLog('🔐 Cleaned malformed session entries:', parsed.length - cleaned.length);
          } else {
            devError('❌ Failed to save cleaned sessions due to quota');
          }
        }

        // Ensure active session id exists
        if (activeId && !cleaned.some((s: any) => s.id === activeId)) {
          localStorage.removeItem('wmh_active_session');
          devLog('🔐 Removed orphaned active session id:', activeId);
        }

        // Additional cleanup for old session storage keys
        const keysToClean: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('wmh_session_')) {
            // Check if this key belongs to any current session
            const belongsToCurrentSession = cleaned.some((session: any) => {
              const timestamp = new Date(session.createdAt).getTime();
              return key.includes(`${session.user.id}_${timestamp}`);
            });
            
            if (!belongsToCurrentSession) {
              keysToClean.push(key);
            }
          }
        }
        
        // Remove orphaned session keys
        keysToClean.forEach(key => {
          localStorage.removeItem(key);
          devLog('🗑️ Removed orphaned session key:', key);
        });

      } catch (err) {
        devError('🔐 Orphaned storage cleanup error:', err);
      }
    };
  }, []);

  const getStorageReport = useMemo(() => {
    return () => StorageQuotaManager.getStorageReport();
  }, []);

  const emergencyCleanup = useMemo(() => {
    return () => StorageQuotaManager.emergencyCleanup();
  }, []);

  return { 
    checkStorageIntegrity, 
    cleanupOrphanedStorage,
    getStorageReport,
    emergencyCleanup
  };
};
