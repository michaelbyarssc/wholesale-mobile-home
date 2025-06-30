import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, Trash2 } from 'lucide-react';
import { UserProfile } from './UserEditDialog';

interface UserActionsProps {
  profile: UserProfile;
  onUserUpdated: () => void;
}

export const UserActions = ({ profile, onUserUpdated }: UserActionsProps) => {
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const { toast } = useToast();

  const resetUserPassword = async (userId: string, userEmail: string) => {
    try {
      setResettingPassword(userId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      console.log('Resetting password for user:', userId);

      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          user_id: userId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('Password reset response:', { data, error });

      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        
        // Handle case where user was deleted but profile still exists
        if (data.user_deleted) {
          toast({
            title: "User cleaned up",
            description: data.error,
            variant: "destructive",
          });
          onUserUpdated(); // Refresh the user list
          return;
        }
        
        throw new Error(data.error);
      }

      toast({
        title: "Password reset successful",
        description: `Password for ${userEmail} has been reset to: ${data.temporaryPassword}`,
      });

    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setResettingPassword(null);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    try {
      setDeletingUser(userId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      console.log('Deleting user:', userId);

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          user_id: userId
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      console.log('User deletion response:', { data, error });

      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: "User deleted successfully",
        description: data.message || `User ${userEmail} has been deleted`,
      });

      onUserUpdated();

    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setDeletingUser(null);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast({
        title: "Role updated",
        description: `User role updated to ${newRole}`,
      });

      onUserUpdated();
    } catch (error: any) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const removeUserRole = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Role removed",
        description: "User role has been removed",
      });

      onUserUpdated();
    } catch (error: any) {
      console.error('Error removing user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user role",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => resetUserPassword(profile.user_id, profile.email)}
        disabled={resettingPassword === profile.user_id}
        title="Reset password to WholesaleReset2024!"
      >
        {resettingPassword === profile.user_id ? (
          <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-current" />
        ) : (
          <KeyRound className="h-3 w-3" />
        )}
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            disabled={deletingUser === profile.user_id}
            title="Delete user permanently"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {deletingUser === profile.user_id ? (
              <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-current" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the user "{profile.email}"? 
              This action cannot be undone and will remove all associated data including estimates, markups, and roles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUser(profile.user_id, profile.email)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Select
        value={profile.role || 'none'}
        onValueChange={(newRole: 'admin' | 'user' | 'none') => {
          if (newRole === 'none') {
            removeUserRole(profile.user_id);
          } else {
            updateUserRole(profile.user_id, newRole);
          }
        }}
      >
        <SelectTrigger className="w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
