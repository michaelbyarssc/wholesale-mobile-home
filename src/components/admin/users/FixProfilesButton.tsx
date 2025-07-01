
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw } from 'lucide-react';

export const FixProfilesButton = () => {
  const [fixing, setFixing] = useState(false);
  const { toast } = useToast();

  const fixProfiles = async () => {
    try {
      setFixing(true);
      
      // Get all auth users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        throw authError;
      }

      console.log('Found auth users:', authUsers.users.length);
      
      let fixed = 0;
      
      for (const authUser of authUsers.users) {
        // Check if profile exists
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (checkError) {
          console.error(`Error checking profile for user ${authUser.email}:`, checkError);
          continue;
        }

        if (!existingProfile) {
          // Create missing profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: authUser.id,
              email: authUser.email,
              first_name: authUser.user_metadata?.first_name || null,
              last_name: authUser.user_metadata?.last_name || null,
              phone_number: authUser.user_metadata?.phone_number || null,
              approved: false,
              created_at: authUser.created_at
            });

          if (insertError) {
            console.error(`Error creating profile for user ${authUser.email}:`, insertError);
          } else {
            console.log(`Created profile for user ${authUser.email}`);
            fixed++;
          }
        }
      }

      toast({
        title: "Profiles Fixed",
        description: `Created ${fixed} missing profiles`,
      });

    } catch (error: any) {
      console.error('Error fixing profiles:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fix profiles",
        variant: "destructive",
      });
    } finally {
      setFixing(false);
    }
  };

  return (
    <Button
      onClick={fixProfiles}
      disabled={fixing}
      variant="outline"
      size="sm"
    >
      {fixing ? (
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Fix Missing Profiles
    </Button>
  );
};
