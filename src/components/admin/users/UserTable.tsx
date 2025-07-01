
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserProfile } from './UserEditDialog';
import { UserTableRow } from './UserTableRow';

interface UserTableProps {
  userProfiles: UserProfile[];
  onUserUpdated: () => void;
}

export const UserTable = ({ userProfiles, onUserUpdated }: UserTableProps) => {
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
