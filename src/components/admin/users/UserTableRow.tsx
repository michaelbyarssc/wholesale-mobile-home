
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import { UserProfile } from './UserEditDialog';
import { UserEditDialog } from './UserEditDialog';
import { UserActions } from './UserActions';
import { MarkupEditor } from './MarkupEditor';

interface UserTableRowProps {
  profile: UserProfile;
  onUserUpdated: () => void;
}

export const UserTableRow = ({ profile, onUserUpdated }: UserTableRowProps) => {
  const getDisplayName = (profile: UserProfile) => {
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile.email === 'No email' ? 'Unknown User' : profile.email || 'Unknown User';
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) {
      return (
        <Badge variant="outline" className="text-gray-500">
          <ShieldOff className="h-3 w-3 mr-1" />
          No Role
        </Badge>
      );
    }

    switch (role) {
      case 'super_admin':
        return (
          <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="default">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <ShieldOff className="h-3 w-3 mr-1" />
            User
          </Badge>
        );
    }
  };

  return (
    <TableRow key={profile.user_id}>
      <TableCell>
        <div>
          <div className="font-medium">{getDisplayName(profile)}</div>
          <div className="text-sm text-gray-500">{profile.email}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {profile.phone_number || 'No phone'}
        </div>
      </TableCell>
      <TableCell>
        {getRoleBadge(profile.role)}
      </TableCell>
      <TableCell>
        <MarkupEditor
          userId={profile.user_id}
          currentMarkup={profile.markup_percentage || 0}
          onMarkupUpdated={onUserUpdated}
        />
      </TableCell>
      <TableCell>
        {new Date(profile.created_at).toLocaleDateString()}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <UserEditDialog profile={profile} onUserUpdated={onUserUpdated} />
          <UserActions profile={profile} onUserUpdated={onUserUpdated} />
        </div>
      </TableCell>
    </TableRow>
  );
};
