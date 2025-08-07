import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSimpleAuth } from '@/hooks/useSimpleAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const SimplifiedAuthDebug: React.FC = () => {
  const simpleAuth = useSimpleAuth();
  const userRoles = useUserRoles();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  const handleDirectAdminCheck = async () => {
    if (!simpleAuth.user) {
      toast({
        title: "No User",
        description: "Please sign in first.",
        variant: "destructive"
      });
      return;
    }

    setChecking(true);
    try {
      const { data: isAdminResult, error: rpcError } = await supabase.rpc('is_admin', { 
        user_id: simpleAuth.user.id 
      });

      if (rpcError) {
        console.error('Direct admin check error:', rpcError);
        toast({
          title: "Check Failed",
          description: `Database error: ${rpcError.message}`,
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Direct Database Check",
        description: `Admin status: ${isAdminResult ? 'TRUE' : 'FALSE'}`,
      });

      if (isAdminResult) {
        // Force navigate to admin
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      }
    } catch (error) {
      console.error('Direct admin check failed:', error);
      toast({
        title: "Check Failed",
        description: "Unable to check admin status.",
        variant: "destructive"
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 bg-card/95 backdrop-blur border-warning/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Auth Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="text-xs space-y-2">
          <div>
            <span className="text-muted-foreground">Simple Auth:</span>
            <div className="font-mono">
              User: {simpleAuth.user?.email || 'None'}
            </div>
            <div className="font-mono">
              Loading: {simpleAuth.isLoading ? 'Yes' : 'No'}
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground">User Roles Hook:</span>
            <div className="flex gap-1 mt-1">
              <Badge variant={userRoles.isAdmin ? "default" : "outline"} className="text-xs">
                Admin: {userRoles.isAdmin ? 'Yes' : 'No'}
              </Badge>
              <Badge variant={userRoles.isSuperAdmin ? "default" : "outline"} className="text-xs">
                Super: {userRoles.isSuperAdmin ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="font-mono text-xs">
              Loading: {userRoles.isLoading ? 'Yes' : 'No'}
            </div>
            {userRoles.error && (
              <div className="text-xs text-destructive">
                Error: {userRoles.error}
              </div>
            )}
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={handleDirectAdminCheck}
          disabled={checking || !simpleAuth.user}
          className="w-full"
          size="sm"
        >
          {checking ? 'Checking...' : 'Direct DB Admin Check'}
        </Button>
      </CardContent>
    </Card>
  );
};