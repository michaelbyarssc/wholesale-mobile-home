
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkAuthAndRoles = async () => {
      try {
        console.log('ProtectedRoute: Starting auth check...');
        
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('ProtectedRoute: Session error:', sessionError);
          if (mounted) {
            setLoading(false);
            if (requireAuth) navigate('/auth');
          }
          return;
        }

        console.log('ProtectedRoute: Session check complete, user:', session?.user?.id);

        if (!mounted) return;

        // Handle no session case
        if (!session?.user) {
          console.log('ProtectedRoute: No session found');
          setUser(null);
          setLoading(false);
          if (requireAuth) {
            navigate('/auth');
          }
          return;
        }

        // Set user
        setUser(session.user);
        console.log('ProtectedRoute: User set:', session.user.id);

        // If no role checking needed, we're done
        if (!adminOnly && !superAdminOnly) {
          console.log('ProtectedRoute: No role checking needed, access granted');
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        // Check user roles
        console.log('ProtectedRoute: Checking user roles...');
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (roleError) {
          console.error('ProtectedRoute: Role check error:', roleError);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          setLoading(false);
          
          if (adminOnly || superAdminOnly) {
            console.log('ProtectedRoute: Role check failed, redirecting to home');
            navigate('/');
          }
          return;
        }

        const userRole = roleData?.role;
        console.log('ProtectedRoute: User role found:', userRole);
        
        const userIsSuperAdmin = userRole === 'super_admin';
        const userIsAdmin = userRole === 'admin' || userRole === 'super_admin';
        
        setIsSuperAdmin(userIsSuperAdmin);
        setIsAdmin(userIsAdmin);
        
        // Check access permissions
        if (superAdminOnly && !userIsSuperAdmin) {
          console.log('ProtectedRoute: User is not super admin, redirecting to home');
          navigate('/');
        } else if (adminOnly && !userIsAdmin) {
          console.log('ProtectedRoute: User is not admin/super admin, redirecting to home');
          navigate('/');
        } else {
          console.log('ProtectedRoute: Access granted for role:', userRole);
        }

      } catch (error) {
        console.error('ProtectedRoute: Unexpected error:', error);
        if (mounted) {
          setLoading(false);
          if (requireAuth) {
            navigate('/auth');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Initial check
    checkAuthAndRoles();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('ProtectedRoute: Auth state changed:', event, session?.user?.id);
        
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          if (requireAuth) {
            navigate('/auth');
          }
        } else if (event === 'SIGNED_IN') {
          // Re-run the full auth check
          checkAuthAndRoles();
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, requireAuth, adminOnly, superAdminOnly]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return null; // Will redirect to auth
  }

  if (superAdminOnly && !isSuperAdmin) {
    return null; // Will redirect to home
  }

  if (adminOnly && !isAdmin) {
    return null; // Will redirect to home
  }

  return <>{children}</>;
};

export default ProtectedRoute;
