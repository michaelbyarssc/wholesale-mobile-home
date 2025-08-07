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
  const { 
    userRoles: contextRoles, 
    isAdmin: contextIsAdmin, 
    isSuperAdmin: contextIsSuperAdmin, 
    hasRole: contextHasRole,
    isLoading: authLoading,
    isUserDataReady,
    user
  } = useAuth();

  // Use centralized roles from AuthContext
  const userRoles = contextRoles;
  const isLoading = authLoading || !isUserDataReady;
  const error = null;

  console.log('useUserRoles: Using centralized roles', { 
    userEmail: user?.email, 
    userRoles: userRoles.map(r => r.role), 
    isAdmin: contextIsAdmin,
    isLoading
  });

  // No longer fetching roles directly - using centralized context

  // Use centralized role checking functions
  const hasRole = contextHasRole;
  const isAdmin = contextIsAdmin;
  const isSuperAdmin = contextIsSuperAdmin;

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

  // Force refresh roles - managed centrally now
  const forceRefreshRoles = useCallback(async () => {
    console.log('useUserRoles: Force refresh called - roles managed centrally now');
  }, []);

  return {
    isAdmin,
    isSuperAdmin,
    hasRole,
    userRoles,
    isLoading,
    error,
    verifyAdminAccess,
    forceRefreshRoles
  };
};

// REMOVED: Legacy compatibility function - Use useUserRoles() hook instead