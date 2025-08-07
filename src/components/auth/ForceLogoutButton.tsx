import React from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ForceLogoutButtonProps {
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const ForceLogoutButton: React.FC<ForceLogoutButtonProps> = ({ 
  className = "",
  variant = "destructive",
  size = "sm"
}) => {
  const { toast } = useToast();

  const handleForceLogout = () => {
    console.log('🚨 FORCE LOGOUT: Emergency logout initiated by user');
    
    toast({
      title: "Force Logout",
      description: "Clearing all sessions and reloading...",
      variant: "destructive"
    });
    
    try {
      // Clear all localStorage immediately
      console.log('🚨 FORCE LOGOUT: Step 1 - Clearing all localStorage');
      
      // Clear session data
      localStorage.removeItem('wmh_sessions');
      localStorage.removeItem('wmh_active_session');
      
      // Clear all auth-related keys
      Object.keys(localStorage).forEach(key => {
        if (key.includes('sb-') || 
            key.includes('auth-token') || 
            key.includes('wmh_') ||
            key.includes('session')) {
          try {
            localStorage.removeItem(key);
            console.log('🚨 FORCE LOGOUT: Removed key:', key);
          } catch (error) {
            console.warn('🚨 FORCE LOGOUT: Failed to remove key:', key, error);
          }
        }
      });
      
      console.log('🚨 FORCE LOGOUT: Step 2 - Forcing page reload');
      
      // Force immediate page reload
      window.location.href = '/';
      
    } catch (error) {
      console.error('🚨 FORCE LOGOUT: Error during force logout:', error);
      
      // Ultimate fallback - hard refresh
      window.location.reload();
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleForceLogout}
      className={`flex items-center gap-2 ${className}`}
      size={size}
    >
      <LogOut className="h-4 w-4" />
      Force Logout
    </Button>
  );
};