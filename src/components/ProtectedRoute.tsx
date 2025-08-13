import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuthUser } from '@/hooks/useAuthUser';

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
  const { isAdmin, isSuperAdmin, isLoading: rolesLoading } = useUserRoles();
  const [authChecked, setAuthChecked] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const checkAccess = () => {
      if (!mountedRef.current) return;

      // Still loading auth or roles
      if (authLoading || rolesLoading) {
        return;
      }

      // No user but auth is required
      if (requireAuth && !user) {
        navigate('/auth');
        return;
      }

      // User found but doesn't meet role requirements
      if (user) {
        if (superAdminOnly && !isSuperAdmin) {
          navigate('/');
          return;
        }
        
        if (adminOnly && !isAdmin) {
          navigate('/');
          return;
        }
      }

      // All checks passed
      setAuthChecked(true);
    };

    checkAccess();
  }, [user, isAdmin, isSuperAdmin, authLoading, rolesLoading, requireAuth, adminOnly, superAdminOnly, navigate]);

  // Show loading while auth/roles are loading or access hasn't been checked
  if (authLoading || rolesLoading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Final access control checks
  if (requireAuth && !user) {
    return null;
  }

  if (superAdminOnly && !isSuperAdmin) {
    return null;
  }

  if (adminOnly && !isAdmin) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;