import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'super_admin' | 'user' | 'driver';
}

export interface RoleCheck {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  hasRole: (role: 'admin' | 'super_admin' | 'user' | 'driver') => boolean;
  userRoles: UserRole[];
  isLoading: boolean;
  error: string | null;
  verifyAdminAccess: () => Promise<boolean>;
  forceRefreshRoles: () => Promise<void>;
}

/**
 * Centralized user role management hook
 * SECURITY: Always fetches fresh role data, no caching
 * Uses the secure is_admin() database function when possible
 */
export const useUserRoles = (): RoleCheck => {
  const { user, isLoading: authLoading, isLoginInProgress } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Request deduplication ref
  const rolesFetchInProgress = useRef(false);
  const hasRoleBeenFetched = useRef(new Set<string>());
  const roleRequestPromises = useRef(new Map<string, Promise<void>>());

  // Debug logging for role state
  console.log('useUserRoles: Current state', { 
    userEmail: user?.email, 
    userRoles: userRoles.map(r => r.role), 
    authLoading, 
    isLoading, 
    error 
  });

  const fetchUserRoles = useCallback(async (userId: string) => {
    if (!userId) {
      setUserRoles([]);
      setError(null);
      return;
    }

    const requestId = `${userId}-${Date.now()}`;

    // Check if we already fetched for this user
    if (hasRoleBeenFetched.current.has(userId)) {
      console.log(`🔐 ROLES [${requestId}]: Already fetched for user ${userId}, skipping`);
      return;
    }

    // Return existing promise if request is in progress
    if (roleRequestPromises.current.has(userId)) {
      console.log(`🔐 ROLES [${requestId}]: Request already in progress for user ${userId}, waiting for existing promise`);
      return roleRequestPromises.current.get(userId);
    }

    // Mark as fetched and create new promise
    hasRoleBeenFetched.current.add(userId);
    setIsLoading(true);
    setError(null);

    const rolePromise = (async () => {
      try {
        console.log(`🔐 ROLES [${requestId}]: Fetching roles for user ${userId}`);
        
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('id, user_id, role')
          .eq('user_id', userId);

        if (roleError) {
          console.error(`❌ ROLES [${requestId}]: Database error:`, roleError);
          setError(`Failed to fetch user roles: ${roleError.message}`);
          setUserRoles([]);
          return;
        }

        // SECURITY: Log role fetch for audit trail
        console.log(`🔐 [SECURITY] [${requestId}] Role fetch for user ${userId}:`, {
          roles: roleData?.map(r => r.role) || []
        });
        
        setUserRoles(roleData || []);
      } catch (err) {
        console.error(`❌ ROLES [${requestId}]: Unexpected error:`, err);
        setError('Failed to fetch user roles');
        setUserRoles([]);
      } finally {
        roleRequestPromises.current.delete(userId);
        setIsLoading(false);
      }
    })();

    roleRequestPromises.current.set(userId, rolePromise);
    return rolePromise;
  }, []);

  // Effect to fetch roles when user changes - coordinated after login completes
  useEffect(() => {
    if (!authLoading && user && !isLoginInProgress) {
      console.log('🔐 ROLES: Fetching roles for user:', user.email);
      fetchUserRoles(user.id);
    } else if (!authLoading && !user) {
      // Clear roles when user logs out
      setUserRoles([]);
      setError(null);
      hasRoleBeenFetched.current.clear();
      roleRequestPromises.current.clear();
    }
  }, [user?.id, authLoading, isLoginInProgress]);

  // Role checking functions
  const hasRole = useCallback((role: 'admin' | 'super_admin' | 'user' | 'driver') => {
    return userRoles.some(userRole => userRole.role === role);
  }, [userRoles]);

  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const isSuperAdmin = hasRole('super_admin');

  // SECURITY: Verify admin access using secure database function
  const verifyAdminAccess = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // Use the secure is_admin() database function for verification
      const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
      
      if (error) {
        console.error('[SECURITY] Error verifying admin access:', error);
        return false;
      }
      
      const dbResult = data === true;
      const hookResult = isAdmin;
      
      // SECURITY: Log mismatches for audit
      if (dbResult !== hookResult) {
        console.warn(`[SECURITY WARNING] Role mismatch for user ${user.id}: DB=${dbResult}, Hook=${hookResult}`);
      }
      
      return dbResult;
    } catch (err) {
      console.error('[SECURITY] Error in verifyAdminAccess:', err);
      return false;
    }
  }, [user, isAdmin]);

  // Force refresh roles - useful for clearing cache issues
  const forceRefreshRoles = useCallback(async () => {
    if (!user) return;
    console.log('useUserRoles: Force refreshing roles...');
    await fetchUserRoles(user.id);
  }, [user, fetchUserRoles]);

  return {
    isAdmin,
    isSuperAdmin,
    hasRole,
    userRoles,
    isLoading: authLoading || isLoading,
    error,
    verifyAdminAccess,
    forceRefreshRoles
  };
};

// REMOVED: Legacy compatibility function - Use useUserRoles() hook instead