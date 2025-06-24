
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Shield, ShieldOff, AlertTriangle, Edit, Percent, KeyRound } from 'lucide-react';

interface UserProfile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'admin' | 'user' | null;
  created_at: string;
  markup_percentage?: number;
}

export const UserManagementTab = () => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingMarkup, setEditingMarkup] = useState<string | null>(null);
  const [markupValue, setMarkupValue] = useState<number>(0);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    email: '',
    first_name: '',
    last_name: ''
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfiles();
  }, []);

  const fetchUserProfiles = async () => {
    try {
      setLoading(true);
      console.log('Fetching user profiles...');
      
      // First, fetch all user profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, created_at');

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        toast({
          title: "Error",
          description: "Failed to fetch user profiles",
          variant: "destructive",
        });
        return;
      }

      console.log('Profiles data:', profileData);

      // Fetch user roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
      }

      console.log('User roles data:', roleData);

      // Fetch customer markups
      const { data: markupData, error: markupError } = await supabase
        .from('customer_markups')
        .select('user_id, markup_percentage');

      if (markupError) {
        console.error('Error fetching markups:', markupError);
      }

      console.log('Markup data:', markupData);

      // Combine the data - start with all profiles, then add role and markup info
      const combinedData: UserProfile[] = profileData?.map(profile => {
        const role = roleData?.find(r => r.user_id === profile.user_id);
        const markup = markupData?.find(m => m.user_id === profile.user_id);
        console.log(`Combining user ${profile.user_id}:`, { profile, role, markup });
        
        return {
          user_id: profile.user_id,
          email: profile.email || 'No email',
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          role: role?.role || null,
          created_at: profile.created_at || role?.created_at || new Date().toISOString(),
          markup_percentage: markup?.markup_percentage || 0
        };
      }) || [];

      console.log('Combined data:', combinedData);
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

  const updateMarkupPercentage = async (userId: string, percentage: number) => {
    try {
      // First, try to update existing markup
      const { data: updateData, error: updateError } = await supabase
        .from('customer_markups')
        .update({ markup_percentage: percentage, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select();

      // If no rows were updated (markup doesn't exist), create a new one
      if (updateData && updateData.length === 0) {
        const { error: insertError } = await supabase
          .from('customer_markups')
          .insert({ user_id: userId, markup_percentage: percentage });

        if (insertError) throw insertError;
      } else if (updateError) {
        throw updateError;
      }

      toast({
        title: "Markup updated",
        description: `Markup percentage set to ${percentage}%`,
      });

      // Refresh the users list
      fetchUserProfiles();
      setEditingMarkup(null);
    } catch (error: any) {
      console.error('Error updating markup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update markup percentage",
        variant: "destructive",
      });
    }
  };

  const startEditingMarkup = (userId: string, currentMarkup: number) => {
    setEditingMarkup(userId);
    setMarkupValue(currentMarkup || 30); // Default to 30% when editing
  };

  const cancelMarkupEdit = () => {
    setEditingMarkup(null);
    setMarkupValue(0);
  };

  const resetUserPassword = async (userId: string, userEmail: string) => {
    try {
      setResettingPassword(userId);
      
      // Use the fixed password: Allies123!
      const newPassword = 'Allies123!';

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call the admin function to reset password
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          user_id: userId,
          new_password: newPassword
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Password reset successful",
        description: `Password for ${userEmail} has been reset to: Allies123!`,
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

  const createUserDirectly = async (e: React.FormEvent) => {
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
      setCreatingUser(true);
      
      // Use the fixed password: Allies123!
      const tempPassword = 'Allies123!';

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserEmail,
          password: tempPassword,
          role: newUserRole,
          markup_percentage: 30
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "User created successfully",
        description: `User ${newUserEmail} has been created with ${newUserRole} role and 30% markup. Password: Allies123!`,
      });

      // Clear the form
      setNewUserEmail('');
      setNewUserRole('user');

      // Refresh the users list
      fetchUserProfiles();
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
      // Send invitation using the standard sign-up flow with fixed password
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: 'Allies123!', // Use fixed password
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

        // Create default markup for new user (30%)
        const { error: markupError } = await supabase
          .from('customer_markups')
          .insert([{ user_id: data.user.id, markup_percentage: 30 }]);

        if (roleError) {
          console.error('Error assigning role:', roleError);
        }
        
        if (markupError) {
          console.error('Error creating default markup:', markupError);
        }

        if (roleError && !markupError) {
          toast({
            title: "Invitation sent but role assignment failed",
            description: `Invitation sent to ${newUserEmail} but couldn't assign the ${newUserRole} role`,
            variant: "destructive",
          });
        } else if (!roleError && markupError) {
          toast({
            title: "Invitation sent but markup creation failed",
            description: `Invitation sent to ${newUserEmail} but couldn't create default markup`,
            variant: "destructive",
          });
        } else if (roleError && markupError) {
          toast({
            title: "Invitation sent with issues",
            description: `Invitation sent to ${newUserEmail} but couldn't assign role or create markup`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "User invitation sent",
            description: `Invitation sent to ${newUserEmail} with ${newUserRole} role and 30% default markup. Password: Allies123!`,
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
      // Check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

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

      // First, try to update existing profile
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

      // If no rows were updated (profile doesn't exist), create a new one
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

      // Reset editing state
      setEditingUser(null);
      setEditForm({ email: '', first_name: '', last_name: '' });

      // Refresh the users list
      fetchUserProfiles();
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user profile",
        variant: "destructive",
      });
    }
  };

  const getDisplayName = (profile: UserProfile) => {
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile.email === 'No email' ? 'Unknown User' : profile.email || 'Unknown User';
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

      {/* Create User Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUserDirectly} className="space-y-4">
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
            <Button type="submit" className="w-full md:w-auto" disabled={creatingUser}>
              {creatingUser ? "Creating User..." : "Create User"}
            </Button>
            <p className="text-sm text-gray-600">
              User will be created with password: Allies123! (they can change it after logging in)
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Invite User Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User (Alternative)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={inviteUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invite-email">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="invite-role">Role</Label>
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
            <Button type="submit" className="w-full md:w-auto" variant="outline">
              Send Invitation
            </Button>
            <p className="text-sm text-gray-600">
              Invitation will be sent with password: Allies123! (user can change it after logging in)
            </p>
          </form>
        </CardContent>
      </Card>

      {/* All Users Section */}
      <Card>
        <CardHeader>
          <CardTitle>All Registered Users</CardTitle>
          <p className="text-sm text-gray-600">
            Manage all users who have registered, including role assignments and markup percentages.
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
                  <TableHead>Markup %</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No registered users found
                    </TableCell>
                  </TableRow>
                ) : (
                  userProfiles.map((profile) => (
                    <TableRow key={profile.user_id}>
                      <TableCell className="font-medium">
                        {getDisplayName(profile)}
                      </TableCell>
                      <TableCell>
                        {profile.email || 'No email'}
                      </TableCell>
                      <TableCell>
                        {profile.role ? (
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
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            No Role
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingMarkup === profile.user_id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={markupValue}
                              onChange={(e) => setMarkupValue(parseFloat(e.target.value) || 0)}
                              className="w-20"
                            />
                            <Button
                              size="sm"
                              onClick={() => updateMarkupPercentage(profile.user_id, markupValue)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelMarkupEdit}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              {profile.markup_percentage || 0}%
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingMarkup(profile.user_id, profile.markup_percentage || 0)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(profile.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingUser(profile)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
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
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetUserPassword(profile.user_id, profile.email)}
                          disabled={resettingPassword === profile.user_id}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          {resettingPassword === profile.user_id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-current mr-1" />
                          ) : (
                            <KeyRound className="h-3 w-3 mr-1" />
                          )}
                          Reset Password
                        </Button>
                        
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
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Role</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
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
              <li>• <strong>Role Assignment:</strong> Admins can assign roles to any registered user</li>
              <li>• <strong>Markup Percentage:</strong> Set individual markup percentages for each customer</li>
              <li>• <strong>Invitations:</strong> Send registration invitations with pre-assigned roles</li>
              <li>• <strong>Role Changes:</strong> Modify user roles as needed or remove roles entirely</li>
              <li>• <strong>Profile Editing:</strong> Edit user names and email addresses as needed</li>
              <li>• <strong>Password Reset:</strong> Reset user passwords to: Allies123!</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
