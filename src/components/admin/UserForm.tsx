
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateSecurePassword, sanitizeInput, validateEmail } from '@/utils/security';
import { logger } from '@/utils/logger';

interface UserFormProps {
  onUserCreated: () => void;
}

export const UserForm = ({ onUserCreated }: UserFormProps) => {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [creatingUser, setCreatingUser] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
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
    } catch (error) {
      logger.error('Error checking user role:', error);
    }
  };

  const createUserDirectly = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const sanitizedEmail = sanitizeInput(newUserEmail);
    
    if (!sanitizedEmail || !validateEmail(sanitizedEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingUser(true);
      
      // Generate secure random password
      const tempPassword = generateSecurePassword();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      logger.log('Creating user with admin session');

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: sanitizedEmail,
          password: tempPassword,
          role: newUserRole,
          markup_percentage: 30,
          created_by: session.user.id
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      logger.log('User created successfully');

      toast({
        title: "User created and approved",
        description: `User ${sanitizedEmail} created with ${newUserRole} role. A secure password has been generated.`,
      });

      // Clear form
      setNewUserEmail('');
      setNewUserRole('user');
      
      // Show password in a secure way - only once
      toast({
        title: "Temporary Password",
        description: `Password: ${tempPassword} (Please share this securely with the user)`,
        variant: "default",
      });
      
      onUserCreated();
    } catch (error: any) {
      logger.error('Error creating user:', error);
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="email">Email Address</Label>
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
            <div className="text-sm text-muted-foreground">
              <p className="text-green-600 font-medium">Users created by admins are automatically approved</p>
              <p>A secure password will be generated and displayed once</p>
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
