import { useEffect, useRef, useCallback } from 'react';
import { useSessionManager } from '@/contexts/SessionManagerContext';

export const useSessionMemoryMonitor = () => {
  const { sessions } = useSessionManager();
  const lastMemoryCheck = useRef<number>(0);
  const memoryStats = useRef<{
    sessionCount: number;
    storageKeys: number;
    clientCount: number;
    timestamp: number;
  }>({ sessionCount: 0, storageKeys: 0, clientCount: 0, timestamp: 0 });

  const checkMemoryUsage = useCallback(() => {
    const now = Date.now();
    
    // Only check memory every 30 seconds to avoid performance impact
    if (now - lastMemoryCheck.current < 30000) {
      return memoryStats.current;
    }

    try {
      // Count WMH-related localStorage keys
      const wmhKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('wmh_') || key.includes('mobile-home') || key.includes('cart_data')
      );
      
      // Estimate client count (not directly accessible)
      const estimatedClientCount = sessions.length;
      
      const stats = {
        sessionCount: sessions.length,
        storageKeys: wmhKeys.length,
        clientCount: estimatedClientCount,
        timestamp: now
      };
      
      memoryStats.current = stats;
      lastMemoryCheck.current = now;
      
      // Log memory stats periodically
      if (stats.sessionCount > 3 || stats.storageKeys > 20) {
        console.warn('🔐 High memory usage detected:', stats);
      } else {
        console.log('🔐 Memory usage check:', stats);
      }
      
      return stats;
    } catch (error) {
      console.error('🔐 Error checking memory usage:', error);
      return memoryStats.current;
    }
  }, [sessions.length]);

  const cleanupOrphanedData = useCallback(() => {
    try {
      const currentUserIds = sessions.map(s => s.user.id);
      const wmhKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('wmh_') || key.includes('mobile-home') || key.includes('cart_data')
      );
      
      let cleanedCount = 0;
      
      wmhKeys.forEach(key => {
        // Extract user ID from key patterns
        const userIdMatch = key.match(/user_([a-f0-9-]+)/);
        if (userIdMatch) {
          const userId = userIdMatch[1];
          if (!currentUserIds.includes(userId)) {
            localStorage.removeItem(key);
            cleanedCount++;
            console.log('🔐 Cleaned orphaned storage key:', key);
          }
        }
      });
      
      if (cleanedCount > 0) {
        console.log('🔐 Cleaned up', cleanedCount, 'orphaned storage keys');
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('🔐 Error cleaning orphaned data:', error);
      return 0;
    }
  }, [sessions]);

  // Monitor memory usage and cleanup periodically
  useEffect(() => {
    const memoryMonitorInterval = setInterval(() => {
      const stats = checkMemoryUsage();
      
      // Auto-cleanup if we detect too many orphaned keys
      if (stats.storageKeys > stats.sessionCount * 5) {
        console.log('🔐 Triggering automatic cleanup due to high storage key count');
        cleanupOrphanedData();
      }
    }, 60000); // Check every minute

    // Initial check
    setTimeout(checkMemoryUsage, 2000);
    
    return () => clearInterval(memoryMonitorInterval);
  }, [checkMemoryUsage, cleanupOrphanedData]);

  return {
    checkMemoryUsage,
    cleanupOrphanedData,
    getMemoryStats: () => memoryStats.current
  };
};