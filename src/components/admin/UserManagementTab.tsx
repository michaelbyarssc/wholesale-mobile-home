
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserForm } from './users/UserForm';
import { UserTable } from './users/UserTable';
import { PendingApprovalsCard } from './users/PendingApprovalsCard';
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
        .eq('user_id', session.user.id)
        .single();

      const userIsSuperAdmin = roleData?.role === 'super_admin';
      setIsSuperAdmin(userIsSuperAdmin);
      console.log('UserManagementTab: User role:', roleData?.role, 'isSuperAdmin:', userIsSuperAdmin);
      
      // Check specifically for support@michaelbyars.com
      await checkSpecificUser();
      
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

  const checkSpecificUser = async () => {
    try {
      console.log('=== CHECKING FOR support@michaelbyars.com ===');
      
      // Check in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'support@michaelbyars.com');
      
      console.log('Profile query result:', { profileData, profileError });
      
      // Check in auth.users table via edge function or RPC if possible
      // Note: We can't directly query auth.users, but we can check if there are any user_roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .in('user_id', ['2cdfc4ae-d8cc-4890-a1be-132cfbdd87d0', '91f386de-c98e-4906-b388-baa1a09af57e']);
      
      console.log('Role data for known users:', { roleData, roleError });
      
      // Get all profiles to see what's in the database
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('email, user_id, created_by, approved, denied');
      
      console.log('All profiles in database:', allProfiles);
      console.log('Total profiles count:', allProfiles?.length);
      
      // Check if support@michaelbyars.com exists in any form
      const supportUser = allProfiles?.find(p => p.email === 'support@michaelbyars.com');
      console.log('Found support@michaelbyars.com?', supportUser);
      
    } catch (error) {
      console.error('Error checking specific user:', error);
    }
  };

  const fetchUserProfiles = async (currentUserId?: string, userIsSuperAdmin?: boolean) => {
    try {
      setLoading(true);
      console.log('Fetching user profiles for user:', currentUserId, 'isSuperAdmin:', userIsSuperAdmin);
      
      let profileQuery = supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, phone_number, created_at, approved, approved_at, denied, created_by');

      // If not super admin, only show users created by current admin
      if (!userIsSuperAdmin && currentUserId) {
        console.log('Filtering profiles by created_by:', currentUserId);
        profileQuery = profileQuery.eq('created_by', currentUserId);
      } else {
        console.log('Super admin - fetching ALL profiles without filtering');
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
          created_by: profile.created_by
        });
      });

      if (!profileData) {
        setUserProfiles([]);
        setPendingApprovals([]);
        return;
      }

      // Separate users: approved users and pending users (not approved and not denied)
      const approvedUsers = profileData?.filter(profile => profile.approved === true) || [];
      const pendingUsers = profileData?.filter(profile => profile.approved !== true && profile.denied !== true) || [];

      console.log('Approved users (including admin-created):', approvedUsers.length);
      console.log('Approved users details:', approvedUsers.map(u => ({ email: u.email, approved: u.approved, created_by: u.created_by })));
      console.log('Pending users:', pendingUsers.length);
      console.log('Pending users details:', pendingUsers.map(u => ({ email: u.email, approved: u.approved, denied: u.denied, created_by: u.created_by })));

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
          approved_at: profile.approved_at
        };
      });

      // Process pending users (those not approved and not denied)
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
        approved_at: null
      }));

      console.log('Final approved users data (including admin-created):', combinedApprovedData);
      console.log('Final pending users data:', pendingUsersData);

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
