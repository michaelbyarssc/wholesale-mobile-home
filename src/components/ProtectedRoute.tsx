import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuthUser } from '@/hooks/useAuthUser';
import { AuthDebugPanel } from '@/components/debug/AuthDebugPanel';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const { user, isLoading: authLoading, storageError, emergencyAuthRecovery } = useAuthUser();
  const { isAdmin, isSuperAdmin, isLoading: rolesLoading } = useUserRoles();
  const [authChecked, setAuthChecked] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [forceTimeout, setForceTimeout] = useState(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Progressive timeout - only force after auth has had reasonable time
    timeoutRef.current = setTimeout(() => {
      // Only timeout if both are loading for extended period
      if (authLoading && rolesLoading) {
        console.log('[ProtectedRoute] Auth and roles loading timeout - forcing continuation');
        setForceTimeout(true);
      } else if (authLoading && !user) {
        console.log('[ProtectedRoute] Auth loading timeout - no user found');
        setForceTimeout(true);
      }
    }, 45000); // Increased to 45 seconds for better reliability

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [authLoading, rolesLoading, user]);

  useEffect(() => {
    const checkAccess = () => {
      if (!mountedRef.current) return;

      // Clear timeout since we're processing
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Still loading auth or roles (unless forced timeout)
      if ((authLoading || rolesLoading) && !forceTimeout) {
        return;
      }

      // If force timeout, we proceed with current state
      if (forceTimeout) {
        console.log('[ProtectedRoute] Proceeding due to force timeout');
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
  }, [user, isAdmin, isSuperAdmin, authLoading, rolesLoading, requireAuth, adminOnly, superAdminOnly, navigate, forceTimeout]);

  // Show loading while auth/roles are loading or access hasn't been checked
  if ((authLoading || rolesLoading || !authChecked) && !forceTimeout && !storageError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show emergency options if there's a storage error or force timeout
  if (storageError || forceTimeout || showDebugPanel) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="space-y-4 w-full max-w-2xl">
          {(storageError || forceTimeout) && (
            <Alert>
              <AlertDescription>
                {storageError && "Storage quota exceeded. "}
                {forceTimeout && "Authentication timeout occurred. "}
                Emergency options available below.
              </AlertDescription>
            </Alert>
          )}
          
          {!showDebugPanel && (
            <div className="text-center space-y-4">
              <Button onClick={() => setShowDebugPanel(true)}>
                Show Debug Panel
              </Button>
              <Button variant="outline" onClick={emergencyAuthRecovery}>
                Emergency Recovery
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          )}
          
          {showDebugPanel && (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => setShowDebugPanel(false)}
              >
                Hide Debug Panel
              </Button>
              <AuthDebugPanel />
            </div>
          )}
        </div>
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