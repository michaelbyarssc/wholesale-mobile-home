import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuthUser } from '@/hooks/useAuthUser';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

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
  const { isAdmin, isSuperAdmin, isLoading: rolesLoading, verifyAdminAccess, userRoles } = useUserRoles();
  const [authChecked, setAuthChecked] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [retryCount, setRetryCount] = useState(0);

  // Comprehensive debugging function
  const logDebugInfo = (stage: string) => {
    const info = {
      stage,
      timestamp: new Date().toISOString(),
      user: user ? { id: user.id, email: user.email } : null,
      authLoading,
      rolesLoading,
      isAdmin,
      isSuperAdmin,
      userRoles: userRoles.map(r => r.role),
      authChecked,
      retryCount,
      requireAuth,
      adminOnly,
      superAdminOnly,
      currentPath: window.location.pathname
    };
    
    console.log(`[DEBUG] ProtectedRoute ${stage}:`, info);
    setDebugInfo(info);
    return info;
  };

  // Direct database verification as fallback
  const verifyAdminDirectly = async (userId: string): Promise<boolean> => {
    try {
      console.log(`[FALLBACK] Checking admin status directly for user ${userId}`);
      const { data, error } = await supabase.rpc('is_admin', { user_id: userId });
      
      if (error) {
        console.error('[FALLBACK] Error in direct admin check:', error);
        return false;
      }
      
      console.log(`[FALLBACK] Direct admin check result: ${data}`);
      return data === true;
    } catch (err) {
      console.error('[FALLBACK] Exception in direct admin check:', err);
      return false;
    }
  };

  useEffect(() => {
    // Timeout protection
    const timeoutId = setTimeout(() => {
      if (!authChecked && retryCount < 3) {
        console.warn(`[TIMEOUT] Auth check taking too long, retry ${retryCount + 1}`);
        setRetryCount(prev => prev + 1);
        setAuthChecked(true);
      }
    }, 5000);

    const checkAuthAndRoles = async () => {
      try {
        const debugInfo = logDebugInfo('START');
        
        // Wait a bit if still loading
        if (authLoading || rolesLoading) {
          console.log(`[WAIT] Still loading - authLoading=${authLoading}, rolesLoading=${rolesLoading}`);
          return;
        }

        if (!user) {
          logDebugInfo('NO_USER');
          if (requireAuth) {
            console.log('[REDIRECT] No user, redirecting to /auth');
            navigate('/auth');
          }
          setAuthChecked(true);
          clearTimeout(timeoutId);
          return;
        }

        logDebugInfo('USER_FOUND');

        // For admin routes, do comprehensive checking
        if (adminOnly || superAdminOnly) {
          console.log(`[ADMIN_CHECK] Checking admin access - isAdmin=${isAdmin}, isSuperAdmin=${isSuperAdmin}`);
          console.log(`[ADMIN_CHECK] User roles:`, userRoles.map(r => r.role));

          // If hook says not admin, verify with database
          if (!isAdmin && retryCount < 2) {
            console.log('[FALLBACK] Hook says not admin, checking database directly...');
            const dbAdminStatus = await verifyAdminDirectly(user.id);
            
            if (dbAdminStatus && !isAdmin) {
              console.warn('[MISMATCH] Database says admin but hook says not admin - forcing role refresh');
              setRetryCount(prev => prev + 1);
              // Force a role refresh by not setting authChecked
              clearTimeout(timeoutId);
              return;
            }
          }

          // Always require a fresh secure DB verification before granting admin access
          const verifiedAdmin = await verifyAdminAccess();

          if (superAdminOnly && !isSuperAdmin) {
            console.warn(`[ACCESS_DENIED] Super admin required but user ${user.id} is not super admin`);
            logDebugInfo('SUPER_ADMIN_DENIED');
            navigate('/');
            setAuthChecked(true);
            clearTimeout(timeoutId);
            return;
          }
          
          if (adminOnly && (!isAdmin || !verifiedAdmin)) {
            console.warn(`[ACCESS_DENIED] Admin required but user ${user.id} is not verified admin (hook=${isAdmin}, verified=${verifiedAdmin})`);
            logDebugInfo('ADMIN_DENIED');
            navigate('/');
            setAuthChecked(true);
            clearTimeout(timeoutId);
            return;
          }
        }

        console.log(`[ACCESS_GRANTED] User ${user.id} granted access`);
        logDebugInfo('ACCESS_GRANTED');
        setAuthChecked(true);
        clearTimeout(timeoutId);
        
      } catch (error) {
        console.error('[ERROR] ProtectedRoute error:', error);
        logDebugInfo('ERROR');
        if (requireAuth) {
          navigate('/auth');
        }
        setAuthChecked(true);
        clearTimeout(timeoutId);
      }
    };

    checkAuthAndRoles();

    return () => clearTimeout(timeoutId);
  }, [user, isAdmin, isSuperAdmin, authLoading, rolesLoading, requireAuth, adminOnly, superAdminOnly, navigate, retryCount]);

  // Show loading while checking auth and roles with debug info
  if (authLoading || rolesLoading || !authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground max-w-md">
            <div>Auth Loading: {authLoading ? 'Yes' : 'No'}</div>
            <div>Roles Loading: {rolesLoading ? 'Yes' : 'No'}</div>
            <div>Auth Checked: {authChecked ? 'Yes' : 'No'}</div>
            <div>User: {user?.email || 'None'}</div>
            <div>Is Admin: {isAdmin ? 'Yes' : 'No'}</div>
            <div>Retry Count: {retryCount}</div>
            {userRoles.length > 0 && <div>Roles: {userRoles.map(r => r.role).join(', ')}</div>}
          </div>
        )}
      </div>
    );
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