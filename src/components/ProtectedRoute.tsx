import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuthUser } from '@/hooks/useAuthUser';
import { logger } from '@/utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true,
  adminOnly = false,
  superAdminOnly = false
}) => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthUser();
  const { isAdmin, isSuperAdmin, isLoading: rolesLoading, verifyAdminAccess } = useUserRoles();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // SECURITY: Enhanced auth check with centralized role management
    const checkAuthAndRoles = async () => {
      try {
        logger.debug('[SECURITY] ProtectedRoute: Starting auth check...');
        
        if (!user) {
          if (requireAuth) {
            console.log('[SECURITY] ProtectedRoute: No user, redirecting to /auth');
            navigate('/auth');
          }
          setAuthChecked(true);
          return;
        }

        console.log(`[SECURITY] ProtectedRoute: User found: ${user.id} (${user.email})`);

        // For critical operations, verify with secure database function
        if (superAdminOnly || adminOnly) {
          console.log(`[SECURITY] ProtectedRoute: Verifying roles for user ${user.id}`);
          
          // Double-check critical access with database function
          const dbAdminStatus = await verifyAdminAccess();
          
          if (superAdminOnly && !isSuperAdmin) {
            console.warn(`[SECURITY WARNING] Super admin required but user ${user.id} is not super admin (hook=${isSuperAdmin}, db=${dbAdminStatus})`);
            navigate('/');
            return;
          }
          
          if (adminOnly && !isAdmin) {
            console.warn(`[SECURITY WARNING] Admin required but user ${user.id} is not admin (hook=${isAdmin}, db=${dbAdminStatus})`);
            navigate('/');
            return;
          }

          // Critical security check: verify database and hook results match
          if ((adminOnly || superAdminOnly) && !dbAdminStatus) {
            console.error(`[SECURITY ERROR] Database verification failed for user ${user.id} - denying access`);
            navigate('/');
            return;
          }

          console.log(`[SECURITY] ProtectedRoute: Access granted for user ${user.id}`);
        }
        
        setAuthChecked(true);
      } catch (error) {
        console.error('[SECURITY] ProtectedRoute: Error in auth check:', error);
        if (requireAuth) {
          navigate('/auth');
        }
        setAuthChecked(true);
      }
    };

    // Only run check when auth and roles are loaded
    if (!authLoading && !rolesLoading) {
      checkAuthAndRoles();
    }
  }, [user, isAdmin, isSuperAdmin, authLoading, rolesLoading, requireAuth, adminOnly, superAdminOnly, navigate, verifyAdminAccess]);

  // Show loading while checking auth and roles
  if (authLoading || rolesLoading || !authChecked) {
    return <LoadingSpinner />;
  }

  // Access control checks
  if (requireAuth && !user) {
    return null; // Redirect handled in useEffect
  }

  if (superAdminOnly && !isSuperAdmin) {
    return null; // Redirect handled in useEffect
  }

  if (adminOnly && !isAdmin) {
    return null; // Redirect handled in useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;