// Simplified performance monitoring dashboard
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  MapPin,
  Camera,
  Signal,
  Truck
} from 'lucide-react';

interface DeliveryMetrics {
  id: string;
  status: string;
  created_at: string;
  gps_count: number;
  photo_count: number;
}

export const DeliveryPerformanceDashboard = () => {
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['delivery-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          id,
          status,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as DeliveryMetrics[];
    },
    refetchInterval: 30000
  });

  const { data: gpsStats } = useQuery({
    queryKey: ['gps-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_gps_tracking')
        .select('delivery_id, accuracy_meters, meets_accuracy_requirement')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000
  });

  const { data: photoStats } = useQuery({
    queryKey: ['photo-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_photos')
        .select('delivery_id, photo_category');
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading performance metrics...</p>
        </CardContent>
      </Card>
    );
  }

  const activeDeliveries = deliveries?.filter(d => d.status !== 'delivered').length || 0;
  const totalGpsPoints = gpsStats?.length || 0;
  const avgAccuracy = gpsStats?.length ? 
    Math.round(gpsStats.reduce((acc, g) => acc + (g.accuracy_meters || 0), 0) / gpsStats.length) : 0;
  const totalPhotos = photoStats?.length || 0;

  const getStatusColor = (status: string) => {
    const colors = {
      'scheduled': 'gray',
      'factory_pickup_in_progress': 'blue',
      'in_transit': 'purple',
      'delivery_in_progress': 'orange',
      'delivered': 'green'
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Delivery Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Summary Cards */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Deliveries</p>
                    <p className="text-2xl font-bold">{activeDeliveries}</p>
                  </div>
                  <Truck className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">GPS Points</p>
                    <p className="text-2xl font-bold">{totalGpsPoints}</p>
                  </div>
                  <MapPin className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Accuracy</p>
                    <p className="text-2xl font-bold">{avgAccuracy}m</p>
                  </div>
                  <Signal className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Photos</p>
                    <p className="text-2xl font-bold">{totalPhotos}</p>
                  </div>
                  <Camera className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deliveries?.map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center gap-3">
                  <Badge variant={getStatusColor(delivery.status) as any}>
                    {delivery.status.replace(/_/g, ' ')}
                  </Badge>
                  <code className="text-xs text-muted-foreground">
                    {delivery.id.slice(0, 8)}...
                  </code>
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(delivery.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};