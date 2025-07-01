
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from './UserEditDialog';
import { BulkApprovalButton } from './BulkApprovalButton';

interface PendingApprovalsCardProps {
  pendingUsers: UserProfile[];
  onUserApproved: () => void;
}

export const PendingApprovalsCard = ({ pendingUsers, onUserApproved }: PendingApprovalsCardProps) => {
  const { toast } = useToast();

  const handleApproveUser = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-approve-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "User Approved",
        description: `${userName} has been approved and can now access the system.`,
      });

      onUserApproved();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const handleDenyUser = async (userId: string, userName: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-deny-user', {
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "User Denied and Deleted",
        description: `${userName} has been denied access and completely removed from the system.`,
      });

      onUserApproved();
    } catch (error: any) {
      console.error('Error denying user:', error);
      toast({
        title: "Denial Failed",
        description: error.message || "Failed to deny and delete user",
        variant: "destructive",
      });
    }
  };

  const getDisplayName = (user: UserProfile) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email === 'No email' ? 'Unknown User' : user.email || 'Unknown User';
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Clock className="h-5 w-5" />
            Pending User Approvals ({pendingUsers.length})
          </CardTitle>
          <BulkApprovalButton 
            pendingCount={pendingUsers.length} 
            onBulkApproved={onUserApproved} 
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingUsers.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{getDisplayName(user)}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400">
                      Registered: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleApproveUser(user.user_id, getDisplayName(user))}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  <UserCheck className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  onClick={() => handleDenyUser(user.user_id, getDisplayName(user))}
                  variant="destructive"
                  size="sm"
                  title="This will completely delete the user and all their data"
                >
                  <UserX className="h-4 w-4 mr-1" />
                  Deny & Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
