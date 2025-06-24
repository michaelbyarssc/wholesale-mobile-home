
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserForm } from './users/UserForm';
import { UserTable } from './users/UserTable';
import { UserProfile } from './users/UserEditDialog';

export const UserManagementTab = () => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
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
      <UserForm onUserCreated={fetchUserProfiles} />
      <UserTable userProfiles={userProfiles} onUserUpdated={fetchUserProfiles} />
    </div>
  );
};
