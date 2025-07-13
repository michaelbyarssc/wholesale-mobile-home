import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  MapPin, 
  Clock, 
  Phone, 
  Camera, 
  Navigation,
  Truck,
  CheckCircle,
  AlertCircle,
  Upload,
  Play,
  Square,
  LogOut,
  User,
  Package,
  Route,
  Timer
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DriverPortal = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [driver, setDriver] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/driver-login');
        return;
      }
      setUser(session.user);

      // Check if user has super_admin role
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      const isSuperAdmin = userRoles?.some(role => role.role === 'super_admin');

      if (isSuperAdmin) {
        // Super admin can access without driver profile
        setDriver({ 
          id: 'super_admin', 
          first_name: 'Super', 
          last_name: 'Admin',
          user_id: session.user.id,
          is_super_admin: true 
        });
        return;
      }

      // Get driver profile for regular drivers
      const { data: driverData } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (!driverData) {
        toast({
          title: "Access Denied",
          description: "You don't have driver access.",
          variant: "destructive"
        });
        navigate('/auth');
        return;
      }
      
      setDriver(driverData);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate('/driver-login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Get current position and start tracking
  useEffect(() => {
    if (navigator.geolocation && driver?.id) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [driver]);

  // Fetch assigned deliveries
  const { data: activeDeliveries = [] } = useQuery({
    queryKey: ['driver-active-deliveries', driver?.id],
    queryFn: async () => {
      if (!driver?.id) return [];
      
      if (driver.is_super_admin) {
        // Super admin sees all active deliveries
        const { data, error } = await supabase
          .from('deliveries')
          .select(`
            *,
            mobile_homes (manufacturer, model)
          `)
          .in('status', ['scheduled', 'factory_pickup_scheduled', 'factory_pickup_in_progress', 'factory_pickup_completed', 'in_transit', 'delivery_in_progress']);
        
        if (error) throw error;
        // Format to match the assignment structure expected by the UI
        return (data || []).map(delivery => ({
          id: `super_admin_${delivery.id}`,
          deliveries: delivery,
          driver_id: driver.id,
          active: true
        }));
      } else {
        // Regular drivers see only their assigned deliveries
        const { data, error } = await supabase
          .from('delivery_assignments')
          .select(`
            *,
            deliveries (
              *,
              mobile_homes (manufacturer, model)
            )
          `)
          .eq('driver_id', driver.id)
          .eq('active', true)
          .in('deliveries.status', ['scheduled', 'factory_pickup_scheduled', 'factory_pickup_in_progress', 'factory_pickup_completed', 'in_transit', 'delivery_in_progress']);
        
        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!driver?.id,
  });

      // Fetch delivery photos
      const { data: deliveryPhotos = [] } = useQuery({
        queryKey: ['driver-delivery-photos', driver?.id],
        queryFn: async () => {
          if (!driver?.id) return [];
          
          if (driver.is_super_admin) {
            // Super admin sees all photos
            const { data, error } = await supabase
              .from('delivery_photos')
              .select(`
                *,
                deliveries (
                  delivery_number,
                  customer_name,
                  mobile_homes (manufacturer, model)
                )
              `)
              .order('taken_at', { ascending: false })
              .limit(50);
            
            if (error) throw error;
            return data || [];
          } else {
            // Regular drivers see only their photos
            const { data, error } = await supabase
              .from('delivery_photos')
              .select(`
                *,
                deliveries (
                  delivery_number,
                  customer_name,
                  mobile_homes (manufacturer, model)
                )
              `)
              .eq('driver_id', driver.id)
              .order('taken_at', { ascending: false })
              .limit(50);
            
            if (error) throw error;
            return data || [];
          }
        },
        enabled: !!driver?.id,
      });

      // Fetch completed deliveries
      const { data: completedDeliveries = [] } = useQuery({
    queryKey: ['driver-completed-deliveries', driver?.id],
    queryFn: async () => {
      if (!driver?.id) return [];
      
      if (driver.is_super_admin) {
        // Super admin sees all completed deliveries
        const { data, error } = await supabase
          .from('deliveries')
          .select(`
            *,
            mobile_homes (manufacturer, model)
          `)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        // Format to match the assignment structure expected by the UI
        return (data || []).map(delivery => ({
          id: `super_admin_${delivery.id}`,
          deliveries: delivery,
          driver_id: driver.id,
          completed_at: delivery.completed_at,
          notes: 'Admin View'
        }));
      } else {
        // Regular drivers see only their completed deliveries
        const { data, error } = await supabase
          .from('delivery_assignments')
          .select(`
            *,
            deliveries (
              *,
              mobile_homes (manufacturer, model)
            )
          `)
          .eq('driver_id', driver.id)
          .eq('deliveries.status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        return data || [];
      }
    },
    enabled: !!driver?.id,
  });

  // Update delivery status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ deliveryId, status, notes }: { deliveryId: string, status: 'scheduled' | 'factory_pickup_scheduled' | 'factory_pickup_in_progress' | 'factory_pickup_completed' | 'in_transit' | 'delivery_in_progress' | 'delivered' | 'completed', notes?: string }) => {
      const { error } = await supabase
        .from('deliveries')
        .update({ 
          status,
          ...(status === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('id', deliveryId);
      
      if (error) throw error;

      // Update assignment if completed
      if (status === 'completed') {
        await supabase
          .from('delivery_assignments')
          .update({ 
            completed_at: new Date().toISOString(),
            notes: notes || ''
          })
          .eq('delivery_id', deliveryId)
          .eq('driver_id', driver.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-active-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['driver-completed-deliveries'] });
      toast({
        title: "Status Updated",
        description: "Delivery status has been updated successfully.",
      });
    },
  });

  // GPS tracking mutation
  const trackLocationMutation = useMutation({
    mutationFn: async ({ deliveryId, location }: { deliveryId: string, location: {lat: number, lng: number} }) => {
      const { error } = await supabase
        .from('delivery_gps_tracking')
        .insert({
          delivery_id: deliveryId,
          driver_id: driver.id,
          latitude: location.lat,
          longitude: location.lng,
          is_active: true
        });
      
      if (error) throw error;
    },
  });

  // Photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ deliveryId, file, caption, photoType }: { 
      deliveryId: string, 
      file: File, 
      caption: string,
      photoType: string 
    }) => {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${deliveryId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('mobile-home-images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('mobile-home-images')
        .getPublicUrl(fileName);

      // Save to delivery_photos
      const { error } = await supabase
        .from('delivery_photos')
        .insert({
          delivery_id: deliveryId,
          driver_id: driver.id,
          photo_url: publicUrl,
          photo_type: photoType,
          caption,
          taken_at: new Date().toISOString()
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-delivery-photos'] });
      toast({
        title: "Photo Uploaded",
        description: "Photo has been uploaded successfully.",
      });
    },
  });

  const startTracking = (deliveryId: string) => {
    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location access to start tracking.",
        variant: "destructive"
      });
      return;
    }

    setIsTrackingLocation(true);
    trackLocationMutation.mutate({ deliveryId, location: currentLocation });

    // Start periodic tracking
    const trackingInterval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(location);
          trackLocationMutation.mutate({ deliveryId, location });
        });
      }
    }, 30000); // Track every 30 seconds

    // Store interval ID for cleanup
    (window as any).trackingInterval = trackingInterval;
  };

  const stopTracking = () => {
    setIsTrackingLocation(false);
    if ((window as any).trackingInterval) {
      clearInterval((window as any).trackingInterval);
    }
  };

  const handlePhotoUpload = (deliveryId: string, photoType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const caption = prompt('Enter photo caption:') || '';
        uploadPhotoMutation.mutate({ deliveryId, file, caption, photoType });
      }
    };
    
    input.click();
  };

  const getStatusColor = (status: string) => {
    const statusMap = {
      'scheduled': 'bg-blue-500',
      'factory_pickup_in_progress': 'bg-yellow-500',
      'in_transit': 'bg-green-500',
      'delivery_in_progress': 'bg-orange-500',
      'completed': 'bg-gray-500'
    };
    return statusMap[status as keyof typeof statusMap] || 'bg-gray-500';
  };

  const getNextStatus = (currentStatus: string): 'factory_pickup_in_progress' | 'in_transit' | 'delivery_in_progress' | 'completed' | null => {
    const statusFlow: Record<string, 'factory_pickup_in_progress' | 'in_transit' | 'delivery_in_progress' | 'completed'> = {
      'scheduled': 'factory_pickup_in_progress',
      'factory_pickup_in_progress': 'in_transit',
      'in_transit': 'delivery_in_progress',
      'delivery_in_progress': 'completed'
    };
    return statusFlow[currentStatus] || null;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'scheduled': 'Start Pickup',
      'factory_pickup_in_progress': 'Pickup Complete',
      'in_transit': 'Start Delivery',
      'delivery_in_progress': 'Mark Complete'
    };
    return labels[status as keyof typeof labels] || 'Update Status';
  };

  const handleLogout = async () => {
    stopTracking();
    await supabase.auth.signOut();
    navigate('/driver-login');
  };

  if (!user || !driver) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading driver portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                {driver.first_name[0]}
              </div>
              <div>
                <h1 className="text-lg font-bold">Driver Portal</h1>
                <p className="text-sm text-muted-foreground">
                  {driver.first_name} {driver.last_name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isTrackingLocation && (
                <Badge variant="default" className="bg-green-500">
                  <Navigation className="h-3 w-3 mr-1" />
                  Tracking
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">
              Active ({activeDeliveries.length})
            </TabsTrigger>
            <TabsTrigger value="photos">
              Photos ({deliveryPhotos.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedDeliveries.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Deliveries Tab */}
          <TabsContent value="active" className="space-y-4 mt-4">
            {activeDeliveries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Deliveries</h3>
                  <p className="text-muted-foreground text-center">
                    You don't have any active deliveries assigned at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeDeliveries.map((assignment) => {
                  const delivery = assignment.deliveries;
                  const nextStatus = getNextStatus(delivery.status);
                  
                  return (
                    <Card key={assignment.id} className="border-l-4" style={{ borderLeftColor: getStatusColor(delivery.status).replace('bg-', '') }}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Delivery #{delivery.delivery_number}
                            </p>
                          </div>
                          <Badge variant="outline" className={`${getStatusColor(delivery.status)} text-white`}>
                            {delivery.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Route Information */}
                        <div className="space-y-2">
                          <div className="flex items-start space-x-2">
                            <Package className="h-4 w-4 mt-1 text-primary" />
                            <div>
                              <p className="text-sm font-medium">Pickup:</p>
                              <p className="text-sm text-muted-foreground">{delivery.pickup_address}</p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 mt-1 text-primary" />
                            <div>
                              <p className="text-sm font-medium">Delivery:</p>
                              <p className="text-sm text-muted-foreground">{delivery.delivery_address}</p>
                            </div>
                          </div>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{delivery.customer_name}</p>
                              <p className="text-sm text-muted-foreground">{delivery.customer_phone}</p>
                            </div>
                            <Button size="sm" variant="outline">
                              <Phone className="h-3 w-3 mr-1" />
                              Call
                            </Button>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* Status Update Button */}
                          {nextStatus && (
                            <Button
                              onClick={() => updateStatusMutation.mutate({ 
                                deliveryId: delivery.id, 
                                status: nextStatus 
                              })}
                              disabled={updateStatusMutation.isPending}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {getStatusLabel(delivery.status)}
                            </Button>
                          )}

                          {/* GPS Tracking Button */}
                          {delivery.status !== 'completed' && (
                            <Button
                              variant={isTrackingLocation ? "destructive" : "outline"}
                              onClick={() => isTrackingLocation ? stopTracking() : startTracking(delivery.id)}
                              className="flex-1"
                            >
                              {isTrackingLocation ? (
                                <>
                                  <Square className="h-4 w-4 mr-2" />
                                  Stop GPS
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start GPS
                                </>
                              )}
                            </Button>
                          )}
                        </div>

                        {/* Photo Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handlePhotoUpload(delivery.id, 'pickup')}
                            size="sm"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Pickup Photo
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handlePhotoUpload(delivery.id, 'delivery')}
                            size="sm"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Delivery Photo
                          </Button>
                        </div>

                        {/* Special Instructions */}
                        {delivery.special_instructions && (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                            <p className="text-sm font-medium text-yellow-800">Special Instructions:</p>
                            <p className="text-sm text-yellow-700">{delivery.special_instructions}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="space-y-4 mt-4">
            {deliveryPhotos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Photos Yet</h3>
                  <p className="text-muted-foreground text-center">
                    Photos you take during deliveries will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Group photos by photo_type */}
                {['pickup', 'delivery', 'issue'].map((photoType) => {
                  const photosOfType = deliveryPhotos.filter(photo => photo.photo_type === photoType);
                  if (photosOfType.length === 0) return null;
                  
                  return (
                    <Card key={photoType}>
                      <CardHeader>
                        <CardTitle className="text-lg capitalize flex items-center">
                          <Camera className="h-5 w-5 mr-2" />
                          {photoType} Photos ({photosOfType.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          {photosOfType.map((photo) => (
                            <div key={photo.id} className="space-y-2">
                              <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={photo.photo_url}
                                  alt={photo.caption || `${photoType} photo`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  {photo.deliveries?.mobile_homes?.manufacturer} {photo.deliveries?.mobile_homes?.model}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Delivery #{photo.deliveries?.delivery_number}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {photo.deliveries?.customer_name}
                                </p>
                                {photo.caption && (
                                  <p className="text-xs text-muted-foreground italic">
                                    "{photo.caption}"
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {new Date(photo.taken_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Completed Deliveries Tab */}
          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedDeliveries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Completed Deliveries</h3>
                  <p className="text-muted-foreground">
                    Your completed deliveries will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedDeliveries.map((assignment) => {
                  const delivery = assignment.deliveries;
                  
                  return (
                    <Card key={assignment.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Completed on {new Date(delivery.completed_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="default">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm">
                            <span className="font-medium">Customer:</span> {delivery.customer_name}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Delivery #:</span> {delivery.delivery_number}
                          </p>
                          {assignment.notes && (
                            <p className="text-sm">
                              <span className="font-medium">Notes:</span> {assignment.notes}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DriverPortal;