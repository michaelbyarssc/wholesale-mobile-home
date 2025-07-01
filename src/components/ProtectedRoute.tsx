
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

    // Set up auth state listener first
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
          checkUserRoles(session.user.id);
        } else {
          setLoading(false);
        }
      }
    );

    // Check current session
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('ProtectedRoute: Error getting session:', error);
          if (requireAuth) {
            navigate('/auth');
          }
        } else {
          if (!mounted) return;
          setUser(session?.user ?? null);
          
          if (requireAuth && !session?.user) {
            navigate('/auth');
          } else if (session?.user && (adminOnly || superAdminOnly)) {
            // Check role status
            await checkUserRoles(session.user.id);
          } else {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('ProtectedRoute: Auth check error:', error);
        if (requireAuth && mounted) {
          navigate('/auth');
        }
      } finally {
        if (mounted && !adminOnly && !superAdminOnly) {
          setLoading(false);
        }
      }
    };

    const checkUserRoles = async (userId: string) => {
      try {
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
        } else {
          const userRole = data?.role;
          setIsSuperAdmin(userRole === 'super_admin');
          setIsAdmin(userRole === 'admin' || userRole === 'super_admin');
          
          // Check access permissions
          if (superAdminOnly && userRole !== 'super_admin') {
            console.log('ProtectedRoute: User is not super admin, redirecting to home');
            navigate('/');
          } else if (adminOnly && !['admin', 'super_admin'].includes(userRole)) {
            console.log('ProtectedRoute: User is not admin/super admin, redirecting to home');
            navigate('/');
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
