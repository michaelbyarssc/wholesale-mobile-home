import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';
import { useToast } from '@/hooks/use-toast';

interface EmergencyLogoutButtonProps {
  className?: string;
}

export const EmergencyLogoutButton: React.FC<EmergencyLogoutButtonProps> = ({ 
  className = "" 
}) => {
  const { emergencyCleanup } = useSessionRecovery();
  const { toast } = useToast();

  const handleEmergencyLogout = () => {
    console.log('🚨 Emergency logout initiated by user');
    
    toast({
      title: "Emergency Logout",
      description: "Performing emergency session cleanup...",
      variant: "destructive"
    });
    
    const success = emergencyCleanup();
    
    if (success) {
      toast({
        title: "Emergency Logout Complete",
        description: "All sessions cleared. Page will reload.",
      });
    } else {
      toast({
        title: "Emergency Logout Failed",
        description: "Please try refreshing the page manually.",
        variant: "destructive"
      });
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleEmergencyLogout}
      className={`flex items-center gap-2 ${className}`}
      size="sm"
    >
      <AlertTriangle className="h-4 w-4" />
      Emergency Logout
    </Button>
  );
};