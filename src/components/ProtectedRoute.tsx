
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true,
  adminOnly = false
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        console.log('🔍 ProtectedRoute: Checking authentication...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ ProtectedRoute: Error getting session:', error);
          if (requireAuth && mounted) {
            navigate('/auth');
          } else if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        console.log('🔍 ProtectedRoute: User found:', !!currentUser);

        if (requireAuth && !currentUser) {
          console.log('🔍 ProtectedRoute: No user but auth required, redirecting to auth');
          navigate('/auth');
          return;
        }

        // Check admin status if user exists and adminOnly is required
        if (currentUser && adminOnly) {
          await checkAdminStatus(currentUser.id);
        } else {
          if (mounted) {
            setLoading(false);
            setHasCheckedAuth(true);
          }
        }
      } catch (error) {
        console.error('❌ ProtectedRoute: Auth check error:', error);
        if (requireAuth && mounted) {
          navigate('/auth');
        } else if (mounted) {
          setLoading(false);
          setHasCheckedAuth(true);
        }
      }
    };

    const checkAdminStatus = async (userId: string) => {
      try {
        console.log('🔍 ProtectedRoute: Checking admin status for user:', userId);
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single();

        if (!mounted) return;

        if (error && error.code !== 'PGRST116') {
          console.error('❌ ProtectedRoute: Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          const isUserAdmin = !!data;
          console.log('🔍 ProtectedRoute: User is admin:', isUserAdmin);
          setIsAdmin(isUserAdmin);
          
          if (adminOnly && !isUserAdmin) {
            console.log('🔍 ProtectedRoute: User is not admin, redirecting to home');
            navigate('/');
            return;
          }
        }
      } catch (error) {
        console.error('❌ ProtectedRoute: Admin check error:', error);
        if (mounted) {
          setIsAdmin(false);
          if (adminOnly) {
            navigate('/');
            return;
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setHasCheckedAuth(true);
        }
      }
    };

    // Only check auth if we haven't already
    if (!hasCheckedAuth) {
      checkAuth();
    }

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔍 ProtectedRoute: Auth state changed:', event, session?.user?.id);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        // Only redirect if this is not the initial session event
        if (requireAuth && !currentUser && event !== 'INITIAL_SESSION') {
          console.log('🔍 ProtectedRoute: Auth required but no user, redirecting to auth');
          navigate('/auth');
          return;
        }
        
        // Check admin status if user exists and adminOnly is required
        if (currentUser && adminOnly && event !== 'INITIAL_SESSION') {
          checkAdminStatus(currentUser.id);
        } else if (!adminOnly && event !== 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, requireAuth, adminOnly, hasCheckedAuth]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return null; // Will redirect to auth
  }

  if (adminOnly && !isAdmin) {
    return null; // Will redirect to home
  }

  return <>{children}</>;
};

export default ProtectedRoute;
