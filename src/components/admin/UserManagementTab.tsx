import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserForm } from './users/UserForm';
import { UserTable } from './users/UserTable';
import { PendingApprovalsCard } from './users/PendingApprovalsCard';
import { FixProfilesButton } from './users/FixProfilesButton';
import { UserProfile } from './users/UserEditDialog';

export const UserManagementTab = () => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkCurrentUserRole();
  }, []);

  const checkCurrentUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      setCurrentUser(session.user);
      console.log('UserManagementTab: Current user ID:', session.user.id);

      // Check if user is super admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      console.log('UserManagementTab: Role data:', roleData);

      const userIsSuperAdmin = roleData?.some(r => r.role === 'super_admin') || false;
      setIsSuperAdmin(userIsSuperAdmin);
      console.log('UserManagementTab: User role determination:', { 
        roleData, 
        userIsSuperAdmin,
        hasRoles: roleData && roleData.length > 0 
      });
      
      // Fetch user profiles after determining role
      fetchUserProfiles(session.user.id, userIsSuperAdmin);
    } catch (error) {
      console.error('Error checking user role:', error);
      toast({
        title: "Error",
        description: "Failed to check user permissions",
        variant: "destructive",
      });
    }
  };

  const fetchUserProfiles = async (currentUserId?: string, userIsSuperAdmin?: boolean) => {
    try {
      setLoading(true);
      console.log('Fetching user profiles for user:', currentUserId, 'isSuperAdmin:', userIsSuperAdmin);
      
      // First, let's get all auth users to see what we're working with
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      console.log('Auth users found:', authUsers?.users?.length || 0);
      console.log('Auth users:', authUsers?.users?.map(u => ({ id: u.id, email: u.email })));
      
      let profileQuery = supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, phone_number, created_at, approved, approved_at, denied, created_by');

      // Super admins see ALL users, regular admins only see users they created OR users with null created_by
      if (!userIsSuperAdmin && currentUserId) {
        console.log('Regular admin - filtering profiles by created_by:', currentUserId, 'OR null created_by');
        profileQuery = profileQuery.or(`created_by.eq.${currentUserId},created_by.is.null`);
      } else if (userIsSuperAdmin) {
        console.log('Super admin - fetching ALL profiles without filtering');
        // No filtering for super admins - they see everyone
      }

      const { data: profileData, error: profileError } = await profileQuery;

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        toast({
          title: "Error",
          description: "Failed to fetch user profiles",
          variant: "destructive",
        });
        return;
      }

      console.log('Raw profiles data:', profileData);
      console.log('Profiles found:', profileData?.length || 0);
      
      // Log detailed info about each profile
      profileData?.forEach(profile => {
        console.log('Profile:', {
          email: profile.email,
          approved: profile.approved,
          denied: profile.denied,
          created_by: profile.created_by,
          user_id: profile.user_id
        });
      });

      if (!profileData) {
        setUserProfiles([]);
        setPendingApprovals([]);
        return;
      }

      // Separate users: approved users and TRULY pending users (not approved, not denied, and not null approved)
      const approvedUsers = profileData?.filter(profile => profile.approved === true) || [];
      
      // For pending users - STRICT filtering to only show users that are actually pending approval
      let pendingUsers;
      if (userIsSuperAdmin) {
        // Super admins see ALL truly pending users
        pendingUsers = profileData?.filter(profile => 
          profile.approved === false && // Explicitly false, not null or true
          profile.denied !== true
        ) || [];
        console.log('Super admin - showing ALL truly pending users');
      } else {
        // Regular admins see truly pending users they created OR users with null created_by
        pendingUsers = profileData?.filter(profile => 
          profile.approved === false && // Explicitly false, not null or true
          profile.denied !== true && 
          (profile.created_by === currentUserId || profile.created_by === null)
        ) || [];
        console.log('Regular admin - showing truly pending users created by current admin OR with null created_by');
      }

      console.log('Approved users:', approvedUsers.length);
      console.log('Approved users details:', approvedUsers.map(u => ({ email: u.email, approved: u.approved, created_by: u.created_by })));
      console.log('Truly pending users:', pendingUsers.length);
      console.log('Truly pending users details:', pendingUsers.map(u => ({ email: u.email, approved: u.approved, denied: u.denied, created_by: u.created_by })));

      // Fetch user roles for approved users
      const approvedUserIds = approvedUsers.map(profile => profile.user_id);
      let roleData = [];
      let markupData = [];

      if (approvedUserIds.length > 0) {
        const { data: roleResult, error: roleError } = await supabase
          .from('user_roles')
          .select('user_id, role, created_at')
          .in('user_id', approvedUserIds);

        if (roleError) {
          console.error('Error fetching user roles:', roleError);
        } else {
          roleData = roleResult || [];
        }

        // Fetch customer markups for approved users
        const { data: markupResult, error: markupError } = await supabase
          .from('customer_markups')
          .select('user_id, markup_percentage, minimum_profit_per_home')
          .in('user_id', approvedUserIds);

        if (markupError) {
          console.error('Error fetching markups:', markupError);
        } else {
          markupData = markupResult || [];
        }
      }

      // Process approved users with role and markup info
      const combinedApprovedData: UserProfile[] = approvedUsers.map(profile => {
        const role = roleData?.find(r => r.user_id === profile.user_id);
        const markup = markupData?.find(m => m.user_id === profile.user_id);
        
        return {
          user_id: profile.user_id,
          email: profile.email || 'No email',
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          phone_number: profile.phone_number || null,
          role: role?.role || null,
          created_at: profile.created_at || new Date().toISOString(),
          markup_percentage: markup?.markup_percentage || 0,
          minimum_profit_per_home: markup?.minimum_profit_per_home || 0,
          approved: profile.approved,
          approved_at: profile.approved_at,
          created_by: profile.created_by
        };
      });

      // Process truly pending users (those explicitly set to approved: false and not denied)
      const pendingUsersData: UserProfile[] = pendingUsers.map(profile => ({
        user_id: profile.user_id,
        email: profile.email || 'No email',
        first_name: profile.first_name || null,
        last_name: profile.last_name || null,
        phone_number: profile.phone_number || null,
        role: null,
        created_at: profile.created_at || new Date().toISOString(),
        markup_percentage: 0,
        minimum_profit_per_home: 0,
        approved: false,
        approved_at: null,
        created_by: profile.created_by
      }));

      console.log('Final approved users data:', combinedApprovedData);
      console.log('Final truly pending users data:', pendingUsersData);

      setUserProfiles(combinedApprovedData);
      setPendingApprovals(pendingUsersData);
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

  const handleUserUpdated = () => {
    console.log('User updated, refreshing data...');
    if (currentUser) {
      fetchUserProfiles(currentUser.id, isSuperAdmin);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Admin Tools</h3>
                <p className="text-sm text-gray-600">Tools to help manage user profiles</p>
              </div>
              <FixProfilesButton />
            </div>
          </CardContent>
        </Card>
      )}
      
      {pendingApprovals.length > 0 && (
        <PendingApprovalsCard 
          pendingUsers={pendingApprovals} 
          onUserApproved={handleUserUpdated} 
        />
      )}
      <UserForm onUserCreated={handleUserUpdated} />
      <UserTable userProfiles={userProfiles} onUserUpdated={handleUserUpdated} />
    </div>
  );
};
