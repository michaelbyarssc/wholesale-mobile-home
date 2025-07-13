import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  MapPin, 
  Camera, 
  FileText,
  Route,
  Package,
  CheckCircle,
  Timer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DeliveryDetailsViewProps {
  delivery: any;
}

const DeliveryDetailsView: React.FC<DeliveryDetailsViewProps> = ({ delivery }) => {
  // Fetch delivery photos for this specific delivery
  const { data: deliveryPhotos = [] } = useQuery({
    queryKey: ['delivery-details-photos', delivery.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_photos')
        .select('*')
        .eq('delivery_id', delivery.id)
        .order('taken_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch GPS tracking data for this delivery
  const { data: gpsData = [] } = useQuery({
    queryKey: ['delivery-gps-tracking', delivery.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_gps_tracking')
        .select('*')
        .eq('delivery_id', delivery.id)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch delivery status history
  const { data: statusHistory = [] } = useQuery({
    queryKey: ['delivery-status-history', delivery.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_status_history')
        .select('*')
        .eq('delivery_id', delivery.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const pickupPhotos = deliveryPhotos.filter(p => p.photo_type === 'pickup');
  const deliveryPhotosList = deliveryPhotos.filter(p => p.photo_type === 'delivery');
  const repairPhotos = deliveryPhotos.filter(p => p.photo_type === 'issue');

  const startTime = statusHistory.find(s => s.new_status === 'factory_pickup_in_progress')?.created_at;
  const completionTime = delivery.completed_at;

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Delivery Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Mobile Home:</p>
            <p className="text-sm text-muted-foreground">
              {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Customer:</p>
            <p className="text-sm text-muted-foreground">{delivery.customer_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Pickup Address:</p>
            <p className="text-sm text-muted-foreground">{delivery.pickup_address}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Delivery Address:</p>
            <p className="text-sm text-muted-foreground">{delivery.delivery_address}</p>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Delivery Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {startTime && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Delivery Started</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(startTime).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            
            {completionTime && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium">Delivery Completed</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(completionTime).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {statusHistory.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Status History:</p>
                <div className="space-y-1">
                  {statusHistory.map((status, index) => (
                    <div key={index} className="flex justify-between items-center text-xs">
                      <span className="capitalize">
                        {status.new_status?.replace('_', ' ')}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(status.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Delivery Photos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pickup" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pickup">
                Pickup Photos ({pickupPhotos.length})
              </TabsTrigger>
              <TabsTrigger value="delivery">
                Delivery Photos ({deliveryPhotosList.length})
              </TabsTrigger>
              <TabsTrigger value="repairs">
                Repairs ({repairPhotos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pickup" className="mt-4">
              {pickupPhotos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No pickup photos taken
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {pickupPhotos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || 'Pickup photo'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {photo.caption && (
                        <p className="text-xs text-muted-foreground italic">
                          "{photo.caption}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(photo.taken_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="delivery" className="mt-4">
              {deliveryPhotosList.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No delivery photos taken
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {deliveryPhotosList.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || 'Delivery photo'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {photo.caption && (
                        <p className="text-xs text-muted-foreground italic">
                          "{photo.caption}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(photo.taken_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="repairs" className="mt-4">
              {repairPhotos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No repair issues documented
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {repairPhotos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={photo.photo_url}
                          alt={photo.caption || 'Repair photo'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {photo.caption && (
                        <p className="text-xs text-muted-foreground italic">
                          "{photo.caption}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(photo.taken_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* GPS Route Section */}
      {gpsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              GPS Route Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">Total GPS Points:</span> {gpsData.length}
              </p>
              <p className="text-sm">
                <span className="font-medium">Route Start:</span>{' '}
                {gpsData[0] && new Date(gpsData[0].timestamp).toLocaleString()}
              </p>
              <p className="text-sm">
                <span className="font-medium">Route End:</span>{' '}
                {gpsData[gpsData.length - 1] && new Date(gpsData[gpsData.length - 1].timestamp).toLocaleString()}
              </p>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Interactive map with delivery route would be displayed here using the GPS tracking data.
                  This requires Mapbox integration for full route visualization.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Section */}
      {(delivery.special_instructions || delivery.completion_notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Delivery Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {delivery.special_instructions && (
              <div>
                <p className="text-sm font-medium">Special Instructions:</p>
                <p className="text-sm text-muted-foreground">{delivery.special_instructions}</p>
              </div>
            )}
            {delivery.completion_notes && (
              <div>
                <p className="text-sm font-medium">Completion Notes:</p>
                <p className="text-sm text-muted-foreground">{delivery.completion_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DeliveryDetailsView;