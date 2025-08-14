import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Route, Clock, ArrowDown, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MultiStopRoutingProps {
  driverId: string;
}

interface DeliveryStop {
  id: string;
  delivery_number: string;
  customer_name: string;
  delivery_address: string;
  scheduled_delivery_date: string;
  status: string;
  mobile_home_type: string;
  priority: number;
}

export const MultiStopRouting: React.FC<MultiStopRoutingProps> = ({ driverId }) => {
  const { toast } = useToast();
  const [optimizing, setOptimizing] = useState(false);

  const { data: deliveryStops, isLoading, refetch } = useQuery({
    queryKey: ['driver-deliveries', driverId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          delivery_number,
          customer_name,
          delivery_address,
          scheduled_delivery_date,
          status,
          mobile_home_type,
          delivery_assignments!inner(driver_id, active)
        `)
        .eq('delivery_assignments.driver_id', driverId)
        .eq('delivery_assignments.active', true)
        .in('status', ['scheduled', 'delivery_in_progress', 'in_transit'])
        .order('scheduled_delivery_date', { ascending: true });

      if (error) throw error;
      
      // Add priority based on status and date
      return data.map((delivery, index) => ({
        ...delivery,
        priority: delivery.status === 'delivery_in_progress' ? 1 : 
                  delivery.status === 'in_transit' ? 2 : 
                  3 + index
      })) as DeliveryStop[];
    },
  });

  const optimizeRouteMutation = useMutation({
    mutationFn: async (stops: DeliveryStop[]) => {
      // This would integrate with Google Maps API for multi-stop optimization
      const response = await supabase.functions.invoke('optimize-multi-stop-route', {
        body: { 
          driverId,
          stops: stops.map(stop => ({
            id: stop.id,
            address: stop.delivery_address,
            priority: stop.priority,
            timeWindow: stop.scheduled_delivery_date
          }))
        }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Route Optimized",
        description: "Multi-stop route has been optimized for efficiency.",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize multi-stop route",
        variant: "destructive",
      });
    },
  });

  const handleOptimizeRoute = async () => {
    if (!deliveryStops || deliveryStops.length === 0) return;
    
    setOptimizing(true);
    try {
      await optimizeRouteMutation.mutateAsync(deliveryStops);
    } finally {
      setOptimizing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivery_in_progress':
        return 'default';
      case 'in_transit':
        return 'secondary';
      case 'scheduled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getTotalEstimatedTime = () => {
    if (!deliveryStops) return 0;
    // Rough estimate: 30 mins per single wide, 45 mins per double wide, 60 mins per triple wide
    return deliveryStops.reduce((total, stop) => {
      const baseTime = stop.mobile_home_type === 'single_wide' ? 30 : 
                       stop.mobile_home_type === 'double_wide' ? 45 : 60;
      return total + baseTime;
    }, 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Multi-Stop Routing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Route className="h-5 w-5" />
          Multi-Stop Routing
        </CardTitle>
        <CardDescription>
          Optimize route for multiple delivery stops
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!deliveryStops || deliveryStops.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No active deliveries assigned to this driver.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Route Summary */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Stops</div>
                <div className="text-2xl font-bold">{deliveryStops.length}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Est. Time</div>
                <div className="text-2xl font-bold">
                  {Math.round(getTotalEstimatedTime() / 60)}h {getTotalEstimatedTime() % 60}m
                </div>
              </div>
            </div>

            {/* Delivery Stops */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Delivery Stops</h4>
                <Button 
                  size="sm" 
                  onClick={handleOptimizeRoute}
                  disabled={optimizing || optimizeRouteMutation.isPending}
                >
                  {optimizing || optimizeRouteMutation.isPending ? 'Optimizing...' : 'Optimize Route'}
                </Button>
              </div>

              {deliveryStops
                .sort((a, b) => a.priority - b.priority)
                .map((stop, index) => (
                <div key={stop.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    {index < deliveryStops.length - 1 && (
                      <ArrowDown className="h-4 w-4 text-muted-foreground mt-2" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{stop.delivery_number}</span>
                        <Badge variant={getStatusColor(stop.status)}>
                          {stop.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Badge variant="outline">
                        {stop.mobile_home_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="font-medium">{stop.customer_name}</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {stop.delivery_address}
                      </div>
                      {stop.scheduled_delivery_date && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(stop.scheduled_delivery_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Button */}
            <Button className="w-full" variant="outline">
              <Navigation className="h-4 w-4 mr-2" />
              Start Navigation
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};