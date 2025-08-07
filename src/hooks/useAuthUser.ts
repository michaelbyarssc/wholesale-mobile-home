import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';

// Centralized wrapper over multi-user auth to avoid duplicate listeners
export const useAuthUser = () => {
  const navigate = useNavigate();
  const {
    user,
    session,
    userProfile,
    isLoading,
    signOut,
    fetchUserProfile
  } = useMultiUserAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/');
    }
  };

  const handleProfileUpdated = async () => {
    try {
      await fetchUserProfile();
    } catch (error) {
      console.error('Profile refresh error:', error);
    }
  };

  // Light-weight auth refresh; session state comes from useMultiUserAuth
  const forceRefreshAuth = async () => {
    try {
      await supabase.auth.getSession();
      await fetchUserProfile();
    } catch (error) {
      console.error('forceRefreshAuth error:', error);
    }
  };

  return {
    user,
    session,
    userProfile,
    isLoading,
    handleLogout,
    handleProfileUpdated,
    forceRefreshAuth,
    sessionFingerprint: null as string | null
  };
};