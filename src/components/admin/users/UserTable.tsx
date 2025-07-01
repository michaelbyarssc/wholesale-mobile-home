
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserProfile } from './UserEditDialog';
import { UserTableRow } from './UserTableRow';
import { supabase } from '@/integrations/supabase/client';

interface UserTableProps {
  userProfiles: UserProfile[];
  onUserUpdated: () => void;
}

export const UserTable = ({ userProfiles, onUserUpdated }: UserTableProps) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl">Registered Users</CardTitle>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] sm:min-w-0">User</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  {isSuperAdmin && <TableHead className="hidden md:table-cell">Role</TableHead>}
                  <TableHead className="hidden lg:table-cell">Markup %</TableHead>
                  {isSuperAdmin && <TableHead className="hidden xl:table-cell">Created By</TableHead>}
                  <TableHead className="hidden sm:table-cell">Registered</TableHead>
                  <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProfiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
