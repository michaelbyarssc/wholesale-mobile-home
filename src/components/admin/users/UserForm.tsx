
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserFormProps {
  onUserCreated: () => void;
}

export const UserForm = ({ onUserCreated }: UserFormProps) => {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFirstName, setNewUserFirstName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserPhoneNumber, setNewUserPhoneNumber] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [creatingUser, setCreatingUser] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentUserRole();
  }, []);

  const checkCurrentUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Check if user is super admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      console.log('Current user role data:', roleData);
      const userIsSuperAdmin = roleData?.role === 'super_admin';
      const userRole = roleData?.role || '';
      
      setIsSuperAdmin(userIsSuperAdmin);
      setCurrentUserRole(userRole);
      
      console.log('User role check:', {
        userId: session.user.id,
        role: userRole,
        isSuperAdmin: userIsSuperAdmin
      });
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const createUserDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserFirstName || !newUserLastName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Email, First Name, Last Name)",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingUser(true);
      
      const tempPassword = 'Wholesale2025!';

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      console.log('Creating user with role:', newUserRole, 'by user:', session.user.id);
      console.log('Current user is super admin:', isSuperAdmin);
      console.log('Current user role:', currentUserRole);

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserEmail,
          password: tempPassword,
          first_name: newUserFirstName,
          last_name: newUserLastName,
          phone_number: newUserPhoneNumber,
          role: newUserRole,
          markup_percentage: 30,
          created_by: session.user.id
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('User created successfully:', data);

      toast({
        title: "User created and approved",
        description: `User ${newUserFirstName} ${newUserLastName} (${newUserEmail}) created with ${newUserRole} role and automatically approved. Password: Wholesale2025!`,
      });

      setNewUserEmail('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserPhoneNumber('');
      setNewUserRole('user');
      
      // Call the callback to refresh the user list
      onUserCreated();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add New User
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={createUserDirectly} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                value={newUserFirstName}
                onChange={(e) => setNewUserFirstName(e.target.value)}
                placeholder="John"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                value={newUserLastName}
                onChange={(e) => setNewUserLastName(e.target.value)}
                placeholder="Doe"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={newUserPhoneNumber}
                onChange={(e) => setNewUserPhoneNumber(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUserRole} onValueChange={(value: 'admin' | 'user') => setNewUserRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="admin">Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p><strong>Password:</strong> Wholesale2025!</p>
              <p className="text-green-600 font-medium">Users created by admins are automatically approved</p>
              {isSuperAdmin && (
                <p className="text-blue-600 font-medium">As Super Admin, you can create both Admin and User accounts</p>
              )}
            </div>
            <Button type="submit" disabled={creatingUser}>
              {creatingUser ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
