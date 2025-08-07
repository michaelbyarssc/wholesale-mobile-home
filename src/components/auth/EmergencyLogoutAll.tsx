import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users } from 'lucide-react';
import { useMultiUserAuth } from '@/hooks/useMultiUserAuth';
import { useSessionManager } from '@/contexts/SessionManagerContext';
import { useToast } from '@/hooks/use-toast';

export const EmergencyLogoutAll: React.FC = () => {
  const { signOutAll } = useMultiUserAuth();
  const { sessions } = useSessionManager();
  const { toast } = useToast();

  const activeSessionCount = sessions.length;

  const handleEmergencyLogoutAll = async () => {
    console.log('🚨 Emergency logout all users initiated');
    
    toast({
      title: "Logging Out All Users",
      description: `Signing out ${activeSessionCount} active sessions...`,
      variant: "destructive"
    });

    try {
      await signOutAll();
      
      toast({
        title: "All Users Logged Out",
        description: "All active sessions have been cleared. Page will reload.",
      });

      // Force page reload to ensure complete cleanup
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);

    } catch (error) {
      console.error('🚨 Emergency logout all failed:', error);
      
      toast({
        title: "Emergency Logout Failed",
        description: "Forcing complete cleanup...",
        variant: "destructive"
      });

      // Fallback: Clear all localStorage and reload
      try {
        localStorage.clear();
        window.location.href = '/';
      } catch (fallbackError) {
        console.error('🚨 Fallback cleanup failed:', fallbackError);
        window.location.reload();
      }
    }
  };

  if (activeSessionCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-destructive/10 border border-destructive/20 rounded-lg p-4 shadow-lg">
      <div className="flex items-center gap-3 mb-2">
        <Users className="h-4 w-4 text-destructive" />
        <span className="text-sm font-medium text-destructive">
          {activeSessionCount} Active Session{activeSessionCount !== 1 ? 's' : ''}
        </span>
      </div>
      
      <Button
        variant="destructive"
        onClick={handleEmergencyLogoutAll}
        className="w-full flex items-center gap-2"
        size="sm"
      >
        <AlertTriangle className="h-4 w-4" />
        Emergency Logout All
      </Button>
    </div>
  );
};