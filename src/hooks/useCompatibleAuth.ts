import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMultiUserAuth } from './useMultiUserAuth';

/**
 * Compatibility hook that provides the same interface as useAuthUser
 * but uses useMultiUserAuth internally to prevent dual authentication systems
 */
export const useCompatibleAuth = () => {
  const navigate = useNavigate();
  const {
    user,
    session,
    userProfile,
    isLoading,
    signOut,
    fetchUserProfile,
    supabaseClient
  } = useMultiUserAuth();

  // Create compatible interface that matches useAuthUser
  const compatibleInterface = useMemo(() => ({
    user,
    session,
    userProfile,
    isLoading,
    authLoading: isLoading, // Alias for compatibility
    sessionFingerprint: session ? `session_${session.user.id}` : null,
    
    handleLogout: async () => {
      try {
        console.log('🔐 Compatible auth logout...');
        await signOut();
        navigate('/');
      } catch (error) {
        console.error('Error during logout:', error);
        navigate('/');
      }
    },
    
    forceRefreshAuth: async () => {
      try {
        console.log('🔐 Compatible auth refresh...');
        if (user) {
          await fetchUserProfile();
        }
      } catch (error) {
        console.error('Error refreshing auth:', error);
      }
    },
    
    handleProfileUpdated: async () => {
      try {
        if (user) {
          await fetchUserProfile();
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
    }
  }), [user, session, userProfile, isLoading, signOut, fetchUserProfile, navigate]);

  return compatibleInterface;
};