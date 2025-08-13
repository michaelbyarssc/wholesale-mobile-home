import { devLog, devError, isDevelopment } from './environmentUtils';

/**
 * Auth system stabilizer to prevent React Strict Mode issues and initialization loops
 */
export class AuthStabilizer {
  private static initializationGuards = new Map<string, boolean>();
  private static clientInstanceLimits = new Map<string, number>();
  private static readonly MAX_CLIENTS_PER_USER = 2;
  private static readonly INITIALIZATION_DEBOUNCE = 100; // ms
  private static initializationTimeouts = new Map<string, NodeJS.Timeout>();
  
  /**
   * Check if initialization is already in progress for a user
   */
  static isInitializing(userId: string): boolean {
    return this.initializationGuards.get(userId) === true;
  }
  
  /**
   * Set initialization guard for a user
   */
  static setInitializing(userId: string, initializing: boolean): void {
    if (initializing) {
      this.initializationGuards.set(userId, true);
      devLog(`🔒 Auth initialization guard set for user: ${userId}`);
    } else {
      this.initializationGuards.delete(userId);
      devLog(`🔓 Auth initialization guard released for user: ${userId}`);
    }
  }
  
  /**
   * Debounced initialization to prevent rapid-fire calls
   */
  static debouncedInitialization<T>(
    userId: string, 
    initFn: () => Promise<T>,
    onComplete?: (result: T) => void
  ): Promise<T> | null {
    // Clear existing timeout
    const existingTimeout = this.initializationTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Check if already initializing
    if (this.isInitializing(userId)) {
      devLog(`⏭️ Skipping initialization for ${userId} - already in progress`);
      return null;
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          this.setInitializing(userId, true);
          const result = await initFn();
          onComplete?.(result);
          resolve(result);
        } catch (error) {
          devError(`❌ Debounced initialization failed for ${userId}:`, error);
          reject(error);
        } finally {
          this.setInitializing(userId, false);
          this.initializationTimeouts.delete(userId);
        }
      }, this.INITIALIZATION_DEBOUNCE);
      
      this.initializationTimeouts.set(userId, timeout);
    });
  }
  
  /**
   * Check if we can create another client instance for a user
   */
  static canCreateClientInstance(userId: string): boolean {
    const currentCount = this.clientInstanceLimits.get(userId) || 0;
    return currentCount < this.MAX_CLIENTS_PER_USER;
  }
  
  /**
   * Register a new client instance for a user
   */
  static registerClientInstance(userId: string): boolean {
    const currentCount = this.clientInstanceLimits.get(userId) || 0;
    
    if (currentCount >= this.MAX_CLIENTS_PER_USER) {
      devError(`❌ Maximum client instances (${this.MAX_CLIENTS_PER_USER}) reached for user: ${userId}`);
      return false;
    }
    
    this.clientInstanceLimits.set(userId, currentCount + 1);
    devLog(`📈 Registered client instance for ${userId} (${currentCount + 1}/${this.MAX_CLIENTS_PER_USER})`);
    return true;
  }
  
  /**
   * Unregister a client instance for a user
   */
  static unregisterClientInstance(userId: string): void {
    const currentCount = this.clientInstanceLimits.get(userId) || 0;
    
    if (currentCount <= 0) {
      devLog(`⚠️ No client instances to unregister for user: ${userId}`);
      return;
    }
    
    const newCount = currentCount - 1;
    if (newCount === 0) {
      this.clientInstanceLimits.delete(userId);
    } else {
      this.clientInstanceLimits.set(userId, newCount);
    }
    
    devLog(`📉 Unregistered client instance for ${userId} (${newCount}/${this.MAX_CLIENTS_PER_USER})`);
  }
  
  /**
   * React Strict Mode compatible useEffect wrapper
   */
  static createStrictModeCompatibleEffect<T>(
    effectFn: () => Promise<T>,
    cleanupFn?: () => void,
    deps?: any[]
  ): () => void {
    let mounted = true;
    let cleanupCalled = false;
    
    const cleanup = () => {
      if (!cleanupCalled) {
        cleanupCalled = true;
        mounted = false;
        cleanupFn?.();
      }
    };
    
    // Execute effect with mounting check
    const executeEffect = async () => {
      if (!mounted) return;
      
      try {
        await effectFn();
      } catch (error) {
        if (mounted) {
          devError('Effect execution error:', error);
        }
      }
    };
    
    // In development mode, React Strict Mode calls effects twice
    if (isDevelopment) {
      // Add a small delay to prevent rapid double execution
      setTimeout(executeEffect, 0);
    } else {
      executeEffect();
    }
    
    return cleanup;
  }
  
  /**
   * Session deduplication to prevent duplicate sessions for same user
   */
  static deduplicateSessions(sessions: any[]): any[] {
    const userMap = new Map<string, any>();
    
    // Keep the most recent session for each user
    sessions.forEach(session => {
      const userId = session.user?.id;
      if (!userId) return;
      
      const existing = userMap.get(userId);
      if (!existing || new Date(session.createdAt) > new Date(existing.createdAt)) {
        userMap.set(userId, session);
      }
    });
    
    const deduplicated = Array.from(userMap.values());
    
    if (deduplicated.length !== sessions.length) {
      devLog(`🔄 Deduplicated sessions: ${sessions.length} → ${deduplicated.length}`);
    }
    
    return deduplicated;
  }
  
  /**
   * Cleanup all guards and limits (for testing/reset)
   */
  static cleanup(): void {
    // Clear all timeouts
    for (const timeout of this.initializationTimeouts.values()) {
      clearTimeout(timeout);
    }
    
    this.initializationGuards.clear();
    this.clientInstanceLimits.clear();
    this.initializationTimeouts.clear();
    
    devLog('🧹 AuthStabilizer cleanup completed');
  }
  
  /**
   * Get current status for debugging
   */
  static getStatus(): string {
    const guards = Array.from(this.initializationGuards.entries());
    const limits = Array.from(this.clientInstanceLimits.entries());
    const timeouts = this.initializationTimeouts.size;
    
    return `
🔧 AuthStabilizer Status:
- Active Guards: ${guards.length} ${guards.map(([k, v]) => `${k}:${v}`).join(', ')}
- Client Limits: ${limits.length} ${limits.map(([k, v]) => `${k}:${v}`).join(', ')}
- Pending Timeouts: ${timeouts}
    `.trim();
  }
}
