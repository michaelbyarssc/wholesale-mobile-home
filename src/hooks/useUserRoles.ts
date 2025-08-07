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

    // Prevent concurrent fetches
    if (rolesFetchInProgress.current) {
      console.log('🔐 ROLES: Fetch already in progress, skipping');
      return;
    }

    rolesFetchInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Try direct role fetch first
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id, user_id, role')
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
        setError(`Failed to fetch user roles: ${roleError.message}`);
        setUserRoles([]);
        return;
      }

      // SECURITY: Log role fetch for audit trail
      console.log(`🔐 [SECURITY] Role fetch for user ${userId}:`, {
        roles: roleData?.map(r => r.role) || []
      });
      
      setUserRoles(roleData || []);
    } catch (err) {
      console.error('Error in fetchUserRoles:', err);
      setError('Failed to fetch user roles');
      setUserRoles([]);
    } finally {
      rolesFetchInProgress.current = false;
      setIsLoading(false);
    }
  }, []);

  // Effect to fetch roles when user changes - coordinated after login completes
  useEffect(() => {
    if (!authLoading && user && !isLoginInProgress && !isLoading) {
      console.log('🔐 ROLES: Fetching roles for user:', user.email);
      fetchUserRoles(user.id);
    } else if (!authLoading && !user) {
      // Clear roles when user logs out
      setUserRoles([]);
      setError(null);
    }
  }, [user?.id, authLoading, isLoginInProgress, isLoading]);

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