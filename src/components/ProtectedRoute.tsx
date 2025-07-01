
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
        
        // Check admin status if user exists and adminOnly is required
        if (session?.user && adminOnly) {
          checkAdminStatus(session.user.id);
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
          } else if (session?.user && adminOnly) {
            // Check admin status
            await checkAdminStatus(session.user.id);
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
        if (mounted && !adminOnly) {
          setLoading(false);
        }
      }
    };

    const checkAdminStatus = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .single();

        if (!mounted) return;

        if (error && error.code !== 'PGRST116') {
          console.error('ProtectedRoute: Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
          if (adminOnly && !data) {
            console.log('ProtectedRoute: User is not admin, redirecting to home');
            navigate('/');
          }
        }
      } catch (error) {
        console.error('ProtectedRoute: Admin check error:', error);
        if (mounted) {
          setIsAdmin(false);
          if (adminOnly) {
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
  }, [navigate, requireAuth, adminOnly]);

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
