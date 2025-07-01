
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

      // Check if user is super admin - get all roles for the user
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
        return;
      }

      // Check if user has super_admin role
      const userIsSuperAdmin = roleData?.some(r => r.role === 'super_admin') || false;
      setIsSuperAdmin(userIsSuperAdmin);
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registered Users</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Phone</TableHead>
                {isSuperAdmin && <TableHead>Role</TableHead>}
                <TableHead>Markup %</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userProfiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center py-8 text-gray-500">
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
      </CardContent>
    </Card>
  );
};
