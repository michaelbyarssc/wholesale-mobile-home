import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MapPin, Truck, Camera, Clock, Navigation, Battery, 
  CheckCircle2, AlertTriangle, Phone, FileText, Settings,
  Calendar, Upload, Download, Wifi, WifiOff
} from 'lucide-react';
import SignaturePad from 'signature_pad';

interface EnhancedDriverMobileAppProps {
  driverProfile: any;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
}

interface DeliveryPiece {
  id: string;
  piece_number: number;
  vin_number: string;
  mso_number: string;
  piece_type: string;
  status: string;
}

export const EnhancedDriverMobileApp = ({ driverProfile }: EnhancedDriverMobileAppProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // GPS Tracking with offline capabilities
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: GPSLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
          battery_level: batteryLevel,
        };
        
        setCurrentLocation(location);
        updateGPSLocation(location);
      },
      (error) => {
        console.error('GPS Error:', error);
        toast({
          title: "GPS Warning",
          description: "Unable to get precise location. Using approximate location.",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 120000, // 2 minutes as specified
      }
    );

    setTrackingEnabled(true);
    localStorage.setItem('gps_watch_id', watchId.toString());
  };

  const stopTracking = () => {
    const watchId = localStorage.getItem('gps_watch_id');
    if (watchId) {
      navigator.geolocation.clearWatch(parseInt(watchId));
      localStorage.removeItem('gps_watch_id');
    }
    setTrackingEnabled(false);
  };

  // Enhanced GPS location update with offline support
  const updateGPSLocation = async (location: GPSLocation) => {
    const gpsData = {
      driver_id: driverProfile.id,
      delivery_id: activeDeliveries?.[0]?.deliveries?.id,
      ...location,
      recorded_at: new Date().toISOString(),
      is_offline: !isOnline,
    };

    if (isOnline) {
      try {
        await supabase.from('gps_tracking_offline').insert(gpsData);
        
        // Process any offline queue
        if (offlineQueue.length > 0) {
          await processOfflineQueue();
        }
      } catch (error) {
        console.error('Error updating GPS location:', error);
        queueOfflineData(gpsData);
      }
    } else {
      queueOfflineData(gpsData);
    }
  };

  const queueOfflineData = (data: any) => {
    const queue = [...offlineQueue, data];
    // Limit offline storage to 5GB as specified
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB in bytes
    let currentSize = new Blob([JSON.stringify(queue)]).size;
    
    while (currentSize > maxSize && queue.length > 0) {
      queue.shift(); // Remove oldest entries
      currentSize = new Blob([JSON.stringify(queue)]).size;
    }
    
    setOfflineQueue(queue);
    localStorage.setItem('offline_gps_queue', JSON.stringify(queue));
  };

  const processOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;

    try {
      await supabase.from('gps_tracking_offline').insert(offlineQueue);
      setOfflineQueue([]);
      localStorage.removeItem('offline_gps_queue');
      toast({
        title: "Sync Complete",
        description: `${offlineQueue.length} offline GPS records synced`,
      });
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  };

  // Fetch active delivery assignments with full schedule
  const { data: activeDeliveries, isLoading } = useQuery({
    queryKey: ['driver-assignments', driverProfile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          deliveries!inner (
            *,
            orders!inner (
              order_number,
              customer_name,
              customer_email,
              customer_phone,
              total_value
            ),
            delivery_pieces (
              id,
              piece_number,
              vin_number,
              mso_number,
              piece_type,
              status
            ),
            mobile_homes (
              manufacturer,
              model,
              width_feet,
              length_feet
            ),
            factories (
              name,
              contact_email,
              contact_phone
            )
          )
        `)
        .eq('driver_id', driverProfile.id)
        .eq('active', true)
        .order('assigned_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Enhanced delivery status update
  const statusUpdateMutation = useMutation({
    mutationFn: async ({ deliveryId, newStatus, notes }: { 
      deliveryId: string; 
      newStatus: 'pending_payment' | 'scheduled' | 'in_transit' | 'completed' | 'delayed' | 'cancelled'; 
      notes?: string; 
    }) => {
      // Update delivery status
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (deliveryError) throw deliveryError;

      // Insert status history
      const { error: historyError } = await supabase
        .from('delivery_status_history')
        .insert({
          delivery_id: deliveryId,
          new_status: newStatus,
          notes: notes || `Status updated by driver ${driverProfile.full_name}`,
          changed_by: driverProfile.user_id,
        });

      if (historyError) throw historyError;

      return { deliveryId, newStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      toast({
        title: "Status Updated",
        description: `Delivery ${data.deliveryId} status updated to ${data.newStatus}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update delivery status",
        variant: "destructive",
      });
    },
  });

  // Photo upload with GPS coordinates
  const handlePhotoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    category: string,
    deliveryId: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileName = `${deliveryId}_${category}_${Date.now()}.${file.name.split('.').pop()}`;
      
      const { error: uploadError } = await supabase.storage
        .from('mobile-home-images')
        .upload(`delivery-photos/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('mobile-home-images')
        .getPublicUrl(`delivery-photos/${fileName}`);

      // Insert photo record with GPS coordinates and timestamp
      const { error: photoError } = await supabase
        .from('delivery_photos')
        .insert({
          delivery_id: deliveryId,
          driver_id: driverProfile.id,
          photo_type: category,
          photo_url: publicUrl,
          latitude: currentLocation?.latitude,
          longitude: currentLocation?.longitude,
          taken_at: new Date().toISOString(),
          caption: `${category} photo taken by ${driverProfile.full_name}`,
        });

      if (photoError) throw photoError;

      toast({
        title: "Photo Uploaded",
        description: `${category} photo uploaded successfully`,
      });

    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Digital signature capture
  const initializeSignaturePad = () => {
    if (canvasRef.current && !signaturePadRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });
    }
  };

  const saveSignature = async (deliveryId: string) => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      toast({
        title: "Signature Required",
        description: "Please provide a signature before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      const signatureData = signaturePadRef.current.toDataURL();
      
      // Convert to blob and upload
      const response = await fetch(signatureData);
      const blob = await response.blob();
      
      const fileName = `signature_${deliveryId}_${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('mobile-home-images')
        .upload(`delivery-signatures/${fileName}`, blob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('mobile-home-images')
        .getPublicUrl(`delivery-signatures/${fileName}`);

      // Update delivery with signature
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({
          customer_signature_url: publicUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      if (updateError) throw updateError;

      toast({
        title: "Signature Saved",
        description: "Customer signature captured successfully",
      });

    } catch (error: any) {
      console.error('Signature save error:', error);
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Connection Restored",
        description: "Syncing offline data...",
      });
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "GPS data will be stored locally until connection is restored",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineQueue]);

  // Load offline queue on startup
  useEffect(() => {
    const savedQueue = localStorage.getItem('offline_gps_queue');
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }
  }, []);

  // Monitor battery level
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  // Initialize signature pad when component mounts
  useEffect(() => {
    initializeSignaturePad();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Loading driver interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header with connection status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Driver Portal - {driverProfile.full_name}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Badge variant="default" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  Online
                </Badge>
              ) : (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Offline
                </Badge>
              )}
              {batteryLevel && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Battery className="h-3 w-3" />
                  {batteryLevel}%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* GPS Tracking Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            GPS Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={startTracking} 
              disabled={trackingEnabled}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              {trackingEnabled ? 'Tracking Active' : 'Start Tracking'}
            </Button>
            <Button 
              onClick={stopTracking} 
              disabled={!trackingEnabled}
              variant="outline"
            >
              Stop Tracking
            </Button>
          </div>
          
          {currentLocation && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Current Location:</p>
              <p className="font-mono text-sm">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </p>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>Accuracy: ±{currentLocation.accuracy?.toFixed(0)}m</span>
                <span>Speed: {currentLocation.speed?.toFixed(0)} mph</span>
              </div>
            </div>
          )}

          {offlineQueue.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                {offlineQueue.length} GPS records queued for sync
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Schedule View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Schedule ({activeDeliveries?.length || 0} active deliveries)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeDeliveries?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No active delivery assignments
            </p>
          ) : (
            <div className="space-y-4">
              {activeDeliveries?.map((assignment) => {
                const delivery = assignment.deliveries;
                const order = Array.isArray(delivery.orders) ? delivery.orders[0] : delivery.orders;
                
                return (
                  <Card key={assignment.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{order.order_number}</h3>
                          <p className="text-sm text-muted-foreground">
                            {order.customer_name}
                          </p>
                        </div>
                        <Badge variant={
                          delivery.status === 'completed' ? 'default' :
                          delivery.status === 'in_transit' ? 'secondary' :
                          delivery.status === 'delayed' ? 'destructive' :
                          'outline'
                        }>
                          {delivery.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Delivery Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Pickup:</strong> {delivery.pickup_address}</p>
                          <p><strong>Delivery:</strong> {delivery.delivery_address}</p>
                        </div>
                        <div>
                          <p><strong>Mobile Home:</strong> {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}</p>
                          <p><strong>Phone:</strong> {order.customer_phone}</p>
                        </div>
                      </div>

                      {/* Delivery Pieces */}
                      {delivery.delivery_pieces?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Delivery Pieces:</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {delivery.delivery_pieces.map((piece: DeliveryPiece) => (
                              <div key={piece.id} className="bg-muted p-2 rounded text-sm">
                                <div className="flex justify-between items-center">
                                  <span>
                                    Piece {piece.piece_number} ({piece.piece_type})
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {piece.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  VIN: {piece.vin_number} | MSO: {piece.mso_number}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {delivery.status === 'scheduled' && (
                          <Button
                            size="sm"
                            onClick={() => statusUpdateMutation.mutate({
                              deliveryId: delivery.id,
                              newStatus: 'in_transit',
                              notes: 'Delivery started by driver'
                            })}
                          >
                            Start Delivery
                          </Button>
                        )}
                        
                        {delivery.status === 'in_transit' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => statusUpdateMutation.mutate({
                                deliveryId: delivery.id,
                                newStatus: 'completed',
                                notes: 'Delivery completed by driver'
                              })}
                            >
                              Complete Delivery
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => statusUpdateMutation.mutate({
                                deliveryId: delivery.id,
                                newStatus: 'delayed',
                                notes: 'Delivery delayed - reported by driver'
                              })}
                            >
                              Report Delay
                            </Button>
                          </>
                        )}

                        {/* Photo Upload Buttons */}
                        <div className="flex gap-1">
                          <label className="cursor-pointer">
                            <Button size="sm" variant="outline" asChild>
                              <span>
                                <Camera className="h-3 w-3 mr-1" />
                                Pickup
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => handlePhotoUpload(e, 'pickup', delivery.id)}
                            />
                          </label>
                          
                          <label className="cursor-pointer">
                            <Button size="sm" variant="outline" asChild>
                              <span>
                                <Camera className="h-3 w-3 mr-1" />
                                Delivery
                              </span>
                            </Button>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => handlePhotoUpload(e, 'delivery', delivery.id)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Digital Signature Section */}
                      {delivery.status === 'in_transit' && (
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-2">Customer Signature:</h4>
                          <div className="border border-gray-300 rounded">
                            <canvas
                              ref={canvasRef}
                              width={400}
                              height={200}
                              className="w-full max-w-md border rounded"
                            />
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => signaturePadRef.current?.clear()}
                            >
                              Clear
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveSignature(delivery.id)}
                            >
                              Save Signature
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};