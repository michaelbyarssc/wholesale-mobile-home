import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { LogOut, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { clearAllSessionData } from '@/utils/sessionControl';

export const SessionClearButton = () => {
  const { toast } = useToast();

  const handleClearSessions = () => {
    try {
      clearAllSessionData();
      toast({
        title: "Sessions Cleared",
        description: "All stored sessions have been cleared. Please refresh the page.",
      });
      
      // Refresh the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear sessions. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All Sessions
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear All Sessions</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all stored authentication sessions and force you to sign in again. 
            This action cannot be undone and the page will refresh automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClearSessions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Clear Sessions
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};