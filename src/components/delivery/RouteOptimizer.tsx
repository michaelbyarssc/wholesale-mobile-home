import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Route, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RouteOptimizerProps {
  deliveryId: string;
}

interface DeliveryRoute {
  id: string;
  delivery_id: string;
  waypoints: any[];
  optimized_route: any;
  total_distance_miles: number;
  estimated_duration_minutes: number;
  traffic_conditions: any;
  weather_conditions: any;
}

export const RouteOptimizer: React.FC<RouteOptimizerProps> = ({ deliveryId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [optimizing, setOptimizing] = useState(false);

  const { data: route, isLoading } = useQuery({
    queryKey: ['delivery-route', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_routes')
        .select('*')
        .eq('delivery_id', deliveryId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as DeliveryRoute;
    },
  });

  const optimizeRouteMutation = useMutation({
    mutationFn: async () => {
      // This would integrate with Google Maps API for route optimization
      const response = await supabase.functions.invoke('optimize-delivery-route', {
        body: { deliveryId }
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Route Optimized",
        description: "Delivery route has been optimized for efficiency.",
      });
      queryClient.invalidateQueries({ queryKey: ['delivery-route', deliveryId] });
    },
    onError: (error: any) => {
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize route",
        variant: "destructive",
      });
    },
  });

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    try {
      await optimizeRouteMutation.mutateAsync();
    } finally {
      setOptimizing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Route Optimizer
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
          Route Optimizer
        </CardTitle>
        <CardDescription>
          Optimize delivery routes for efficiency and cost savings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {route ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  Distance
                </div>
                <div className="text-2xl font-bold">
                  {route.total_distance_miles?.toFixed(1) || 'N/A'} mi
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Duration
                </div>
                <div className="text-2xl font-bold">
                  {route.estimated_duration_minutes ? `${Math.round(route.estimated_duration_minutes / 60)}h ${route.estimated_duration_minutes % 60}m` : 'N/A'}
                </div>
              </div>
            </div>

            {route.traffic_conditions && Object.keys(route.traffic_conditions).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Traffic Conditions</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(route.traffic_conditions).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {route.weather_conditions && Object.keys(route.weather_conditions).length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Weather Conditions</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(route.weather_conditions).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={handleOptimizeRoute} 
              disabled={optimizing || optimizeRouteMutation.isPending}
              className="w-full"
            >
              {optimizing || optimizeRouteMutation.isPending ? 'Optimizing...' : 'Re-optimize Route'}
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-5 w-5" />
              No route data available
            </div>
            <Button 
              onClick={handleOptimizeRoute} 
              disabled={optimizing || optimizeRouteMutation.isPending}
            >
              {optimizing || optimizeRouteMutation.isPending ? 'Creating Route...' : 'Create Optimized Route'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};