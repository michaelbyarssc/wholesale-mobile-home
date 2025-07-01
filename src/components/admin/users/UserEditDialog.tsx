
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit } from 'lucide-react';

export interface UserProfile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: string | null;
  created_at: string;
  markup_percentage: number;
  minimum_profit_per_home: number;
  approved: boolean;
  approved_at: string | null;
  created_by?: string | null;
}

interface UserEditDialogProps {
  profile: UserProfile;
  onUserUpdated: () => void;
}

export const UserEditDialog = ({ profile, onUserUpdated }: UserEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    phone_number: profile.phone_number || '',
    role: profile.role || 'user',
  });
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentUserRole();
  }, []);

  const checkCurrentUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Check if user is super admin - fix the role checking logic
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      // Check if ANY of the user's roles is 'super_admin'
      const userIsSuperAdmin = roleData?.some(role => role.role === 'super_admin') || false;
      setIsSuperAdmin(userIsSuperAdmin);
      console.log('UserEditDialog: User is super admin:', userIsSuperAdmin);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number,
        })
        .eq('user_id', profile.user_id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        toast({
          title: "Error",
          description: "Failed to update user profile",
          variant: "destructive",
        });
        return;
      }

      // Update role if user is super admin
      if (isSuperAdmin) {
        // Ensure the role is a valid enum value
        const validRole = formData.role as 'user' | 'admin' | 'super_admin';
        
        // First, delete existing roles for this user
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', profile.user_id);

        if (deleteError) {
          console.error('Error deleting existing roles:', deleteError);
          toast({
            title: "Error",
            description: "Failed to update user role",
            variant: "destructive",
          });
          return;
        }

        // Then insert the new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: profile.user_id,
            role: validRole
          });

        if (roleError) {
          console.error('Error updating role:', roleError);
          toast({
            title: "Error",
            description: "Failed to update user role",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setOpen(false);
      onUserUpdated();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              value={formData.phone_number}
              onChange={(e) => handleInputChange('phone_number', e.target.value)}
            />
          </div>
          {isSuperAdmin && (
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
