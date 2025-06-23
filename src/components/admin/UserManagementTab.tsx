
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Shield, ShieldOff, AlertTriangle } from 'lucide-react';

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'user' | null;
  created_at: string;
}

export const UserManagementTab = () => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfiles();
  }, []);

  const fetchUserProfiles = async () => {
    try {
      setLoading(true);
      
      // Fetch user roles and profiles separately, then join them
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
        toast({
          title: "Error",
          description: "Failed to fetch user roles",
          variant: "destructive",
        });
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name');

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        toast({
          title: "Error",
          description: "Failed to fetch user profiles",
          variant: "destructive",
        });
        return;
      }

      // Join the data manually
      const combinedData: UserProfile[] = roleData.map(role => {
        const profile = profileData.find(p => p.user_id === role.user_id);
        return {
          user_id: role.user_id,
          email: profile?.email || '',
          first_name: profile?.first_name || null,
          last_name: profile?.last_name || null,
          role: role.role,
          created_at: role.created_at
        };
      });

      setUserProfiles(combinedData);
    } catch (error) {
      console.error('Error in fetchUserProfiles:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUserEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      // Send invitation using the standard sign-up flow
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: 'temp-password-' + Math.random().toString(36).slice(-8), // Temporary password
        options: {
          emailRedirectTo: window.location.origin + '/auth'
        }
      });

      if (error) throw error;

      if (data.user) {
        // Assign the selected role to the new user
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert([{ user_id: data.user.id, role: newUserRole }]);

        if (roleError) {
          console.error('Error assigning role:', roleError);
          toast({
            title: "Invitation sent but role assignment failed",
            description: `Invitation sent to ${newUserEmail} but couldn't assign the ${newUserRole} role`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "User invitation sent",
            description: `Invitation sent to ${newUserEmail} with ${newUserRole} role. They will need to set their password.`,
          });
        }
      }

      // Clear the form
      setNewUserEmail('');
      setNewUserRole('user');

      // Refresh the users list
      fetchUserProfiles();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      // Update the user's role
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: `User role has been updated to ${newRole}`,
      });

      // Refresh the users list
      fetchUserProfiles();
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
        title: "User role removed",
        description: "User role has been removed",
      });

      // Refresh the users list
      fetchUserProfiles();
    } catch (error: any) {
      console.error('Error removing user role:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove user role",
        variant: "destructive",
      });
    }
  };

  const getDisplayName = (profile: UserProfile) => {
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile.email || 'Unknown User';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning about limitations */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">User Management Limitations</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Due to security restrictions, this interface can only manage user roles, not create users directly. 
                Users must sign up through the normal registration process, then you can assign roles here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite User Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={inviteUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto">
              Send Invitation
            </Button>
            <p className="text-sm text-gray-600">
              An invitation will be sent to the email address. The user will need to complete registration and set their password.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Existing User Roles Section */}
      <Card>
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <p className="text-sm text-gray-600">
            Manage roles for users who have already registered.
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No users with assigned roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  userProfiles.map((profile) => (
                    <TableRow key={profile.user_id}>
                      <TableCell className="font-medium">
                        {getDisplayName(profile)}
                      </TableCell>
                      <TableCell>
                        {profile.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={profile.role === 'admin' ? "default" : "secondary"}>
                          {profile.role === 'admin' ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            <>
                              <ShieldOff className="h-3 w-3 mr-1" />
                              User
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Select
                          value={profile.role || 'user'}
                          onValueChange={(newRole: 'admin' | 'user') => 
                            updateUserRole(profile.user_id, newRole)
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeUserRole(profile.user_id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How User Management Works:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>User Registration:</strong> Users sign up through the normal registration flow</li>
              <li>• <strong>Profile Creation:</strong> User profiles are automatically created with name and email</li>
              <li>• <strong>Role Assignment:</strong> Admins can assign roles to registered users</li>
              <li>• <strong>Invitations:</strong> Send registration invitations with pre-assigned roles</li>
              <li>• <strong>Role Changes:</strong> Modify user roles as needed</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
