import { devLog, devError } from './environmentUtils';

interface StorageMetrics {
  used: number;
  available: number;
  quota: number;
  usagePercentage: number;
}

interface QuotaCheckResult {
  canWrite: boolean;
  freeSpace: number;
  metrics: StorageMetrics;
  critical: boolean;
}

/**
 * Emergency localStorage quota management system
 * Prevents quota exceeded errors and manages storage efficiently
 */
export class StorageQuotaManager {
  private static readonly QUOTA_WARNING_THRESHOLD = 0.8; // 80%
  private static readonly QUOTA_CRITICAL_THRESHOLD = 0.95; // 95%
  private static readonly MIN_FREE_SPACE = 1024 * 1024; // 1MB minimum
  private static readonly EMERGENCY_CLEANUP_AMOUNT = 0.3; // Clean 30% when critical
  
  /**
   * Check available localStorage quota before writing
   */
  static checkQuota(estimatedSize: number = 0): QuotaCheckResult {
    try {
      const metrics = this.getStorageMetrics();
      const freeSpace = metrics.quota - metrics.used;
      const canWrite = freeSpace > Math.max(estimatedSize, this.MIN_FREE_SPACE);
      const critical = metrics.usagePercentage > this.QUOTA_CRITICAL_THRESHOLD;
      
      return {
        canWrite,
        freeSpace,
        metrics,
        critical
      };
    } catch (error) {
      devError('Storage quota check failed:', error);
      return {
        canWrite: false,
        freeSpace: 0,
        metrics: { used: 0, available: 0, quota: 0, usagePercentage: 1 },
        critical: true
      };
    }
  }
  
  /**
   * Get current localStorage usage metrics
   */
  static getStorageMetrics(): StorageMetrics {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { used: 0, available: 0, quota: 0, usagePercentage: 0 };
    }
    
    let used = 0;
    const quota = this.estimateStorageQuota();
    
    // Calculate actual usage by iterating through all keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          used += (key.length + value.length) * 2; // UTF-16 encoding
        }
      }
    }
    
    const available = quota - used;
    const usagePercentage = used / quota;
    
    return { used, available, quota, usagePercentage };
  }
  
  /**
   * Estimate localStorage quota (browsers vary)
   */
  private static estimateStorageQuota(): number {
    try {
      // Try to detect actual quota through test writes
      const testKey = '__quota_test__';
      const testChunk = 'x'.repeat(1024 * 1024); // 1MB chunks
      let size = 0;
      
      try {
        while (size < 50 * 1024 * 1024) { // Max 50MB test
          localStorage.setItem(testKey, testChunk.repeat(size / (1024 * 1024) + 1));
          size += 1024 * 1024;
        }
      } catch (e) {
        // Hit quota, clean up test data
        localStorage.removeItem(testKey);
        return size;
      }
      
      localStorage.removeItem(testKey);
      return 10 * 1024 * 1024; // Default to 10MB if no limit hit
    } catch (error) {
      // Conservative estimate for mobile/older browsers
      return 5 * 1024 * 1024; // 5MB
    }
  }
  
  /**
   * Emergency cleanup when quota is exceeded
   */
  static emergencyCleanup(): boolean {
    devLog('🚨 Emergency localStorage cleanup initiated');
    
    try {
      const beforeMetrics = this.getStorageMetrics();
      const targetCleanup = beforeMetrics.quota * this.EMERGENCY_CLEANUP_AMOUNT;
      let cleaned = 0;
      
      // Phase 1: Remove old session data (oldest first)
      cleaned += this.cleanupOldSessions();
      
      // Phase 2: Remove temporary/debug data
      if (cleaned < targetCleanup) {
        cleaned += this.cleanupTemporaryData();
      }
      
      // Phase 3: Remove analytics/tracking data
      if (cleaned < targetCleanup) {
        cleaned += this.cleanupAnalyticsData();
      }
      
      // Phase 4: Nuclear option - remove all non-essential data
      if (cleaned < targetCleanup) {
        cleaned += this.cleanupNonEssentialData();
      }
      
      const afterMetrics = this.getStorageMetrics();
      const success = afterMetrics.usagePercentage < this.QUOTA_WARNING_THRESHOLD;
      
      devLog(`🧹 Emergency cleanup completed: ${this.formatBytes(cleaned)} freed, success: ${success}`);
      return success;
    } catch (error) {
      devError('Emergency cleanup failed:', error);
      return false;
    }
  }
  
  /**
   * Clean up old session data
   */
  private static cleanupOldSessions(): number {
    let cleaned = 0;
    const sessionKeys: Array<{key: string, timestamp: number, size: number}> = [];
    
    // Find all session-related keys with timestamps
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('wmh_session_')) {
        const value = localStorage.getItem(key);
        if (value) {
          // Extract timestamp from key (format: wmh_session_userId_timestamp)
          const timestampMatch = key.match(/_(\d+)$/);
          const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();
          const size = (key.length + value.length) * 2;
          sessionKeys.push({ key, timestamp, size });
        }
      }
    }
    
    // Sort by timestamp (oldest first) and remove old ones
    sessionKeys.sort((a, b) => a.timestamp - b.timestamp);
    
    // Keep only the most recent session, remove others
    for (let i = 0; i < sessionKeys.length - 1; i++) {
      const item = sessionKeys[i];
      localStorage.removeItem(item.key);
      cleaned += item.size;
      devLog(`🗑️ Removed old session key: ${item.key}`);
    }
    
    return cleaned;
  }
  
  /**
   * Clean up temporary and debug data
   */
  private static cleanupTemporaryData(): number {
    let cleaned = 0;
    const tempPrefixes = ['temp_', 'debug_', 'test_', '__', '_tmp_'];
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && tempPrefixes.some(prefix => key.startsWith(prefix))) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = (key.length + value.length) * 2;
          localStorage.removeItem(key);
          cleaned += size;
          devLog(`🗑️ Removed temporary data: ${key}`);
        }
      }
    }
    
    return cleaned;
  }
  
  /**
   * Clean up analytics and tracking data
   */
  private static cleanupAnalyticsData(): number {
    let cleaned = 0;
    const analyticsPrefixes = ['analytics_', 'tracking_', 'metrics_', 'event_'];
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && analyticsPrefixes.some(prefix => key.startsWith(prefix))) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = (key.length + value.length) * 2;
          localStorage.removeItem(key);
          cleaned += size;
          devLog(`🗑️ Removed analytics data: ${key}`);
        }
      }
    }
    
    return cleaned;
  }
  
  /**
   * Nuclear option: remove all non-essential data
   */
  private static cleanupNonEssentialData(): number {
    let cleaned = 0;
    // Protected keys that should never be cleaned up
    const essentialKeys = [
      'wmh_sessions', 
      'wmh_active_session',
      'sb-vgdreuwmisludqxphsph-auth-token',
      'supabase.auth.token'
    ];
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && !essentialKeys.some(essential => key.includes(essential))) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = (key.length + value.length) * 2;
          localStorage.removeItem(key);
          cleaned += size;
          devLog(`🗑️ Nuclear cleanup removed: ${key}`);
        }
      }
    }
    
    return cleaned;
  }

  /**
   * Selective cleanup targeting specific patterns
   */
  static selectiveCleanup(patterns: string[]): boolean {
    let cleaned = 0;
    
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Skip Supabase auth tokens and session data
        const isProtected = key.includes('sb-') && key.includes('auth') || 
                           key.includes('wmh_sessions') || 
                           key.includes('wmh_active_session');
        
        if (isProtected) continue;

        // Check if key matches any cleanup pattern
        const shouldRemove = patterns.some(pattern => 
          key.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (shouldRemove) {
          const value = localStorage.getItem(key);
          if (value) {
            const size = (key.length + value.length) * 2;
            localStorage.removeItem(key);
            cleaned += size;
            devLog(`🗑️ Selective cleanup removed: ${key}`);
          }
        }
      }
      
      devLog(`🧹 Selective cleanup completed: ${this.formatBytes(cleaned)} freed`);
      return cleaned > 0;
    } catch (error) {
      devError('❌ Selective cleanup failed:', error);
      return false;
    }
  }
  
  /**
   * Safe localStorage setItem with quota checking
   */
  static safeSetItem(key: string, value: string): boolean {
    const estimatedSize = (key.length + value.length) * 2;
    const quotaCheck = this.checkQuota(estimatedSize);
    
    if (!quotaCheck.canWrite || quotaCheck.critical) {
      devLog(`🚨 Storage quota critical, attempting emergency cleanup`);
      const cleanupSuccess = this.emergencyCleanup();
      
      if (!cleanupSuccess) {
        devError(`❌ Failed to free enough space for ${key}`);
        return false;
      }
      
      // Re-check after cleanup
      const recheckQuota = this.checkQuota(estimatedSize);
      if (!recheckQuota.canWrite) {
        devError(`❌ Still insufficient space after cleanup for ${key}`);
        return false;
      }
    }
    
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      devError(`❌ Failed to write ${key} to localStorage:`, error);
      
      // Last resort emergency cleanup
      this.emergencyCleanup();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        devError(`❌ Final retry failed for ${key}:`, retryError);
        return false;
      }
    }
  }
  
  /**
   * Format bytes for human readable output
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Get storage usage report for debugging
   */
  static getStorageReport(): string {
    const metrics = this.getStorageMetrics();
    const quotaCheck = this.checkQuota();
    
    return `
📊 localStorage Usage Report:
- Used: ${this.formatBytes(metrics.used)} (${(metrics.usagePercentage * 100).toFixed(1)}%)
- Available: ${this.formatBytes(metrics.available)}
- Quota: ${this.formatBytes(metrics.quota)}
- Can Write: ${quotaCheck.canWrite ? '✅' : '❌'}
- Critical: ${quotaCheck.critical ? '🚨' : '✅'}
    `.trim();
  }
}
