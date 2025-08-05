import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuthUser } from '@/hooks/useAuthUser';
import { UserForm } from './users/UserForm';
import { UserTable } from './users/UserTable';
import { PendingApprovalsCard } from './users/PendingApprovalsCard';
import { FixProfilesButton } from './users/FixProfilesButton';
import { UserProfile } from './users/UserEditDialog';

export const UserManagementTab = () => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuthUser();
  const { isSuperAdmin, isLoading: rolesLoading } = useUserRoles();
  const { toast } = useToast();

  useEffect(() => {
    // SECURITY: Use centralized role management
    if (!rolesLoading && currentUser) {
      console.log(`[SECURITY] UserManagementTab: User ${currentUser.id} isSuperAdmin: ${isSuperAdmin}`);
      fetchUserProfiles(currentUser.id, isSuperAdmin);
    }
  }, [currentUser, isSuperAdmin, rolesLoading]);

  const fetchUserProfiles = async (currentUserId?: string, userIsSuperAdmin?: boolean) => {
    try {
      setLoading(true);
      console.log(`[SECURITY] Fetching user profiles for user: ${currentUserId}, isSuperAdmin: ${userIsSuperAdmin}`);
      
      // First, let's get all auth users to see what we're working with
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      console.log('Auth users found:', authUsers?.users?.length || 0);
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        throw authError;
      }

      // Get all profiles from the profiles table
      let profilesQuery = supabase
        .from('profiles')
        .select('*');

      // SECURITY: Filter based on user role - super admins see all, others see only their created users
      if (!userIsSuperAdmin && currentUserId) {
        profilesQuery = profilesQuery.eq('created_by', currentUserId);
      } else if (userIsSuperAdmin) {
        // Super admin sees all profiles
        console.log('[SECURITY] Super admin accessing all profiles');
      }

      const { data: profiles, error: profileError } = await profilesQuery;
      
      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        throw profileError;
      }

      console.log('Profiles found:', profiles?.length || 0);

      // Get all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Default markup values
      const allMarkups = profiles?.map(p => ({ 
        user_id: p.user_id, 
        markup_percentage: 0 
      })) || [];

      // Skip driver assignments for now to avoid type issues
      console.log('Skipping driver assignments to avoid type conflicts');

      // Combine profiles with auth users data and roles
      const combinedProfiles: UserProfile[] = profiles?.map(profile => {
        const authUser = authUsers?.users?.find((u: any) => u.id === profile.user_id);
        const userRoles = allRoles?.filter(role => role.user_id === profile.user_id) || [];
        const userMarkup = allMarkups?.find(markup => markup.user_id === profile.user_id);

        // Determine primary role for display
        let primaryRole = 'user';
        if (userRoles.some(r => r.role === 'super_admin')) {
          primaryRole = 'super_admin';
        } else if (userRoles.some(r => r.role === 'admin')) {
          primaryRole = 'admin';
        } else if (userRoles.some(r => r.role === 'driver')) {
          primaryRole = 'driver';
        }

        return {
          user_id: profile.user_id,
          email: authUser?.email || 'No email',
          first_name: profile.first_name || '',
          last_name: profile.last_name || '',
          phone_number: profile.phone_number || '',
          role: primaryRole,
          markup_percentage: userMarkup?.markup_percentage || 0,
          minimum_profit_per_home: 0,
          approved_at: profile.approved_at || null,
          approved: profile.approved || false,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          assigned_admin_id: profile.assigned_admin_id,
          created_by: profile.created_by || currentUserId,
          is_driver: false, // Simplified for now
          can_delete: userIsSuperAdmin
        };
      }) || [];

      // Filter based on approval status for different views
      const approvedUsers = combinedProfiles.filter(profile => profile.approved === true);
      const pendingUsers = combinedProfiles.filter(profile => profile.approved !== true);

      console.log('Approved users:', approvedUsers.length);
      console.log('Pending users:', pendingUsers.length);

      setUserProfiles(approvedUsers);
      setPendingApprovals(pendingUsers);
    } catch (error) {
      console.error('[SECURITY] Error fetching user profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch user profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdated = () => {
    console.log('[SECURITY] User updated, refreshing profiles');
    if (currentUser) {
      fetchUserProfiles(currentUser.id, isSuperAdmin);
    }
  };

  if (loading || rolesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingApprovals.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Pending Approvals ({pendingApprovals.length})</h3>
          <p className="text-sm text-yellow-700">Users awaiting approval by administrators.</p>
        </div>
      )}
      
      <UserForm onUserCreated={handleUserUpdated} />
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">User Management</h3>
            <button onClick={handleUserUpdated} className="text-sm text-blue-600 hover:text-blue-800">
              Refresh Profiles
            </button>
          </div>
          
          <UserTable 
            userProfiles={userProfiles}
            onUserUpdated={handleUserUpdated}
          />
        </CardContent>
      </Card>
    </div>
  );
};