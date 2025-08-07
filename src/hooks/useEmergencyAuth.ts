import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Emergency authentication bypass hook
 * Provides simple direct authentication without complex multi-user logic
 */
export const useEmergencyAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  const emergencySignIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    console.log('🚨 EMERGENCY: Attempting direct sign in bypass');
    
    try {
      // Clear any existing auth state first
      await supabase.auth.signOut();
      
      // Simple direct sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('🚨 EMERGENCY: Sign in failed:', error.message);
        toast({
          title: "Emergency Sign In Failed",
          description: error.message,
          variant: "destructive"
        });
        return { success: false, error: error.message };
      }

      if (data.user) {
        console.log('🚨 EMERGENCY: Sign in successful for:', data.user.email);
        setUser(data.user);
        
        // Check if user is admin using direct RPC call
        try {
          const { data: isAdmin } = await supabase.rpc('is_admin', { 
            user_id: data.user.id 
          });
          
          if (isAdmin) {
            console.log('🚨 EMERGENCY: Admin access confirmed, redirecting...');
            toast({
              title: "Emergency Access Granted",
              description: "Admin access confirmed. Redirecting...",
            });
            
            // Force reload to admin with emergency flag
            setTimeout(() => {
              window.location.href = '/admin?emergency=true';
            }, 1000);
          } else {
            console.log('🚨 EMERGENCY: Regular user access');
            toast({
              title: "Emergency Sign In Successful",
              description: "Signed in successfully.",
            });
            
            setTimeout(() => {
              window.location.href = '/';
            }, 1000);
          }
        } catch (rpcError) {
          console.warn('🚨 EMERGENCY: Could not verify admin status, proceeding anyway');
          toast({
            title: "Emergency Sign In Successful",
            description: "Signed in successfully. Redirecting...",
          });
          
          setTimeout(() => {
            window.location.href = '/admin?emergency=true';
          }, 1000);
        }
        
        return { success: true, user: data.user };
      }

      return { success: false, error: 'No user data returned' };
    } catch (error: any) {
      console.error('🚨 EMERGENCY: Exception during sign in:', error);
      toast({
        title: "Emergency Sign In Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const emergencyCleanup = useCallback(() => {
    console.log('🚨 EMERGENCY: Performing emergency cleanup');
    
    try {
      // Clear all localStorage
      localStorage.clear();
      
      // Clear session state
      setUser(null);
      
      toast({
        title: "Emergency Cleanup Complete",
        description: "All session data cleared. Page will reload.",
      });
      
      // Force reload to clean state
      setTimeout(() => {
        window.location.href = '/auth';
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('🚨 EMERGENCY: Cleanup failed:', error);
      return false;
    }
  }, [toast]);

  return {
    emergencySignIn,
    emergencyCleanup,
    isLoading,
    user
  };
};