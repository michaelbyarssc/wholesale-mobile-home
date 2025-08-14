
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle } from 'lucide-react';

const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();
  const { user, session } = useAuthUser();
  const { isAdmin, isSuperAdmin, userRoles } = useUserRoles();

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚚 Loading deliveries with debug info:', {
        user: user?.email,
        userId: user?.id,
        sessionUserId: session?.user?.id,
        isAdmin,
        isSuperAdmin,
        userRoles: userRoles.map(r => r.role)
      });

      // First, let's test a simple auth check
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      console.log('Auth check:', { authUser: authUser?.user?.email, authError });

      // Test if we can access user_roles table
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id);
      
      console.log('User roles check:', { roles, rolesError });

      // Test admin access function
      const { data: adminCheck, error: adminError } = await supabase
        .rpc('check_user_admin_access', { check_user_id: user?.id });
      
      console.log('Admin access function result:', { adminCheck, adminError });

      // Now try to load deliveries with detailed error logging
      const { data, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          mobile_homes (
            id,
            model,
            manufacturer,
            display_name
          )
        `)
        .order('created_at', { ascending: false });

      console.log('Deliveries query result:', { 
        data: data?.length, 
        error: deliveryError,
        errorDetails: deliveryError ? {
          code: deliveryError.code,
          message: deliveryError.message,
          details: deliveryError.details,
          hint: deliveryError.hint
        } : null
      });

      if (deliveryError) {
        console.error('Delivery loading error:', deliveryError);
        setError(`Failed to load deliveries: ${deliveryError.message}`);
        setDebugInfo({
          errorCode: deliveryError.code,
          errorMessage: deliveryError.message,
          errorDetails: deliveryError.details,
          hint: deliveryError.hint,
          user: user?.email,
          roles: userRoles.map(r => r.role)
        });
        return;
      }

      setDeliveries(data || []);
      setDebugInfo({
        success: true,
        deliveryCount: data?.length || 0,
        user: user?.email,
        roles: userRoles.map(r => r.role)
      });

    } catch (err: any) {
      console.error('Unexpected error loading deliveries:', err);
      setError(`Unexpected error: ${err.message}`);
      setDebugInfo({
        unexpectedError: err.message,
        user: user?.email,
        roles: userRoles.map(r => r.role)
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && userRoles.length > 0) {
      loadDeliveries();
    }
  }, [user, userRoles]);

  const handleRefresh = () => {
    loadDeliveries();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Delivery Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading deliveries...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Delivery Management - Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>

          {debugInfo && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Debug Information:</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}

          <Button onClick={handleRefresh} className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Delivery Management
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deliveries.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            No deliveries found.
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {deliveries.length} deliveries
            </p>
            {/* Add delivery list here when we get data loading working */}
            <div className="grid gap-4">
              {deliveries.map((delivery: any) => (
                <div key={delivery.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">
                        {delivery.delivery_number || 'No delivery number'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Customer: {delivery.customer_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Status: {delivery.status || 'Unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        ${delivery.total_delivery_cost || '0'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {debugInfo && debugInfo.success && (
          <div className="mt-4 p-2 bg-green-50 text-green-800 rounded text-xs">
            ✅ Successfully loaded {debugInfo.deliveryCount} deliveries for {debugInfo.user} (roles: {debugInfo.roles.join(', ')})
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryManagement;
