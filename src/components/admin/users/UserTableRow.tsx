
import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, Truck } from 'lucide-react';
import { UserProfile } from './UserEditDialog';
import { UserEditDialog } from './UserEditDialog';
import { UserActions } from './UserActions';
import { MarkupEditor } from './MarkupEditor';
import { supabase } from '@/integrations/supabase/client';

interface UserTableRowProps {
  profile: UserProfile;
  onUserUpdated: () => void;
  mobileView?: boolean;
  isSuperAdmin: boolean;
}

export const UserTableRow = ({ profile, onUserUpdated, mobileView = false, isSuperAdmin }: UserTableRowProps) => {
  const [createdByName, setCreatedByName] = useState<string>('');

  useEffect(() => {
    fetchCreatedByName();
  }, [profile.created_by]);

  const fetchCreatedByName = async () => {
    if (!profile.created_by) {
      setCreatedByName('Self-registered');
      return;
    }

    try {
      const { data: creatorProfile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', profile.created_by)
        .maybeSingle();

      if (error) {
        console.error('Error fetching creator profile:', error);
        setCreatedByName('Unknown');
        return;
      }

      if (creatorProfile) {
        const name = `${creatorProfile.first_name || ''} ${creatorProfile.last_name || ''}`.trim();
        setCreatedByName(name || creatorProfile.email || 'Unknown');
      } else {
        setCreatedByName('Unknown');
      }
    } catch (error) {
      console.error('Error in fetchCreatedByName:', error);
      setCreatedByName('Unknown');
    }
  };

  const getDisplayName = (profile: UserProfile) => {
    if (profile.first_name || profile.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile.email === 'No email' ? 'Unknown User' : profile.email || 'Unknown User';
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) {
      return (
        <Badge variant="outline" className="text-gray-500 text-xs py-0 px-1">
          <ShieldOff className="h-2.5 w-2.5 mr-0.5" />
          No Role
        </Badge>
      );
    }

    switch (role) {
      case 'super_admin':
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs py-0 px-1">
            <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
            Super Admin
          </Badge>
        );
      case 'admin':
        return (
          <Badge variant="default" className="text-xs py-0 px-1">
            <Shield className="h-2.5 w-2.5 mr-0.5" />
            Admin
          </Badge>
        );
      case 'driver':
        return (
          <Badge variant="secondary" className="text-xs py-0 px-1">
            <Truck className="h-2.5 w-2.5 mr-0.5" />
            Driver
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-xs py-0 px-1">
            <ShieldOff className="h-2.5 w-2.5 mr-0.5" />
            User
          </Badge>
        );
    }
  };

  if (mobileView) {
    return (
      <div className="flex items-center justify-between w-full gap-2">
        <MarkupEditor
          userId={profile.user_id}
          currentMarkup={profile.markup_percentage || 0}
          onMarkupUpdated={onUserUpdated}
        />
        <div className="flex items-center gap-1">
          <UserEditDialog profile={profile} onUserUpdated={onUserUpdated} />
          <UserActions profile={profile} onUserUpdated={onUserUpdated} />
        </div>
      </div>
    );
  }

  return (
    <TableRow key={profile.user_id} className="text-xs">
      <TableCell className="py-2 px-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <div className="font-medium text-xs truncate max-w-[140px]">{getDisplayName(profile)}</div>
            {profile.is_driver && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 py-0 px-1">
                <Truck className="h-2.5 w-2.5 mr-0.5" />
                Driver
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[140px]">{profile.email}</div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell py-2 px-2">
        <div className="text-xs truncate">
          {profile.phone_number || 'No phone'}
        </div>
      </TableCell>
      {isSuperAdmin && (
        <TableCell className="hidden lg:table-cell py-2 px-2">
          {getRoleBadge(profile.role)}
        </TableCell>
      )}
      <TableCell className="hidden md:table-cell py-2 px-2">
        <MarkupEditor
          userId={profile.user_id}
          currentMarkup={profile.markup_percentage || 0}
          onMarkupUpdated={onUserUpdated}
        />
      </TableCell>
      {isSuperAdmin && (
        <TableCell className="hidden xl:table-cell py-2 px-2">
          <div className="text-xs text-muted-foreground truncate max-w-[100px]">
            {createdByName}
          </div>
        </TableCell>
      )}
      <TableCell className="hidden md:table-cell py-2 px-2">
        <div className="text-xs">{new Date(profile.created_at).toLocaleDateString()}</div>
      </TableCell>
      <TableCell className="text-right py-2 px-2">
        <div className="flex items-center justify-end gap-0.5">
          <UserEditDialog profile={profile} onUserUpdated={onUserUpdated} />
          <UserActions profile={profile} onUserUpdated={onUserUpdated} />
        </div>
      </TableCell>
    </TableRow>
  );
};
