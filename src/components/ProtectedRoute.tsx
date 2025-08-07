
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
  const [emergencyBypass, setEmergencyBypass] = useState(false);
  const [emergencyChecking, setEmergencyChecking] = useState(false);
  const { toast } = useToast();

  // Emergency admin access function
  const handleEmergencyAdminAccess = async () => {
    if (!user) {
      toast({
        title: "No User Found",
        description: "Please sign in first before using emergency access.",
        variant: "destructive"
      });
      return;
    }

    setEmergencyChecking(true);
    console.log('🚨 Emergency admin access check for:', user.email);

    try {
      // Direct database check using is_admin RPC
      const { data: isAdminResult, error: rpcError } = await supabase.rpc('is_admin', { 
        user_id: user.id 
      });

      if (rpcError) {
        console.error('🚨 Emergency RPC error:', rpcError);
        toast({
          title: "Emergency Check Failed",
          description: `Database error: ${rpcError.message}`,
          variant: "destructive"
        });
        return;
      }

      if (isAdminResult === true) {
        console.log('✅ Emergency admin access confirmed for:', user.email);
        setEmergencyBypass(true);
        toast({
          title: "Emergency Access Granted",
          description: "Admin access confirmed via database. Access granted.",
        });
      } else {
        console.log('❌ Emergency admin access denied for:', user.email);
        toast({
          title: "Access Denied",
          description: "You do not have admin privileges in the database.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('🚨 Emergency admin access check failed:', error);
      toast({
        title: "Emergency Check Failed",
        description: "Unable to verify admin status. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setEmergencyChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Error",
        description: "There was an error signing out. Please try again.",
        variant: "destructive"
      });
    }
  };

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
        emergencyBypass,
        path: window.location.pathname
      });

      // Wait for auth and roles to load (with timeout)
      if (authLoading || rolesLoading) {
        return;
      }

      // Check authentication
      if (requireAuth && !user) {
        console.log('🔐 No user, redirecting to auth');
        navigate('/auth');
        return;
      }

      // EMERGENCY BYPASS: If emergency bypass is active, grant access
      if (emergencyBypass && (adminOnly || superAdminOnly)) {
        console.log('🚨 Emergency bypass active, granting admin access');
        setAuthChecked(true);
        return;
      }

      // Check admin access
      if (adminOnly && !isAdmin) {
        console.log('🔐 Admin required but user not admin, staying on loading screen for emergency bypass');
        // Don't redirect immediately - show emergency bypass option
        return;
      }

      // Check super admin access
      if (superAdminOnly && !isSuperAdmin) {
        console.log('🔐 Super admin required but user not super admin, staying on loading screen for emergency bypass');
        // Don't redirect immediately - show emergency bypass option
        return;
      }

      console.log('🔐 Access granted');
      setAuthChecked(true);
    };

    checkAccess();
  }, [user, isAdmin, isSuperAdmin, authLoading, rolesLoading, requireAuth, adminOnly, superAdminOnly, navigate, emergencyBypass]);

  // Show loading with emergency recovery option
  if (authLoading || rolesLoading || !authChecked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner />
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Verifying access...
          </p>
          
          {(adminOnly || superAdminOnly) && user && (
            <div className="mt-4 p-4 border rounded-lg bg-muted/20 max-w-md">
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Having trouble accessing the admin panel?
                </p>
                
                <div className="text-xs">
                  <span className="text-muted-foreground">Signed in as:</span>
                  <br />
                  <span className="font-mono text-foreground">{user.email}</span>
                </div>
                
                <Button
                  variant="outline"
                  onClick={handleEmergencyAdminAccess}
                  disabled={emergencyChecking}
                  className="w-full text-xs"
                  size="sm"
                >
                  {emergencyChecking ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2" />
                      Checking Admin Status...
                    </>
                  ) : (
                    'Emergency Admin Access'
                  )}
                </Button>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Or try logging out:
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="text-xs w-full"
                    size="sm"
                  >
                    Emergency Logout
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
