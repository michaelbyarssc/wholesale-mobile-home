import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUserRoles } from '@/hooks/useUserRoles';
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
  const { isSuperAdmin } = useUserRoles();
  const { toast } = useToast();

  // SECURITY: Role information now comes from centralized hook
  useEffect(() => {
    console.log(`[SECURITY] UserForm: User isSuperAdmin: ${isSuperAdmin}`);
  }, [isSuperAdmin]);

  const createUserDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserFirstName || !newUserLastName || !newUserPhoneNumber) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (Email, First Name, Last Name, Phone Number)",
        variant: "destructive",
      });
      return;
    }

    // Enhanced client-side validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(newUserEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    const phoneRegex = /^[\d\s\-\(\)\+\.]{10,}$/;
    if (!phoneRegex.test(newUserPhoneNumber)) {
      toast({
        title: "Error", 
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingUser(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      console.log(`[SECURITY] Creating user with role: ${newUserRole} by user: ${user.id}`);
      console.log(`[SECURITY] Current user is super admin: ${isSuperAdmin}`);

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserEmail,
          first_name: newUserFirstName,
          last_name: newUserLastName,
          phone_number: newUserPhoneNumber,
          role: newUserRole,
          markup_percentage: 30,
          created_by: user.id
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Function error: ${error.message || 'Unknown error'}`);
      }

      if (data?.error) {
        console.error('Edge function returned error:', data.error);
        throw new Error(data.error);
      }

      if (!data?.success) {
        console.error('Edge function did not return success:', data);
        throw new Error('User creation failed - no success response');
      }

      console.log('[SECURITY] User created successfully:', data);

      const tempPassword = data?.tempPassword || 'Generated securely';
      
      toast({
        title: "User created and approved",
        description: `User ${newUserFirstName} ${newUserLastName} (${newUserEmail}) created with ${newUserRole} role and automatically approved. Secure password: ${tempPassword}`,
      });

      setNewUserEmail('');
      setNewUserFirstName('');
      setNewUserLastName('');
      setNewUserPhoneNumber('');
      setNewUserRole('user');
      
      onUserCreated();
    } catch (error: any) {
      console.error('[SECURITY] Error creating user:', error);
      
      let errorMessage = 'Failed to create user';
      if (error.message.includes('Function error:')) {
        errorMessage = error.message.replace('Function error: ', '');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={newUserPhoneNumber}
                onChange={(e) => setNewUserPhoneNumber(e.target.value)}
                placeholder="(555) 123-4567"
                required
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
              <p><strong>Password:</strong> Auto-generated secure password</p>
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