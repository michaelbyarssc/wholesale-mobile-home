import { useState, useEffect, useCallback } from 'react';
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
  const { user, isLoading: authLoading } = useAuth();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        
        // FALLBACK: Use is_admin RPC function if role table fails
        console.log('🔧 Attempting admin fallback using is_admin RPC...');
        try {
          const { data: isAdminResult, error: rpcError } = await supabase.rpc('is_admin', { user_id: userId });
          
          if (!rpcError && isAdminResult === true) {
            console.log('🔧 Emergency admin access granted via RPC fallback');
            // Create synthetic role data for emergency access
            setUserRoles([{ 
              id: 'emergency-admin', 
              user_id: userId, 
              role: 'super_admin' as const 
            }]);
            setError(null);
            return;
          }
        } catch (rpcErr) {
          console.error('🚨 RPC fallback also failed:', rpcErr);
        }
        
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
      
      // FINAL FALLBACK: Direct RPC check
      try {
        console.log('🔧 Final fallback: Checking admin status directly...');
        const { data: isAdminResult, error: rpcError } = await supabase.rpc('is_admin', { user_id: userId });
        
        if (!rpcError && isAdminResult === true) {
          console.log('🔧 Emergency admin access granted via final fallback');
          setUserRoles([{ 
            id: 'emergency-admin-final', 
            user_id: userId, 
            role: 'super_admin' as const 
          }]);
          setError(null);
          return;
        }
      } catch (finalErr) {
        console.error('🚨 All fallbacks failed:', finalErr);
      }
      
      setError('Failed to fetch user roles');
      setUserRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Effect to fetch roles when user changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchUserRoles(user.id);
    } else if (!authLoading && !user) {
      // Clear roles when user logs out
      setUserRoles([]);
      setError(null);
    }
  }, [user, authLoading, fetchUserRoles]);

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

/**
 * Legacy compatibility function - DEPRECATED
 * Use useUserRoles() hook instead
 */
export const checkCurrentUserRole = async () => {
  console.warn('[DEPRECATED] checkCurrentUserRole() is deprecated. Use useUserRoles() hook instead.');
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { isSuperAdmin: false, isAdmin: false };

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', session.user.id);

  const isSuperAdmin = roleData?.some(role => role.role === 'super_admin') || false;
  const isAdmin = roleData?.some(role => role.role === 'admin' || role.role === 'super_admin') || false;

  return { isSuperAdmin, isAdmin };
};