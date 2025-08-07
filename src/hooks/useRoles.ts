import { useAuth } from '@/contexts/AuthContext';

/**
 * Optimized role hook that uses centralized AuthContext roles
 * No API calls - just accesses cached role data from context
 */
export const useRoles = () => {
  const { 
    userRoles, 
    isAdmin, 
    isSuperAdmin, 
    hasRole, 
    isLoading,
    isUserDataReady 
  } = useAuth();

  return {
    userRoles,
    isAdmin,
    isSuperAdmin,
    hasRole,
    isLoading: isLoading || !isUserDataReady,
    // Legacy compatibility
    verifyAdminAccess: async () => isAdmin,
    forceRefreshRoles: async () => {
      // No-op since roles are managed centrally
      console.log('useRoles: forceRefreshRoles called - roles managed centrally now');
    }
  };
};