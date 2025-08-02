import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Truck,
  RefreshCw,
  AlertCircle
} from "lucide-react";

interface CustomerTrackingMapProps {
  trackingToken: string;
}

export const CustomerTrackingMap = ({ trackingToken }: CustomerTrackingMapProps) => {
  const [mapboxToken, setMapboxToken] = useState('');
  const [isLoadingToken, setIsLoadingToken] = useState(true);

  // Auto-fetch Mapbox token from Supabase secrets
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error) {
          console.error('Failed to fetch Mapbox token:', error);
          toast.error('Failed to load map configuration');
        } else if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchMapboxToken();
  }, []);

  // Get tracking data
  const { data: trackingData, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-tracking", trackingToken],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_tracking_sessions')
        .select(`
          *,
          orders!inner (
            *,
            deliveries (
              *,
              mobile_homes (manufacturer, model),
              delivery_gps_tracking (
                latitude,
                longitude,
                accuracy_meters,
                speed_mph,
                timestamp
              ),
              delivery_assignments (
                drivers (id)
              )
            )
          )
        `)
        .eq('session_token', trackingToken)
        .eq('active', true)
        .single();

      if (error) throw error;

      // Get latest GPS location
      if (data.orders.deliveries?.length > 0) {
        const delivery = data.orders.deliveries[0];
        const { data: latestGPS } = await supabase
          .from('delivery_gps_tracking')
          .select('*')
          .eq('delivery_id', delivery.id)
          .order('timestamp', { ascending: false })
          .limit(1)
          .single();

        return {
          ...data,
          latestGPS
        };
      }

      return data;
    },
    enabled: !!trackingToken,
    refetchInterval: 60000, // Refresh every 60 seconds
    retry: 3
  });

  // Real-time subscription for GPS updates
  useEffect(() => {
    if (!trackingData?.orders?.deliveries?.[0]?.id) return;

    const deliveryId = trackingData.orders.deliveries[0].id;
    
    const channel = supabase
      .channel('gps-tracking')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_gps_tracking',
          filter: `delivery_id=eq.${deliveryId}`
        },
        (payload) => {
          console.log('Real-time GPS update:', payload);
          refetch(); // Refresh tracking data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackingData?.orders?.deliveries?.[0]?.id, refetch]);

  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'bg-gray-500',
      'factory_pickup_in_progress': 'bg-blue-500',
      'factory_pickup_completed': 'bg-green-500',
      'in_transit': 'bg-purple-500',
      'delivery_in_progress': 'bg-orange-500',
      'delivered': 'bg-green-600',
      'delayed': 'bg-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  if (isLoadingToken) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading map configuration...</p>
        </CardContent>
      </Card>
    );
  }

  if (!mapboxToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Delivery Tracking Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Map Configuration Error</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Unable to load map configuration. Please contact support if this issue persists.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading tracking information...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load tracking information</p>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const delivery = trackingData?.orders?.deliveries?.[0];
  const driver = delivery?.delivery_assignments?.[0]?.drivers;

  return (
    <div className="space-y-4">
      {/* Delivery Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Delivery Tracking
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(delivery?.status || '')}`} />
                <span className="text-sm">
                  {delivery?.status?.replace(/_/g, ' ')?.toUpperCase() || 'Unknown'}
                </span>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Driver</Label>
              <p className="text-sm mt-1">{driver?.id || 'Not assigned'}</p>
            </div>
            
            <div>
              <Label className="text-sm font-medium">Mobile Home</Label>
              <p className="text-sm mt-1">
                {delivery?.mobile_homes?.manufacturer} {delivery?.mobile_homes?.model}
              </p>
            </div>
            
            {(trackingData as any)?.latestGPS && (
              <>
                <div>
                  <Label className="text-sm font-medium">Last Update</Label>
                  <p className="text-sm mt-1">
                    {new Date((trackingData as any).latestGPS.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Speed</Label>
                  <p className="text-sm mt-1">
                    {(trackingData as any).latestGPS.speed_mph 
                      ? `${(trackingData as any).latestGPS.speed_mph.toFixed(1)} mph`
                      : 'Stationary'
                    }
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">GPS Accuracy</Label>
                  <p className="text-sm mt-1">
                    ±{(trackingData as any).latestGPS.accuracy_meters}m
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Map placeholder - would show Mapbox map with token */}
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Real-time map tracking will appear here with Mapbox integration
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Updates every 60 seconds automatically
          </p>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full" />
              <span>Pickup Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full" />
              <span>Driver Current Location</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full" />
              <span>Delivery Location</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};