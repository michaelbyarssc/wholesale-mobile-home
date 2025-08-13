import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { StorageQuotaManager } from '@/utils/storageQuotaManager';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUserRoles } from '@/hooks/useUserRoles';

export const AuthDebugPanel: React.FC = () => {
  const { 
    user, 
    session, 
    isLoading, 
    storageError, 
    emergencyAuthRecovery, 
    forceRefreshAuth 
  } = useAuthUser();
  
  const { isAdmin, isSuperAdmin, isLoading: rolesLoading } = useUserRoles();

  const handleClearStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  };

  const handleEmergencyCleanup = () => {
    const success = StorageQuotaManager.emergencyCleanup();
    if (success) {
      window.location.reload();
    }
  };

  const storageReport = StorageQuotaManager.getStorageReport();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Authentication Debug Panel</CardTitle>
        <CardDescription>
          Troubleshoot authentication and storage issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Authentication Status</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant={user ? "default" : "secondary"}>
              User: {user ? "Authenticated" : "Not Authenticated"}
            </Badge>
            <Badge variant={session ? "default" : "secondary"}>
              Session: {session ? "Active" : "None"}
            </Badge>
            <Badge variant={isLoading ? "outline" : "default"}>
              Auth Loading: {isLoading ? "Yes" : "No"}
            </Badge>
            <Badge variant={rolesLoading ? "outline" : "default"}>
              Roles Loading: {rolesLoading ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        {/* Role Status */}
        <div className="space-y-2">
          <h3 className="font-semibold">Role Status</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant={isAdmin ? "default" : "secondary"}>
              Admin: {isAdmin ? "Yes" : "No"}
            </Badge>
            <Badge variant={isSuperAdmin ? "default" : "secondary"}>
              Super Admin: {isSuperAdmin ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        {/* Storage Status */}
        {storageError && (
          <Alert>
            <AlertDescription>
              Storage quota exceeded. Some features may not work properly.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold">Storage Report</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {storageReport}
          </pre>
        </div>

        {/* Debug Actions */}
        <div className="space-y-2">
          <h3 className="font-semibold">Debug Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={forceRefreshAuth}>
              Refresh Auth
            </Button>
            <Button variant="outline" size="sm" onClick={emergencyAuthRecovery}>
              Emergency Recovery
            </Button>
            <Button variant="outline" size="sm" onClick={handleEmergencyCleanup}>
              Emergency Cleanup
            </Button>
            <Button variant="destructive" size="sm" onClick={handleClearStorage}>
              Clear All Storage
            </Button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="space-y-2">
            <h3 className="font-semibold">User Info</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
              {JSON.stringify({ 
                id: user.id, 
                email: user.email,
                created_at: user.created_at,
                last_sign_in_at: user.last_sign_in_at
              }, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};