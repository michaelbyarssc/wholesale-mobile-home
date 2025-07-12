import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MapPin, 
  Clock, 
  Phone, 
  Camera, 
  Star,
  Truck,
  CheckCircle,
  AlertCircle,
  Eye,
  Settings,
  Calendar,
  MessageSquare,
  Bell
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StarRating } from '@/components/reviews/StarRating';

const CustomerDelivery = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('tracking');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate('/auth');
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate('/auth');
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch customer's active deliveries
  const { data: activeDeliveries = [] } = useQuery({
    queryKey: ['customer-active-deliveries', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          mobile_homes (manufacturer, model),
          delivery_assignments (
            drivers (first_name, last_name, phone)
          ),
          delivery_gps_tracking (
            latitude,
            longitude,
            timestamp,
            is_active
          )
        `)
        .eq('customer_email', user.email)
        .in('status', ['scheduled', 'in_transit', 'at_pickup', 'at_delivery'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });

  // Fetch delivery history
  const { data: deliveryHistory = [] } = useQuery({
    queryKey: ['customer-delivery-history', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          mobile_homes (manufacturer, model),
          delivery_photos (photo_url, photo_type, caption, taken_at)
        `)
        .eq('customer_email', user.email)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.email,
  });

  // Fetch customer preferences
  const { data: preferences } = useQuery({
    queryKey: ['customer-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('customer_delivery_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async (prefs: any) => {
      const { data, error } = await supabase
        .from('customer_delivery_preferences')
        .upsert({
          user_id: user.id,
          ...prefs,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-preferences'] });
      toast({
        title: "Preferences Updated",
        description: "Your delivery preferences have been saved.",
      });
    },
  });

  // Submit delivery rating
  const submitRatingMutation = useMutation({
    mutationFn: async ({ deliveryId, rating, comment }: { deliveryId: string, rating: number, comment: string }) => {
      const { data, error } = await supabase
        .from('delivery_ratings')
        .insert({
          delivery_id: deliveryId,
          customer_id: user.id,
          rating,
          comment,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Rating Submitted",
        description: "Thank you for your feedback!",
      });
    },
  });

  const formatStatus = (status: string) => {
    const statusMap = {
      'scheduled': { label: 'Scheduled', variant: 'outline' as const, icon: Calendar },
      'in_transit': { label: 'In Transit', variant: 'default' as const, icon: Truck },
      'at_pickup': { label: 'At Pickup', variant: 'secondary' as const, icon: MapPin },
      'at_delivery': { label: 'At Delivery', variant: 'secondary' as const, icon: MapPin },
      'completed': { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
    };
    
    return statusMap[status as keyof typeof statusMap] || { 
      label: status, 
      variant: 'outline' as const, 
      icon: AlertCircle 
    };
  };

  const getEstimatedArrival = (delivery: any) => {
    // Calculate ETA based on GPS tracking and delivery address
    // This would integrate with a routing service
    return "2:30 PM - 3:00 PM";
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">My Deliveries</h1>
              <p className="text-muted-foreground">Track and manage your mobile home deliveries</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tracking">Live Tracking</TabsTrigger>
            <TabsTrigger value="history">Delivery History</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="calendar">Delivery Calendar</TabsTrigger>
          </TabsList>

          {/* Live Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">
            {activeDeliveries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Active Deliveries</h3>
                  <p className="text-muted-foreground text-center">
                    You don't have any deliveries in progress at the moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {activeDeliveries.map((delivery) => {
                  const statusInfo = formatStatus(delivery.status);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <Card key={delivery.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="flex items-center space-x-2">
                              <span>{delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}</span>
                              <Badge variant={statusInfo.variant}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Delivery #{delivery.delivery_number}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Driver Info */}
                        {delivery.delivery_assignments?.[0]?.drivers && (
                          <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                              {delivery.delivery_assignments[0].drivers.first_name[0]}
                            </div>
                            <div>
                              <p className="font-medium">
                                {delivery.delivery_assignments[0].drivers.first_name} {delivery.delivery_assignments[0].drivers.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">Your Driver</p>
                            </div>
                            {delivery.delivery_assignments[0].drivers.phone && (
                              <Button size="sm" variant="outline" className="ml-auto">
                                <Phone className="h-3 w-3 mr-1" />
                                Call
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Delivery Progress */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Estimated Arrival:</span>
                            <span className="text-sm text-muted-foreground">
                              {getEstimatedArrival(delivery)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Delivery Address:</span>
                            <span className="text-sm text-muted-foreground text-right">
                              {delivery.delivery_address}
                            </span>
                          </div>
                        </div>

                        {/* GPS Tracking */}
                        {delivery.delivery_gps_tracking?.length > 0 && (
                          <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <span className="font-medium">Live Location</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Last updated: {new Date(delivery.delivery_gps_tracking[0].timestamp).toLocaleTimeString()}
                            </p>
                            <Button size="sm" variant="outline" className="mt-2">
                              <Eye className="h-3 w-3 mr-1" />
                              View on Map
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Delivery History Tab */}
          <TabsContent value="history" className="space-y-6">
            {deliveryHistory.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Completed Deliveries</h3>
                  <p className="text-muted-foreground">
                    Your delivery history will appear here once deliveries are completed.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deliveryHistory.map((delivery) => (
                  <Card key={delivery.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>
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
                    <CardContent className="space-y-4">
                      {/* Delivery Photos */}
                      {delivery.delivery_photos?.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center">
                            <Camera className="h-4 w-4 mr-2" />
                            Delivery Photos ({delivery.delivery_photos.length})
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {delivery.delivery_photos.slice(0, 4).map((photo, index) => (
                              <div key={index} className="aspect-square bg-muted rounded-lg overflow-hidden">
                                <img 
                                  src={photo.photo_url} 
                                  alt={photo.caption || `Delivery photo ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                          {delivery.delivery_photos.length > 4 && (
                            <Button variant="outline" size="sm" className="mt-2">
                              View All {delivery.delivery_photos.length} Photos
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Rating Section */}
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Rate This Delivery</span>
                          <div className="flex items-center space-x-2">
                            <StarRating 
                              rating={0} 
                              onRatingChange={(rating) => {
                                // Show rating dialog
                              }}
                              size="sm"
                            />
                            <Button size="sm" variant="outline">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              Add Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Delivery Preferences</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notification Preferences */}
                <div className="space-y-4">
                  <h3 className="font-medium">Notification Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Email Notifications</Label>
                      <div className="space-y-2">
                        {['Driver starts route', '30 minutes out', 'Driver arrived', 'Delivery completed'].map((event) => (
                          <div key={event} className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span className="text-sm">{event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>SMS Notifications</Label>
                      <div className="space-y-2">
                        {['Driver starts route', '30 minutes out', 'Driver arrived', 'Delivery completed'].map((event) => (
                          <div key={event} className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span className="text-sm">{event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Portal Notifications</Label>
                      <div className="space-y-2">
                        {['Driver starts route', '30 minutes out', 'Driver arrived', 'Delivery completed'].map((event) => (
                          <div key={event} className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span className="text-sm">{event}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="space-y-4">
                  <h3 className="font-medium">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency-name">Emergency Contact Name</Label>
                      <Input 
                        id="emergency-name" 
                        placeholder="Contact name"
                        defaultValue={preferences?.emergency_contact_name || ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency-phone">Emergency Contact Phone</Label>
                      <Input 
                        id="emergency-phone" 
                        placeholder="Phone number"
                        defaultValue={preferences?.emergency_contact_phone || ''}
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Instructions */}
                <div className="space-y-4">
                  <h3 className="font-medium">Special Delivery Instructions</h3>
                  <Textarea 
                    placeholder="Add any special instructions for drivers (gate codes, delivery location preferences, etc.)"
                    defaultValue={preferences?.delivery_instructions || ''}
                    rows={3}
                  />
                </div>

                <Button onClick={() => updatePreferencesMutation.mutate({})}>
                  Save Preferences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delivery Calendar Tab */}
          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Upcoming Deliveries</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Calendar view of scheduled deliveries would be implemented here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerDelivery;