
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

    const checkAuth = async () => {
      try {
        console.log('ProtectedRoute: Checking authentication...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('ProtectedRoute: Error getting session:', error);
          if (requireAuth && mounted) {
            navigate('/auth');
          }
          return;
        }

        if (!mounted) return;

        console.log('ProtectedRoute: Session found:', !!session);
        setUser(session?.user ?? null);
        
        if (requireAuth && !session?.user) {
          console.log('ProtectedRoute: No user found, redirecting to auth');
          navigate('/auth');
          return;
        }

        // Check role status if user exists and role checking is required
        if (session?.user && (adminOnly || superAdminOnly)) {
          console.log('ProtectedRoute: Checking user roles for:', session.user.id);
          await checkUserRoles(session.user.id);
        } else {
          if (mounted) {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('ProtectedRoute: Auth check error:', error);
        if (requireAuth && mounted) {
          navigate('/auth');
        }
      }
    };

    const checkUserRoles = async (userId: string) => {
      try {
        console.log('ProtectedRoute: Fetching roles for user:', userId);
        
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (!mounted) return;

        if (error && error.code !== 'PGRST116') {
          console.error('ProtectedRoute: Error checking user roles:', error);
          setIsAdmin(false);
          setIsSuperAdmin(false);
          
          if (adminOnly || superAdminOnly) {
            console.log('ProtectedRoute: Role check failed, redirecting to home');
            navigate('/');
          }
        } else {
          const userRole = data?.role;
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
        }
      } catch (error) {
        console.error('ProtectedRoute: Role check error:', error);
        if (mounted) {
          setIsAdmin(false);
          setIsSuperAdmin(false);
          if (adminOnly || superAdminOnly) {
            navigate('/');
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('ProtectedRoute: Auth state changed:', event, session?.user?.id);
        setUser(session?.user ?? null);
        
        if (requireAuth && !session?.user && event !== 'INITIAL_SESSION') {
          navigate('/auth');
        }
        
        // Check role status if user exists and role checking is required
        if (session?.user && (adminOnly || superAdminOnly)) {
          await checkUserRoles(session.user.id);
        } else if (!adminOnly && !superAdminOnly) {
          setLoading(false);
        }
      }
    );

    // Initial auth check
    checkAuth();

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
