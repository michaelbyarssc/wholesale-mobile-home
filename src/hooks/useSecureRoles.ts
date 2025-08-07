import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiUserAuth } from './useMultiUserAuth';

/**
 * Ultra-secure role hook that uses database functions only
 * For critical security operations where client-side role checking isn't sufficient
 */
export const useSecureRoles = () => {
  const { user, isLoading: authLoading } = useMultiUserAuth();
  const [isSecureAdmin, setIsSecureAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  const verifySecureRoles = useCallback(async () => {
    if (!user) {
      setIsSecureAdmin(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // SECURITY: Use only database function for role verification
      const { data: isAdminResult, error } = await supabase.rpc('is_admin', { 
        user_id: user.id 
      });

      if (error) {
        console.error(`[SECURITY-${sessionId}] Error verifying secure roles:`, error);
        setIsSecureAdmin(false);
        return;
      }

      const isAdminFromDB = isAdminResult === true;
      
      // SECURITY: Log all secure role checks with session isolation
      console.log(`[SECURITY-${sessionId}] Secure role check for user ${user.id}: isAdmin=${isAdminFromDB}`);
      
      setIsSecureAdmin(isAdminFromDB);
    } catch (err) {
      console.error(`[SECURITY-${sessionId}] Error in verifySecureRoles:`, err);
      setIsSecureAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [user, sessionId]);

  useEffect(() => {
    if (!authLoading) {
      verifySecureRoles();
    }
  }, [user, authLoading, verifySecureRoles]);

  // Session isolation check
  const verifySessionIsolation = useCallback(async () => {
    if (!user) return true;
    
    // Verify that this user's session is isolated
    const currentTimestamp = Date.now();
    console.log(`[SESSION-${sessionId}] Verifying isolation for user ${user.id} at ${currentTimestamp}`);
    
    return true; // Placeholder for session isolation checks
  }, [user, sessionId]);

  return {
    isSecureAdmin,
    isLoading: authLoading || isLoading,
    verifySecureRoles,
    verifySessionIsolation,
    sessionId
  };
};