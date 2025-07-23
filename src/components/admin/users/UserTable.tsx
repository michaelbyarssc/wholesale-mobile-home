
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserProfile } from './UserEditDialog';
import { UserTableRow } from './UserTableRow';
import { CreatedByDisplay } from './CreatedByDisplay';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

interface UserTableProps {
  userProfiles: UserProfile[];
  onUserUpdated: () => void;
}

export const UserTable = ({ userProfiles, onUserUpdated }: UserTableProps) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    checkCurrentUserRole();
  }, []);

  const checkCurrentUserRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Check if user is super admin - fix the role checking logic
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
        return;
      }

      // Check if ANY of the user's roles is 'super_admin'
      const userIsSuperAdmin = roleData?.some(role => role.role === 'super_admin') || false;
      setIsSuperAdmin(userIsSuperAdmin);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  if (isMobile) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Users ({userProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-3 space-y-3">
          {userProfiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No registered users found</p>
            </div>
          ) : (
            userProfiles.map((profile) => (
              <div key={profile.user_id} className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground truncate">
                      {profile.first_name || profile.last_name 
                        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                        : profile.email === 'No email' ? 'Unknown User' : profile.email || 'Unknown User'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                    {profile.phone_number && (
                      <div className="text-xs text-muted-foreground">{profile.phone_number}</div>
                    )}
                  </div>
                   <div className="text-xs text-muted-foreground">
                     {new Date(profile.created_at).toLocaleDateString()}
                   </div>
                 </div>
                 
                 {isSuperAdmin && profile.role && (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-muted-foreground">Role:</span>
                     <span className="text-xs font-medium text-foreground capitalize">
                       {profile.role.replace('_', ' ')}
                     </span>
                   </div>
                 )}

                 {isSuperAdmin && (
                   <div className="flex items-center gap-2">
                     <span className="text-xs text-muted-foreground">Created by:</span>
                     <CreatedByDisplay 
                       createdBy={profile.created_by} 
                       className="text-xs font-medium text-foreground"
                     />
                   </div>
                 )}
                
                 <div className="pt-2 border-t border-border">
                   <UserTableRow 
                     key={profile.user_id} 
                     profile={profile} 
                     onUserUpdated={onUserUpdated}
                     mobileView={true}
                   />
                 </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg xl:text-xl">Registered Users ({userProfiles.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] lg:min-w-0">User</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  {isSuperAdmin && <TableHead className="hidden lg:table-cell">Role</TableHead>}
                  <TableHead className="hidden md:table-cell">Markup %</TableHead>
                  {isSuperAdmin && <TableHead className="hidden xl:table-cell">Created By</TableHead>}
                  <TableHead className="hidden md:table-cell">Registered</TableHead>
                  <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No registered users found
                    </TableCell>
                  </TableRow>
                ) : (
                  userProfiles.map((profile) => (
                    <UserTableRow 
                      key={profile.user_id} 
                      profile={profile} 
                      onUserUpdated={onUserUpdated}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
