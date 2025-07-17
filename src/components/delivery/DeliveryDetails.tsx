import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DriverTrackingMap } from './DriverTrackingMap';
import { format } from 'date-fns';
import { 
  Truck, Package, Home, MapPin, CalendarDays, Phone, Mail, 
  FileText, User, AlertCircle, Camera, CheckSquare, 
  History, Clock, ClipboardList, CircleArrowUp
} from 'lucide-react';

import { DeliveryStatus } from '@/types/delivery';

type Delivery = {
  id: string;
  delivery_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  pickup_address: string;
  status: DeliveryStatus;
  mobile_home_type: string;
  crew_type: string;
  scheduled_pickup_date: string | null;
  scheduled_delivery_date: string | null;
  actual_pickup_date: string | null;
  actual_delivery_date: string | null;
  special_instructions: string | null;
  completion_notes: string | null;
  customer_signature_url: string | null;
  created_at: string;
  updated_at: string;
};

type Assignment = {
  id: string;
  driver_id: string;
  delivery_id: string;
  assigned_at: string;
  started_at: string | null;
  completed_at: string | null;
  role: string;
  driver: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  };
};

type Photo = {
  id: string;
  delivery_id: string;
  driver_id: string;
  photo_url: string;
  photo_type: string;
  taken_at: string;
  caption: string | null;
};

type StatusHistoryItem = {
  id: string;
  delivery_id: string;
  previous_status: DeliveryStatus | null;
  new_status: DeliveryStatus;
  notes: string | null;
  created_at: string;
  changed_by: string | null;
};

const statusColors: Record<DeliveryStatus, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300',
  scheduled: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300',
  factory_pickup_scheduled: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300',
  factory_pickup_in_progress: 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300',
  factory_pickup_completed: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900 dark:text-cyan-300',
  in_transit: 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300',
  delivery_in_progress: 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300',
  delivered: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300',
  completed: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300',
  delayed: 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300',
};

const getStatusBadge = (status: DeliveryStatus) => {
  return <Badge className={statusColors[status]}>{status.replace(/_/g, ' ')}</Badge>;
};

const getFormattedDateTime = (dateTimeString: string | null) => {
  if (!dateTimeString) return "Not set";
  
  const date = new Date(dateTimeString);
  return format(date, "PPP p"); // e.g., "Apr 29, 2023, 7:30 PM"
};

export const DeliveryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Get delivery details
  const { data: delivery, isLoading: isLoadingDelivery } = useQuery({
    queryKey: ['delivery', id],
    queryFn: async () => {
      if (!id) throw new Error('Delivery ID is required');
      
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Delivery;
    },
    enabled: !!id,
  });

  // Get assigned drivers
  const { data: assignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['delivery-assignments', id],
    queryFn: async () => {
      if (!id) throw new Error('Delivery ID is required');
      
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          driver:drivers(id, first_name, last_name, phone, email)
        `)
        .eq('delivery_id', id);
      
      if (error) throw error;
      return data as Assignment[];
    },
    enabled: !!id,
  });

  // Get delivery photos
  const { data: photos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: ['delivery-photos', id],
    queryFn: async () => {
      if (!id) throw new Error('Delivery ID is required');
      
      const { data, error } = await supabase
        .from('delivery_photos')
        .select('*')
        .eq('delivery_id', id)
        .order('taken_at', { ascending: false });
      
      if (error) throw error;
      return data as Photo[];
    },
    enabled: !!id,
  });

  // Get status history
  const { data: statusHistory, isLoading: isLoadingStatusHistory } = useQuery({
    queryKey: ['delivery-status-history', id],
    queryFn: async () => {
      if (!id) throw new Error('Delivery ID is required');
      
      const { data, error } = await supabase
        .from('delivery_status_history')
        .select('*')
        .eq('delivery_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StatusHistoryItem[];
    },
    enabled: !!id,
  });

  // Update delivery status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ newStatus, notes }: { newStatus: DeliveryStatus, notes?: string }) => {
      if (!id) throw new Error('Delivery ID is required');
      
      // First update the delivery status
      const { data: updatedDelivery, error: updateError } = await supabase
        .from('deliveries')
        .update({ 
          status: newStatus,
          // If marking as completed, set the completion date
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
          // If starting delivery, set the actual delivery date
          ...(newStatus === 'delivery_in_progress' ? { actual_delivery_date: new Date().toISOString() } : {}),
          // If starting pickup, set the actual pickup date
          ...(newStatus === 'factory_pickup_in_progress' ? { actual_pickup_date: new Date().toISOString() } : {})
        })
        .eq('id', id)
        .select();
      
      if (updateError) throw updateError;

      // Then create a status history entry
      const { data: historyEntry, error: historyError } = await supabase
        .from('delivery_status_history')
        .insert({
          delivery_id: id,
          previous_status: delivery?.status as DeliveryStatus,
          new_status: newStatus,
          notes: notes || `Status updated to ${newStatus}`
        })
        .select()
        .single();

      if (historyError) throw historyError;

      // Send customer notifications (if applicable)
      try {
        // Example code - this would need to be implemented as an edge function
        // await supabase.functions.invoke('send-delivery-update', {
        //   body: { 
        //     delivery_id: id, 
        //     status: newStatus 
        //   }
        // });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      return { delivery: updatedDelivery, history: historyEntry };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery', id] });
      queryClient.invalidateQueries({ queryKey: ['delivery-status-history', id] });
    }
  });

  // Status update button handler
  const handleStatusUpdate = (newStatus: DeliveryStatus) => {
    updateStatusMutation.mutate({ newStatus });
  };

  if (isLoadingDelivery) {
    return <div className="flex justify-center items-center h-64">Loading delivery details...</div>;
  }

  if (!delivery) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Delivery not found. It may have been deleted or you may not have permission to view it.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{delivery.delivery_number}</h2>
            {getStatusBadge(delivery.status)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created on {getFormattedDateTime(delivery.created_at)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/admin/sales')}>
            Back to List
          </Button>
          
          {/* Status update actions based on current status */}
          {delivery.status === 'pending_payment' && (
            <Button onClick={() => handleStatusUpdate('scheduled')}>
              Mark as Ready to Schedule
            </Button>
          )}
          
          {delivery.status === 'scheduled' && (
            <Button onClick={() => handleStatusUpdate('factory_pickup_scheduled')}>
              Schedule Factory Pickup
            </Button>
          )}
          
          {delivery.status === 'factory_pickup_scheduled' && (
            <Button onClick={() => handleStatusUpdate('factory_pickup_in_progress')}>
              Start Factory Pickup
            </Button>
          )}
          
          {delivery.status === 'factory_pickup_in_progress' && (
            <Button onClick={() => handleStatusUpdate('factory_pickup_completed')}>
              Complete Factory Pickup
            </Button>
          )}
          
          {delivery.status === 'factory_pickup_completed' && (
            <Button onClick={() => handleStatusUpdate('in_transit')}>
              Start Transit
            </Button>
          )}
          
          {delivery.status === 'in_transit' && (
            <Button onClick={() => handleStatusUpdate('delivery_in_progress')}>
              Start Delivery
            </Button>
          )}
          
          {delivery.status === 'delivery_in_progress' && (
            <Button onClick={() => handleStatusUpdate('delivered')}>
              Mark as Delivered
            </Button>
          )}
          
          {delivery.status === 'delivered' && (
            <Button onClick={() => handleStatusUpdate('completed')}>
              Complete Delivery
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tracking">
            <MapPin className="h-4 w-4 mr-2" />
            Tracking
          </TabsTrigger>
          <TabsTrigger value="photos">
            <Camera className="h-4 w-4 mr-2" />
            Photos
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{delivery.customer_name}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{delivery.customer_phone}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{delivery.customer_email}</span>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Send Update
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Delivery Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">{delivery.mobile_home_type}</span>
                </div>
                <div className="flex items-center">
                  <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Crew Type: {delivery.crew_type}</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Updated: {getFormattedDateTime(delivery.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Pickup:</span> {getFormattedDateTime(delivery.scheduled_pickup_date)}
                  </span>
                </div>
                <div className="flex items-center">
                  <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Delivery:</span> {getFormattedDateTime(delivery.scheduled_delivery_date)}
                  </span>
                </div>
                {delivery.actual_pickup_date && (
                  <div className="flex items-center">
                    <CheckSquare className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">
                      <span className="font-medium">Actual Pickup:</span> {getFormattedDateTime(delivery.actual_pickup_date)}
                    </span>
                  </div>
                )}
                {delivery.actual_delivery_date && (
                  <div className="flex items-center">
                    <CheckSquare className="h-4 w-4 mr-2 text-green-500" />
                    <span className="text-sm">
                      <span className="font-medium">Actual Delivery:</span> {getFormattedDateTime(delivery.actual_delivery_date)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Locations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex items-center">
                    <CircleArrowUp className="h-4 w-4 mr-2 text-blue-500" />
                    <span className="font-medium">Pickup Address</span>
                  </div>
                  <p className="text-sm ml-6 mt-1">{delivery.pickup_address}</p>
                </div>
                <div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-red-500" />
                    <span className="font-medium">Delivery Address</span>
                  </div>
                  <p className="text-sm ml-6 mt-1">{delivery.delivery_address}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Assigned Drivers</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingAssignments ? (
                  <div>Loading assignments...</div>
                ) : assignments && assignments.length > 0 ? (
                  <div className="space-y-3">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {assignment.driver.first_name} {assignment.driver.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.driver.phone}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{assignment.role}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6">
                    <p className="text-muted-foreground text-sm">No drivers assigned yet</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Assign Drivers
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {delivery.special_instructions && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Special Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{delivery.special_instructions}</p>
              </CardContent>
            </Card>
          )}

          {delivery.completion_notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completion Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{delivery.completion_notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="tracking">
          <DriverTrackingMap deliveryId={id} />
        </TabsContent>
        
        <TabsContent value="photos">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Photos</CardTitle>
              <CardDescription>
                Photos taken during pickup and delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPhotos ? (
                <div className="flex justify-center items-center py-12">Loading photos...</div>
              ) : photos && photos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square rounded-md overflow-hidden group">
                      <img 
                        src={photo.photo_url} 
                        alt={photo.caption || "Delivery photo"} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <Badge className="mb-1 self-start">
                          {photo.photo_type.replace(/_/g, ' ')}
                        </Badge>
                        {photo.caption && (
                          <p className="text-white text-xs">{photo.caption}</p>
                        )}
                        <p className="text-white/80 text-xs mt-1">
                          {format(new Date(photo.taken_at), "MMM d, yyyy p")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Camera className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                  <p className="text-muted-foreground">No photos have been uploaded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
              <CardDescription>
                Timeline of delivery status changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStatusHistory ? (
                <div className="flex justify-center items-center py-12">Loading history...</div>
              ) : statusHistory && statusHistory.length > 0 ? (
                <div className="relative">
                  <div className="absolute top-0 bottom-0 left-6 w-px bg-muted -ml-[0.5px]"></div>
                  <ul className="space-y-6 relative">
                    {statusHistory.map((item, index) => (
                      <li key={item.id} className="relative pl-8">
                        <div className="absolute left-0 top-1 w-3 h-3 rounded-full bg-primary border-2 border-background"></div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                          <div>
                            <p className="font-medium">
                              Changed from{" "}
                              <span className="text-muted-foreground">{item.previous_status?.replace(/_/g, ' ') || 'New'}</span>
                              {" "}to{" "}
                              {getStatusBadge(item.new_status)}
                            </p>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                            )}
                          </div>
                          <time className="text-xs text-muted-foreground mt-1 sm:mt-0">
                            {format(new Date(item.created_at), "MMM d, yyyy p")}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                  <p className="text-muted-foreground">No status changes recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};