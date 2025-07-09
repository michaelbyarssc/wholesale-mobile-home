import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export const useAuthUser = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let initialCheckDone = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
        
        if (initialCheckDone) {
          setIsLoading(false);
        }
      }
    );

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        initialCheckDone = true;
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          initialCheckDone = true;
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      }
      
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
      setUser(null);
      setSession(null);
      setUserProfile(null);
      navigate('/');
    }
  };

  const handleProfileUpdated = async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching updated user profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching updated user profile:', error);
      }
    }
  };

  return {
    user,
    session,
    userProfile,
    isLoading,
    handleLogout,
    handleProfileUpdated
  };
};