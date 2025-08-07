
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchDebounce } from '@/hooks/useSearchDebounce';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';
import { UserForm } from './users/UserForm';
import { UserTable } from './users/UserTable';
import { PendingApprovalsCard } from './users/PendingApprovalsCard';
import { FixProfilesButton } from './users/FixProfilesButton';
import { UserProfile } from './users/UserEditDialog';
import { LoadingSpinner } from '@/components/loading/LoadingSpinner';

export const UserManagementTab = () => {
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user: currentUser } = useAuth();
  const { isSuperAdmin, isLoading: rolesLoading } = useUserRoles();
  const { toast } = useToast();
  
  const debouncedSearchQuery = useSearchDebounce(searchQuery, 300);

  // Use centralized user data - no independent fetching
  useEffect(() => {
    if (!rolesLoading && currentUser && !loading) {
      console.log(`[SECURITY] UserManagementTab: Using centralized user data for ${currentUser.id}`);
      setIsDataReady(true);
      setLoading(false);
    }
  }, [currentUser?.id, isSuperAdmin, rolesLoading, loading]);

  // Filter users based on search query
  const filteredUserProfiles = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return userProfiles;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    return userProfiles.filter(profile => {
      const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase();
      const email = profile.email?.toLowerCase() || '';
      const phone = profile.phone_number?.toLowerCase() || '';
      
      return fullName.includes(query) || 
             email.includes(query) || 
             phone.includes(query);
    });
  }, [userProfiles, debouncedSearchQuery]);

  const handleUserUpdated = () => {
    console.log('[SECURITY] User updated, using centralized refresh');
    // Trigger refresh through AuthContext instead of independent fetching
    window.location.reload();
  };

  // Show loading state until all data is ready
  if (loading || rolesLoading || !isDataReady) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner 
          size="lg" 
          text="Loading user management..." 
          variant="spinner"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pendingApprovals.length > 0 && (
        <PendingApprovalsCard 
          pendingUsers={pendingApprovals}
          onUserApproved={handleUserUpdated}
        />
      )}
      
      <UserForm onUserCreated={handleUserUpdated} />
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">User Management</h3>
            <button onClick={handleUserUpdated} className="text-sm text-blue-600 hover:text-blue-800">
              Refresh Profiles
            </button>
          </div>
          
          <div className="mb-4">
            <GlobalSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              resultCount={filteredUserProfiles.length}
              placeholder="Search users by name, email, or phone..."
              className="w-full max-w-md"
            />
          </div>
          
          <UserTable 
            userProfiles={filteredUserProfiles}
            onUserUpdated={handleUserUpdated}
            isSuperAdmin={isSuperAdmin}
          />
        </CardContent>
      </Card>
    </div>
  );
};
