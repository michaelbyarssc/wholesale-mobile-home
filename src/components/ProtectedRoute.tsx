import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';
import { EmergencyLogoutButton } from '@/components/auth/EmergencyLogoutButton';

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
  const { user, isLoading: authLoading } = useMultiUserAuth();
  const { isAdmin, isSuperAdmin, isLoading: rolesLoading } = useUserRoles();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAccess = () => {
      console.log('🔐 ProtectedRoute check:', {
        user: user?.email,
        authLoading,
        rolesLoading,
        isAdmin,
        isSuperAdmin,
        adminOnly,
        superAdminOnly,
        path: window.location.pathname
      });

      // Wait for auth and roles to load
      if (authLoading || rolesLoading) {
        return;
      }

      // Check authentication
      if (requireAuth && !user) {
        console.log('🔐 No user, redirecting to auth');
        navigate('/auth');
        return;
      }

      // Check admin access
      if (adminOnly && !isAdmin) {
        console.log('🔐 Admin required but user not admin, redirecting');
        navigate('/');
        return;
      }

      // Check super admin access
      if (superAdminOnly && !isSuperAdmin) {
        console.log('🔐 Super admin required but user not super admin, redirecting');
        navigate('/');
        return;
      }

      console.log('🔐 Access granted');
      setAuthChecked(true);
    };

    checkAccess();
  }, [user, isAdmin, isSuperAdmin, authLoading, rolesLoading, requireAuth, adminOnly, superAdminOnly, navigate]);

  // Show loading with emergency recovery option
  if (authLoading || rolesLoading || !authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Verifying access...
          </p>
          {(adminOnly || superAdminOnly) && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground mb-2">
                If you're stuck on this screen:
              </p>
              <EmergencyLogoutButton className="text-xs" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;