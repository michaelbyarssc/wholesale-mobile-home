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
        console.log(`[SECURITY] ProtectedRoute: Starting auth check for ${requireAuth ? 'authenticated' : 'public'} route`);
        console.log(`[SECURITY] ProtectedRoute: adminOnly=${adminOnly}, superAdminOnly=${superAdminOnly}`);
        console.log(`[SECURITY] ProtectedRoute: user=${user?.id}, isAdmin=${isAdmin}, isSuperAdmin=${isSuperAdmin}`);
        
        if (!user) {
          if (requireAuth) {
            console.log('[SECURITY] ProtectedRoute: No user, redirecting to /auth');
            navigate('/auth');
          }
          setAuthChecked(true);
          return;
        }

        console.log(`[SECURITY] ProtectedRoute: User found: ${user.id} (${user.email})`);

        // Check admin access based on hook results first
        if (superAdminOnly && !isSuperAdmin) {
          console.warn(`[SECURITY WARNING] Super admin required but user ${user.id} is not super admin`);
          navigate('/');
          setAuthChecked(true);
          return;
        }
        
        if (adminOnly && !isAdmin) {
          console.warn(`[SECURITY WARNING] Admin required but user ${user.id} is not admin`);
          navigate('/');
          setAuthChecked(true);
          return;
        }

        console.log(`[SECURITY] ProtectedRoute: Access granted for user ${user.id}`);
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
      console.log(`[SECURITY] ProtectedRoute: Running auth check - authLoading=${authLoading}, rolesLoading=${rolesLoading}`);
      checkAuthAndRoles();
    } else {
      console.log(`[SECURITY] ProtectedRoute: Waiting for auth/roles - authLoading=${authLoading}, rolesLoading=${rolesLoading}`);
    }
  }, [user, isAdmin, isSuperAdmin, authLoading, rolesLoading, requireAuth, adminOnly, superAdminOnly, navigate]);

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