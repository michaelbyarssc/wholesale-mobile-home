
import React, { useState, useEffect } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff, Truck } from 'lucide-react';
import { UserProfile } from './UserEditDialog';
import { UserEditDialog } from './UserEditDialog';
import { UserActions } from './UserActions';
import { MarkupEditor } from './MarkupEditor';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';

interface UserTableRowProps {
  profile: UserProfile;
  onUserUpdated: () => void;
  mobileView?: boolean;
}

export const UserTableRow = ({ profile, onUserUpdated, mobileView = false }: UserTableRowProps) => {
  const [createdByName, setCreatedByName] = useState<string>('');
  
  // SECURITY: Use centralized role management
  const { isSuperAdmin } = useUserRoles();

  useEffect(() => {
    fetchCreatedByName();
    console.log(`[SECURITY] UserTableRow: User isSuperAdmin: ${isSuperAdmin}`);
  }, [isSuperAdmin]);

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
        <Badge variant="outline" className="text-gray-500">
          <ShieldOff className="h-3 w-3 mr-1" />
          No Role
        </Badge>
      );
    }

    switch (role) {
      case 'super_admin':
        return (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
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

  if (mobileView) {
    return (
      <div className="flex items-center justify-between w-full">
        <MarkupEditor
          userId={profile.user_id}
          currentMarkup={profile.markup_percentage || 0}
          onMarkupUpdated={onUserUpdated}
        />
        <div className="flex items-center gap-2">
          <UserEditDialog profile={profile} onUserUpdated={onUserUpdated} />
          <UserActions profile={profile} onUserUpdated={onUserUpdated} />
        </div>
      </div>
    );
  }

  return (
    <TableRow key={profile.user_id}>
      <TableCell>
        <div>
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm">{getDisplayName(profile)}</div>
            {profile.is_driver && (
              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                <Truck className="h-3 w-3 mr-1" />
                Driver
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{profile.email}</div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <div className="text-sm">
          {profile.phone_number || 'No phone'}
        </div>
      </TableCell>
      {isSuperAdmin && (
        <TableCell className="hidden lg:table-cell">
          {getRoleBadge(profile.role)}
        </TableCell>
      )}
      <TableCell className="hidden md:table-cell">
        <MarkupEditor
          userId={profile.user_id}
          currentMarkup={profile.markup_percentage || 0}
          onMarkupUpdated={onUserUpdated}
        />
      </TableCell>
      {isSuperAdmin && (
        <TableCell className="hidden xl:table-cell">
          <div className="text-sm text-muted-foreground">
            {createdByName}
          </div>
        </TableCell>
      )}
      <TableCell className="hidden md:table-cell">
        <div className="text-sm">{new Date(profile.created_at).toLocaleDateString()}</div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <UserEditDialog profile={profile} onUserUpdated={onUserUpdated} />
          <UserActions profile={profile} onUserUpdated={onUserUpdated} />
        </div>
      </TableCell>
    </TableRow>
  );
};
