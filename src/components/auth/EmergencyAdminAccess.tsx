import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const EmergencyAdminAccess: React.FC = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleEmergencyAdminAccess = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in first before accessing admin panel.",
        variant: "destructive"
      });
      return;
    }

    setChecking(true);
    console.log('🔧 Emergency admin access check initiated for:', user.email);

    try {
      // Direct database check using is_admin RPC
      const { data: isAdminResult, error: rpcError } = await supabase.rpc('is_admin', { 
        user_id: user.id 
      });

      if (rpcError) {
        console.error('🚨 RPC error:', rpcError);
        toast({
          title: "Admin Check Failed",
          description: `Database error: ${rpcError.message}`,
          variant: "destructive"
        });
        return;
      }

      if (isAdminResult === true) {
        console.log('✅ Emergency admin access confirmed for:', user.email);
        toast({
          title: "Admin Access Confirmed",
          description: "You have been granted emergency admin access. Redirecting...",
        });
        
        // Force navigate to admin with state reset
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      } else {
        console.log('❌ Admin access denied for:', user.email);
        toast({
          title: "Access Denied",
          description: "You do not have admin privileges in the database.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('🚨 Emergency admin access check failed:', error);
      toast({
        title: "Emergency Check Failed",
        description: "Unable to verify admin status. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setChecking(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Card className="fixed bottom-20 right-4 z-50 w-80 bg-card/95 backdrop-blur border-warning/50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-warning" />
          Emergency Admin Access
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground mb-3">
          Having trouble accessing the admin panel? Use this emergency bypass to check your admin status directly.
        </p>
        
        <div className="space-y-2">
          <div className="text-xs">
            <span className="text-muted-foreground">Signed in as:</span>
            <br />
            <span className="font-mono text-foreground">{user.email}</span>
          </div>
          
          <Button
            variant="outline"
            onClick={handleEmergencyAdminAccess}
            disabled={checking}
            className="w-full flex items-center gap-2 border-warning/50 hover:border-warning text-warning hover:text-warning"
            size="sm"
          >
            {checking ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b border-current" />
                Checking...
              </>
            ) : (
              <>
                <Key className="h-3 w-3" />
                Emergency Admin Access
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};