
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserCheck, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BulkApprovalButtonProps {
  pendingCount: number;
  onBulkApproved: () => void;
}

export const BulkApprovalButton = ({ pendingCount, onBulkApproved }: BulkApprovalButtonProps) => {
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  const handleBulkApproval = async () => {
    try {
      setIsApproving(true);

      const { data, error } = await supabase.functions.invoke('admin-bulk-approve-users');

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Bulk Approval Successful",
        description: data.message || `Successfully approved ${data.approved_count} users`,
      });

      onBulkApproved();
    } catch (error: any) {
      console.error('Error bulk approving users:', error);
      toast({
        title: "Bulk Approval Failed",
        description: error.message || "Failed to approve users",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (pendingCount === 0) {
    return null;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={isApproving}
        >
          {isApproving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white mr-2" />
          ) : (
            <Users className="h-4 w-4 mr-2" />
          )}
          Approve All ({pendingCount})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-600" />
            Bulk Approve Users
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to approve all {pendingCount} pending users at once? 
            This will give them access to the system and assign them default roles and markups.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkApproval}
            className="bg-green-600 hover:bg-green-700"
            disabled={isApproving}
          >
            {isApproving ? "Approving..." : `Approve All ${pendingCount} Users`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
