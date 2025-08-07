import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, RefreshCw, LogOut, Database } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const AdminRecoveryPanel: React.FC = () => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, forceRefreshRoles, userRoles } = useUserRoles();
  const { emergencyCleanup } = useSessionRecovery();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [dbAdminStatus, setDbAdminStatus] = useState<boolean | null>(null);

  const handleDirectAdminCheck = async () => {
    if (!user) return;
    
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.rpc('is_admin', { user_id: user.id });
      
      if (error) {
        console.error('Direct admin check error:', error);
        toast({
          title: "Database Check Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      
      setDbAdminStatus(data === true);
      
      toast({
        title: "Database Check Complete",
        description: `Database says you ${data ? 'ARE' : 'are NOT'} an admin`,
        variant: data ? "default" : "destructive"
      });
      
    } catch (err) {
      console.error('Direct admin check exception:', err);
      toast({
        title: "Check Failed",
        description: "Unable to verify admin status with database",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefreshAll = async () => {
    toast({
      title: "Refreshing...",
      description: "Forcing complete auth and role refresh"
    });
    
    try {
      await forceRefreshRoles();
      
      toast({
        title: "Refresh Complete", 
        description: "Roles have been refreshed"
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh role data",
        variant: "destructive"
      });
    }
  };

  const handleEmergencyCleanup = () => {
    toast({
      title: "Emergency Cleanup",
      description: "Clearing all sessions and reloading...",
      variant: "destructive"
    });
    
    emergencyCleanup();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Admin Access Recovery
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Current Status:
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={user ? "default" : "destructive"}>
              {user ? `User: ${user.email}` : "No User"}
            </Badge>
            <Badge variant={isAdmin ? "default" : "destructive"}>
              {isAdmin ? "Admin" : "Not Admin"}
            </Badge>
            {isSuperAdmin && (
              <Badge variant="default">Super Admin</Badge>
            )}
          </div>
          
          {userRoles.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mt-2">
                Roles: {userRoles.map(r => r.role).join(', ')}
              </p>
            </div>
          )}
          
          {dbAdminStatus !== null && (
            <Badge variant={dbAdminStatus ? "default" : "destructive"}>
              DB Check: {dbAdminStatus ? "Admin" : "Not Admin"}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleDirectAdminCheck}
            disabled={!user || isVerifying}
            variant="outline"
            className="w-full"
          >
            <Database className="h-4 w-4 mr-2" />
            {isVerifying ? "Checking..." : "Check Database"}
          </Button>
          
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Auth & Roles
          </Button>
          
          <Button
            onClick={handleEmergencyCleanup}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Emergency Reset
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>If you continue having issues:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Try "Refresh Auth & Roles" first</li>
            <li>Check database status with "Check Database"</li>
            <li>Use "Emergency Reset" as last resort</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};