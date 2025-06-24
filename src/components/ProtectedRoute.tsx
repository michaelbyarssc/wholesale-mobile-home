
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAuth = true 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
        
        setLoading(false);
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
          }
        }
      } catch (error) {
        console.error('ProtectedRoute: Auth check error:', error);
        if (requireAuth && mounted) {
          navigate('/auth');
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
  }, [navigate, requireAuth]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (requireAuth && !user) {
    return null; // Will redirect to auth
  }

  return <>{children}</>;
};

export default ProtectedRoute;
