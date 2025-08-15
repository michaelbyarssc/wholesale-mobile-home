
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompatibleAuth } from '@/hooks/useCompatibleAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, Calendar, Clock, Truck, MapPin, User, Phone, Mail, MessageSquare, Settings, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewDeliveryScheduling } from '@/components/delivery/NewDeliveryScheduling';
import { DeliveryScheduler } from '@/components/delivery/DeliveryScheduler';
import { DeliveryScheduling } from '@/components/delivery/DeliveryScheduling';
import { EnhancedCustomerNotifications } from '@/components/delivery/EnhancedCustomerNotifications';
import { ETACalculator } from '@/components/delivery/ETACalculator';
import { AutomatedStatusUpdates } from '@/components/delivery/AutomatedStatusUpdates';

const DeliveryManagement = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();
  const { user, session } = useCompatibleAuth();
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

      // Now try to load deliveries with detailed error logging and schedule information
      const { data, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          mobile_homes (
            id,
            model,
            manufacturer,
            display_name,
            mobile_home_factories (
              factories (
                id,
                name,
                street_address,
                city,
                state,
                zip_code
              )
            )
          ),
          factories (
            id,
            name,
            street_address,
            city,
            state,
            zip_code
          ),
          delivery_schedules (
            id,
            pickup_scheduled_date,
            pickup_scheduled_time_start,
            pickup_scheduled_time_end,
            pickup_driver_id,
            pickup_timezone,
            delivery_scheduled_date,
            delivery_scheduled_time_start,
            delivery_scheduled_time_end,
            delivery_driver_id,
            delivery_timezone,
            pickup_driver:drivers!pickup_driver_id (
              id,
              first_name,
              last_name,
              phone,
              email
            ),
            delivery_driver:drivers!delivery_driver_id (
              id,
              first_name,
              last_name,
              phone,
              email
            )
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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: any; label: string }> = {
      'scheduled': { variant: 'default', label: 'Scheduled' },
      'pickup_scheduled': { variant: 'secondary', label: 'Pickup Scheduled' },
      'pickup_completed': { variant: 'default', label: 'Pickup Complete' },
      'delivery_scheduled': { variant: 'secondary', label: 'Delivery Scheduled' },
      'in_transit': { variant: 'default', label: 'In Transit' },
      'delivered': { variant: 'default', label: 'Delivered' },
      'completed': { variant: 'default', label: 'Completed' },
      'cancelled': { variant: 'destructive', label: 'Cancelled' },
      'delayed': { variant: 'destructive', label: 'Delayed' },
    };
    
    const config = statusMap[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getFactoryAddress = (delivery: any) => {
    // First try to get factory info from the mobile_home_factories relationship
    const mobileHomeFactory = delivery.mobile_homes?.mobile_home_factories?.[0]?.factories;
    if (mobileHomeFactory) {
      return {
        name: mobileHomeFactory.name,
        address: `${mobileHomeFactory.street_address}, ${mobileHomeFactory.city}, ${mobileHomeFactory.state} ${mobileHomeFactory.zip_code}`
      };
    }
    
    // Fallback to direct factory relationship
    if (delivery.factories) {
      return {
        name: delivery.factories.name,
        address: `${delivery.factories.street_address}, ${delivery.factories.city}, ${delivery.factories.state} ${delivery.factories.zip_code}`
      };
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Delivery Management</h2>
          <p className="text-muted-foreground">
            Manage deliveries, schedule pickup and delivery dates, and assign drivers
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule">Schedule Deliveries</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="list">All Deliveries</TabsTrigger>
          <TabsTrigger value="quick">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <NewDeliveryScheduling />
        </TabsContent>

        <TabsContent value="calendar">
          <DeliveryScheduling />
        </TabsContent>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>All Deliveries</CardTitle>
              <p className="text-sm text-muted-foreground">
                {deliveries.length > 0 ? `Found ${deliveries.length} deliveries` : 'No deliveries found'}
              </p>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  No deliveries found.
                </div>
              ) : (
                <div className="grid gap-4">
                  {deliveries.map((delivery: any) => {
                    const schedule = delivery.delivery_schedules?.[0];
                    const factoryInfo = getFactoryAddress(delivery);
                    
                    return (
                      <Card key={delivery.id} className="p-4">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">
                                  {delivery.delivery_number || 'No delivery number'}
                                </h3>
                                {getStatusBadge(delivery.status || 'unknown')}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Customer: {delivery.customer_name || 'Unknown'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {delivery.mobile_home_type?.replace(/_/g, ' ') || 'Unknown type'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {delivery.customer_email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{delivery.customer_email}</span>
                              </div>
                            )}
                            {delivery.customer_phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span>{delivery.customer_phone}</span>
                              </div>
                            )}
                            {factoryInfo && (
                              <div className="flex items-center gap-2 text-sm">
                                <Truck className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">
                                  {factoryInfo.name} - {factoryInfo.address}
                                </span>
                              </div>
                            )}
                            {delivery.delivery_address && (
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="truncate">{delivery.delivery_address}</span>
                              </div>
                            )}
                          </div>

                          {/* Schedule Information - Enhanced Display */}
                          {schedule && (
                            <div className="mt-6 pt-4 border-t">
                              <h4 className="font-medium text-sm mb-3">Schedule Details</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Pickup Schedule */}
                                {schedule.pickup_scheduled_date && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Truck className="h-4 w-4 text-blue-500" />
                                      <h5 className="font-medium text-sm">Factory Pickup</h5>
                                    </div>
                                    <div className="pl-6 space-y-2">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        <span>{new Date(schedule.pickup_scheduled_date).toLocaleDateString()}</span>
                                      </div>
                                      {schedule.pickup_scheduled_time_start && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span>{schedule.pickup_scheduled_time_start} - {schedule.pickup_scheduled_time_end}</span>
                                        </div>
                                      )}
                                      {schedule.pickup_driver && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <User className="h-3 w-3 text-muted-foreground" />
                                          <span>
                                            {schedule.pickup_driver.first_name} {schedule.pickup_driver.last_name}
                                          </span>
                                        </div>
                                      )}
                                      {schedule.pickup_timezone && (
                                        <div className="text-xs text-muted-foreground">
                                          Timezone: {schedule.pickup_timezone}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Delivery Schedule */}
                                {schedule.delivery_scheduled_date && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-green-500" />
                                      <h5 className="font-medium text-sm">Customer Delivery</h5>
                                    </div>
                                    <div className="pl-6 space-y-2">
                                      <div className="flex items-center gap-2 text-sm">
                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                        <span>{new Date(schedule.delivery_scheduled_date).toLocaleDateString()}</span>
                                      </div>
                                      {schedule.delivery_scheduled_time_start && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <Clock className="h-3 w-3 text-muted-foreground" />
                                          <span>{schedule.delivery_scheduled_time_start} - {schedule.delivery_scheduled_time_end}</span>
                                        </div>
                                      )}
                                      {schedule.delivery_driver && (
                                        <div className="flex items-center gap-2 text-sm">
                                          <User className="h-3 w-3 text-muted-foreground" />
                                          <span>
                                            {schedule.delivery_driver.first_name} {schedule.delivery_driver.last_name}
                                          </span>
                                        </div>
                                      )}
                                      {schedule.delivery_timezone && (
                                        <div className="text-xs text-muted-foreground">
                                          Timezone: {schedule.delivery_timezone}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Legacy Schedule Display for backward compatibility */}
                          {(delivery.scheduled_pickup_date || delivery.scheduled_delivery_date) && !schedule && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                              {delivery.scheduled_pickup_date && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>Pickup: {new Date(delivery.scheduled_pickup_date).toLocaleDateString()}</span>
                                  {factoryInfo && (
                                    <span className="text-muted-foreground">
                                      from {factoryInfo.name}, {factoryInfo.address}
                                    </span>
                                  )}
                                </div>
                              )}
                              {delivery.scheduled_delivery_date && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>Delivery: {new Date(delivery.scheduled_delivery_date).toLocaleDateString()}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {debugInfo && debugInfo.success && (
                <div className="mt-4 p-2 bg-green-50 text-green-800 rounded text-xs">
                  ✅ Successfully loaded {debugInfo.deliveryCount} deliveries for {debugInfo.user} (roles: {debugInfo.roles.join(', ')})
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick">
          <DeliveryScheduler />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeliveryManagement;
