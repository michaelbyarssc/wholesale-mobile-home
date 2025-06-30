
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit } from 'lucide-react';

export interface UserProfile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'user' | null;
  created_at: string;
  markup_percentage?: number;
  minimum_profit_per_home?: number;
}

interface UserEditDialogProps {
  profile: UserProfile;
  onUserUpdated: () => void;
}

export const UserEditDialog = ({ profile, onUserUpdated }: UserEditDialogProps) => {
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    first_name: '',
    last_name: ''
  });
  const { toast } = useToast();

  const startEditingUser = (profile: UserProfile) => {
    setEditingUser(profile.user_id);
    setEditForm({
      email: profile.email === 'No email' ? '' : profile.email || '',
      first_name: profile.first_name || '',
      last_name: profile.last_name || ''
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({ email: '', first_name: '', last_name: '' });
  };

  const updateUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    try {
      console.log('Updating profile for user:', editingUser);
      console.log('Update data:', editForm);

      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({
          email: editForm.email,
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', editingUser)
        .select();

      console.log('Update result:', { updateData, updateError });

      if (updateData && updateData.length === 0) {
        console.log('No existing profile found, creating new one...');
        const { data: insertData, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: editingUser,
            email: editForm.email,
            first_name: editForm.first_name,
            last_name: editForm.last_name
          })
          .select();

        console.log('Insert result:', { insertData, insertError });

        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }

      toast({
        title: "Profile updated",
        description: "User profile has been updated successfully",
      });

      setEditingUser(null);
      setEditForm({ email: '', first_name: '', last_name: '' });
      onUserUpdated();
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user profile",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={() => startEditingUser(profile)}
        >
          <Edit className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={updateUserProfile} className="space-y-4">
          <div>
            <Label htmlFor="edit-email">Email Address</Label>
            <Input
              id="edit-email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="edit-first-name">First Name</Label>
            <Input
              id="edit-first-name"
              type="text"
              value={editForm.first_name}
              onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="edit-last-name">Last Name</Label>
            <Input
              id="edit-last-name"
              type="text"
              value={editForm.last_name}
              onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditing}
            >
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
