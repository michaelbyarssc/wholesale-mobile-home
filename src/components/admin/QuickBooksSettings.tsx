import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Settings, ExternalLink } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const QuickBooksSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Get QuickBooks connection status
  const { data: settings } = useQuery({
    queryKey: ['quickbooks-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*')
        .in('setting_key', ['quickbooks_connected', 'quickbooks_company_name', 'quickbooks_realm_id']);
      
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data.forEach(setting => {
        settingsMap[setting.setting_key] = setting.setting_value;
      });
      
      return settingsMap;
    },
  });

  const isConnected = settings?.quickbooks_connected === 'true';
  const companyName = settings?.quickbooks_company_name || '';

  const connectToQuickBooks = () => {
    setIsConnecting(true);
    
    // QuickBooks OAuth URL - this would need to be configured with your app
    const clientId = 'YOUR_QUICKBOOKS_CLIENT_ID'; // This should come from environment
    const redirectUri = encodeURIComponent(`${window.location.origin}/admin`);
    const scope = encodeURIComponent('com.intuit.quickbooks.accounting');
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = `https://appcenter.intuit.com/connect/oauth2?` +
      `client_id=${clientId}&` +
      `scope=${scope}&` +
      `redirect_uri=${redirectUri}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `state=${state}`;
    
    // Store state for verification
    localStorage.setItem('qb_oauth_state', state);
    
    // Open QuickBooks OAuth in new window
    window.open(authUrl, 'quickbooks-auth', 'width=600,height=600');
    
    // Listen for OAuth callback
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'quickbooks-oauth-success') {
        setIsConnecting(false);
        queryClient.invalidateQueries({ queryKey: ['quickbooks-settings'] });
        toast({
          title: "Connected to QuickBooks",
          description: "Your QuickBooks account has been connected successfully.",
        });
        window.removeEventListener('message', handleMessage);
      } else if (event.data?.type === 'quickbooks-oauth-error') {
        setIsConnecting(false);
        toast({
          title: "Connection Failed",
          description: "Failed to connect to QuickBooks. Please try again.",
          variant: "destructive",
        });
        window.removeEventListener('message', handleMessage);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Cleanup after timeout
    setTimeout(() => {
      setIsConnecting(false);
      window.removeEventListener('message', handleMessage);
    }, 60000); // 1 minute timeout
  };

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      // Remove QuickBooks settings
      const { error } = await supabase
        .from('admin_settings')
        .delete()
        .in('setting_key', ['quickbooks_connected', 'quickbooks_company_name', 'quickbooks_realm_id']);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quickbooks-settings'] });
      toast({
        title: "Disconnected from QuickBooks",
        description: "Your QuickBooks account has been disconnected.",
      });
    },
    onError: (error) => {
      console.error('Disconnect error:', error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect from QuickBooks. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>QuickBooks Integration</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-orange-500" />
            )}
            <div>
              <p className="font-medium">
                {isConnected ? 'Connected to QuickBooks' : 'Not Connected'}
              </p>
              {isConnected && companyName && (
                <p className="text-sm text-muted-foreground">
                  Company: {companyName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Connection Actions */}
        <div className="space-y-4">
          {!isConnected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your QuickBooks Online account to automatically sync invoices and customer data.
              </p>
              <Button 
                onClick={connectToQuickBooks}
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  "Connecting..."
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect to QuickBooks
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your QuickBooks account is connected. Invoices will be automatically synced when created.
              </p>
              <Button 
                variant="outline"
                onClick={() => disconnectMutation.mutate()}
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect QuickBooks"}
              </Button>
            </div>
          )}
        </div>

        {/* Sync Settings */}
        {isConnected && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Sync Settings</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-sync">Auto-sync new invoices</Label>
                <Badge variant="outline">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="customer-sync">Sync customer data</Label>
                <Badge variant="outline">Enabled</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        {!isConnected && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">Setup Instructions</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Click "Connect to QuickBooks" above</li>
              <li>Sign in to your QuickBooks Online account</li>
              <li>Authorize the connection to sync data</li>
              <li>Return to this page to complete setup</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
};