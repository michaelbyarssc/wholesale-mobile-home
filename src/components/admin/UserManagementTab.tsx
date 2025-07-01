
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
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfiles();
  }, []);

  const fetchUserProfiles = async () => {
    try {
      setLoading(true);
      console.log('Fetching user profiles...');
      
      // Fetch all user profiles including approval status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name, phone_number, created_at, approved, approved_at, denied');

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

      // Separate approved users, pending users (not approved and not denied), and denied users
      const approvedUsers = profileData?.filter(profile => profile.approved) || [];
      const pendingUsers = profileData?.filter(profile => !profile.approved && !profile.denied) || [];

      // Fetch user roles for approved users
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
      }

      // Fetch customer markups for approved users
      const { data: markupData, error: markupError } = await supabase
        .from('customer_markups')
        .select('user_id, markup_percentage, minimum_profit_per_home');

      if (markupError) {
        console.error('Error fetching markups:', markupError);
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

      // Process pending users (only those not denied)
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
          onUserApproved={fetchUserProfiles} 
        />
      )}
      <UserForm onUserCreated={fetchUserProfiles} />
      <UserTable userProfiles={userProfiles} onUserUpdated={fetchUserProfiles} />
    </div>
  );
};
