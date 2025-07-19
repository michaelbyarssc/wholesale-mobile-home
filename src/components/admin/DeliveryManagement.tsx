import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Truck, Calendar as CalendarIcon, CheckCircle, Clock, AlertCircle, MapPin, FileText, User, Phone, Home, Package, CalendarDays, Plus, Edit, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';

type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'available' | 'on_delivery' | 'off_duty' | 'inactive';
};

type Delivery = {
  id: string;
  delivery_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  pickup_address: string;
  status: string;
  mobile_home_type: string;
  crew_type: string;
  scheduled_pickup_date: string | null;
  scheduled_delivery_date: string | null;
  total_delivery_cost: number;
  special_instructions: string;
  created_at: string;
};

const statusColors: Record<string, string> = {
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

const getStatusBadge = (status: string) => {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
  return <Badge className={colorClass}>{status.replace('_', ' ')}</Badge>;
};

export const DeliveryManagement = () => {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in_transit' | 'completed' | 'pending_payment' | 'factory_pickup_scheduled' | 'factory_pickup_in_progress' | 'factory_pickup_completed' | 'delivery_in_progress' | 'delivered' | 'cancelled' | 'delayed'>('all');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedPickupDate, setSelectedPickupDate] = useState<Date>();
  const [selectedPickupTime, setSelectedPickupTime] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  // Driver management state
  const [addDriverDialogOpen, setAddDriverDialogOpen] = useState(false);
  const [manageDriversDialogOpen, setManageDriversDialogOpen] = useState(false);
  const [newDriverData, setNewDriverData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    license_number: '',
    license_class: 'CDL-A'
  });
  
  const queryClient = useQueryClient();

  const { data: deliveries, isLoading, error } = useQuery({
    queryKey: ['deliveries', filter],
    queryFn: async () => {
      let query = supabase
        .from('deliveries')
        .select('*');
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Delivery[];
    },
  });

  const { data: drivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('id, first_name, last_name, email, phone, status')
        .eq('active', true)
        .order('first_name');
      
      if (error) throw error;
      return data as Driver[];
    },
  });

  const scheduleDeliveryMutation = useMutation({
    mutationFn: async ({ deliveryId, driverId, scheduledPickupDate, notes }: {
      deliveryId: string;
      driverId: string;
      scheduledPickupDate: Date;
      notes: string;
    }) => {
      console.log('📅 Scheduling pickup:', {
        deliveryId,
        driverId,
        scheduledPickupDate: scheduledPickupDate.toISOString(),
        notes
      });

      // Update delivery with scheduled pickup date and status
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({
          scheduled_pickup_date: scheduledPickupDate.toISOString(),
          status: 'factory_pickup_scheduled',
          special_instructions: notes
        })
        .eq('id', deliveryId);

      if (deliveryError) {
        console.error('❌ Delivery update error:', deliveryError);
        throw deliveryError;
      }

      // Create or update delivery assignment
      const { error: assignmentError } = await supabase
        .from('delivery_assignments')
        .upsert({
          delivery_id: deliveryId,
          driver_id: driverId,
          role: 'driver',
          notes: notes,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        }, {
          onConflict: 'delivery_id,driver_id,role'
        });

      if (assignmentError) {
        console.error('❌ Assignment error:', assignmentError);
        throw assignmentError;
      }

      console.log('✅ Pickup scheduled successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setScheduleDialogOpen(false);
      setDatePickerOpen(false);
      setSelectedPickupDate(undefined);
      setSelectedPickupTime('');
      setSelectedDriver('');
      setNotes('');
      setSelectedDelivery(null);
      toast({
        title: "Factory Pickup Scheduled",
        description: "The factory pickup has been successfully scheduled with the driver."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to schedule factory pickup. Please try again.",
        variant: "destructive"
      });
      console.error('Error scheduling delivery:', error);
    }
  });

  const addDriverMutation = useMutation({
    mutationFn: async (driverData: typeof newDriverData) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('drivers')
        .insert({
          ...driverData,
          status: 'available',
          active: true,
          created_by: user.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setAddDriverDialogOpen(false);
      setNewDriverData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        license_number: '',
        license_class: 'CDL-A'
      });
      toast({
        title: "Driver Added",
        description: "New driver has been successfully added to the system."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add driver. Please try again.",
        variant: "destructive"
      });
      console.error('Error adding driver:', error);
    }
  });

  const updateDriverStatusMutation = useMutation({
    mutationFn: async ({ driverId, status }: { driverId: string; status: 'available' | 'on_delivery' | 'off_duty' | 'inactive' }) => {
      const { error } = await supabase
        .from('drivers')
        .update({ status })
        .eq('id', driverId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: "Driver Status Updated",
        description: "Driver status has been successfully updated."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update driver status. Please try again.",
        variant: "destructive"
      });
      console.error('Error updating driver status:', error);
    }
  });

  const getFilteredDeliveries = () => {
    if (!deliveries) return [];
    return deliveries;
  };

  const filteredDeliveries = getFilteredDeliveries();

  const handleScheduleDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setDatePickerOpen(false); // Ensure any open popover is closed
    setScheduleDialogOpen(true);
  };

  const handleScheduleSubmit = () => {
    if (!selectedDelivery || !selectedPickupDate || !selectedDriver) {
      toast({
        title: "Missing Information",
        description: "Please select a pickup date and assign a driver.",
        variant: "destructive"
      });
      return;
    }

    // Combine date and time for pickup
    const pickupDateTime = new Date(selectedPickupDate);
    if (selectedPickupTime) {
      const [hours, minutes] = selectedPickupTime.split(':');
      pickupDateTime.setHours(parseInt(hours), parseInt(minutes));
    }

    scheduleDeliveryMutation.mutate({
      deliveryId: selectedDelivery.id,
      driverId: selectedDriver,
      scheduledPickupDate: pickupDateTime,
      notes: notes
    });
  };

  const handleAddDriver = () => {
    if (!newDriverData.first_name || !newDriverData.last_name || !newDriverData.email || !newDriverData.phone) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    addDriverMutation.mutate(newDriverData);
  };

  const handleDriverStatusChange = (driverId: string, status: 'available' | 'on_delivery' | 'off_duty' | 'inactive') => {
    updateDriverStatusMutation.mutate({ driverId, status });
  };

  const getFormattedDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const ScheduleDeliveryDialog = () => (
    <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Delivery</DialogTitle>
          <DialogDescription>
            Schedule delivery for {selectedDelivery?.delivery_number}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Driver Selection */}
          <div className="space-y-2">
            <Label>Select Driver</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers?.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name} ({driver.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pickup Date & Time Selection */}
          <div className="space-y-2">
            <Label>Factory Pickup Date & Time</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !selectedPickupDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedPickupDate ? format(selectedPickupDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedPickupDate}
                    onSelect={(date) => {
                      setSelectedPickupDate(date);
                      setDatePickerOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <input
                type="time"
                className="px-3 py-2 border border-input rounded-md bg-background text-sm w-full"
                value={selectedPickupTime}
                onChange={(e) => setSelectedPickupTime(e.target.value)}
                placeholder="Select time"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Driver will pick up the mobile home from the factory at this scheduled time
            </p>
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label>Special Instructions (Optional)</Label>
            <Textarea
              placeholder="Add any special pickup or delivery instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => {
              setScheduleDialogOpen(false);
              setSelectedPickupDate(undefined);
              setSelectedPickupTime('');
              setSelectedDriver('');
              setNotes('');
              setSelectedDelivery(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleSubmit}
              disabled={scheduleDeliveryMutation.isPending}
            >
              {scheduleDeliveryMutation.isPending ? 'Scheduling...' : 'Schedule Factory Pickup'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const DeliveryDetailsDialog = ({ delivery }: { delivery: Delivery }) => (
    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Delivery Details - {delivery.delivery_number}</DialogTitle>
        <DialogDescription>
          Complete information for this delivery
        </DialogDescription>
      </DialogHeader>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <User className="h-4 w-4 mr-2" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm">{delivery.customer_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{delivery.customer_email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              <p className="text-sm">{delivery.customer_phone}</p>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Truck className="h-4 w-4 mr-2" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">{getStatusBadge(delivery.status)}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Mobile Home Type</label>
              <p className="text-sm capitalize">{delivery.mobile_home_type?.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Crew Type</label>
              <p className="text-sm capitalize">{delivery.crew_type?.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Total Cost</label>
              <p className="text-sm font-medium">${delivery.total_delivery_cost?.toFixed(2) || '0.00'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Addresses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Pickup Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{delivery.pickup_address}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Home className="h-4 w-4 mr-2" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{delivery.delivery_address}</p>
          </CardContent>
        </Card>

        {/* Schedule Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <CalendarDays className="h-4 w-4 mr-2" />
              Schedule Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Scheduled Pickup</label>
              <p className="text-sm">{getFormattedDate(delivery.scheduled_pickup_date)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Scheduled Delivery</label>
              <p className="text-sm">{getFormattedDate(delivery.scheduled_delivery_date)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Special Instructions */}
        {delivery.special_instructions && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Special Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{delivery.special_instructions}</p>
            </CardContent>
          </Card>
        )}

        {/* Additional Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{getFormattedDate(delivery.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Delivery ID</label>
              <p className="text-sm font-mono text-xs">{delivery.id}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DialogContent>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading deliveries...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-500">Error loading deliveries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Delivery Management</h3>
          <p className="text-sm text-muted-foreground">
            Track and manage customer deliveries
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddDriverDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
          <Button variant="outline" size="sm" onClick={() => setManageDriversDialogOpen(true)}>
            <User className="h-4 w-4 mr-2" />
            Manage Drivers
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" onClick={() => setFilter('all')} 
                  className={filter === 'all' ? 'bg-primary text-primary-foreground' : ''}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFilter('scheduled')}
                  className={filter === 'scheduled' ? 'bg-primary text-primary-foreground' : ''}>
            Scheduled
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFilter('in_transit')}
                  className={filter === 'in_transit' ? 'bg-primary text-primary-foreground' : ''}>
            In Transit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFilter('completed')}
                  className={filter === 'completed' ? 'bg-primary text-primary-foreground' : ''}>
            Completed
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Truck className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">{deliveries?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CalendarDays className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">
                {deliveries?.filter(d => d.status === 'scheduled').length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">
                {deliveries?.filter(d => d.status === 'in_transit').length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableCaption>List of all deliveries</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Delivery #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pickup Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No deliveries found</TableCell>
              </TableRow>
            ) : (
              filteredDeliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                  <TableCell>
                    <div>
                      <div>{delivery.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{delivery.customer_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                  <TableCell>{getFormattedDate(delivery.scheduled_pickup_date)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleScheduleDelivery(delivery)}
                        disabled={delivery.status === 'completed' || delivery.status === 'delivered'}
                      >
                        <CalendarDays className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                      <Button variant="outline" size="sm">
                        <MapPin className="h-3 w-3 mr-1" />
                        Track
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <FileText className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DeliveryDetailsDialog delivery={delivery} />
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <ScheduleDeliveryDialog />
      
      {/* Add Driver Dialog */}
      <Dialog open={addDriverDialogOpen} onOpenChange={setAddDriverDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>
              Add a new driver to the delivery system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name *</Label>
                <Input
                  id="first-name"
                  value={newDriverData.first_name}
                  onChange={(e) => setNewDriverData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name *</Label>
                <Input
                  id="last-name"
                  value={newDriverData.last_name}
                  onChange={(e) => setNewDriverData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newDriverData.email}
                onChange={(e) => setNewDriverData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={newDriverData.phone}
                onChange={(e) => setNewDriverData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="license">License Number</Label>
              <Input
                id="license"
                value={newDriverData.license_number}
                onChange={(e) => setNewDriverData(prev => ({ ...prev, license_number: e.target.value }))}
                placeholder="CDL12345"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="license-class">License Class</Label>
              <Select value={newDriverData.license_class} onValueChange={(value) => 
                setNewDriverData(prev => ({ ...prev, license_class: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select license class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CDL-A">CDL Class A</SelectItem>
                  <SelectItem value="CDL-B">CDL Class B</SelectItem>
                  <SelectItem value="CDL-C">CDL Class C</SelectItem>
                  <SelectItem value="Regular">Regular License</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setAddDriverDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddDriver}
              disabled={addDriverMutation.isPending}
            >
              {addDriverMutation.isPending ? 'Adding...' : 'Add Driver'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Drivers Dialog */}
      <Dialog open={manageDriversDialogOpen} onOpenChange={setManageDriversDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Drivers</DialogTitle>
            <DialogDescription>
              View and manage all drivers in the system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {drivers && drivers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        {driver.first_name} {driver.last_name}
                      </TableCell>
                      <TableCell>{driver.email}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>
                        <Badge className={
                          driver.status === 'available' ? 'bg-green-100 text-green-800' :
                          driver.status === 'on_delivery' ? 'bg-blue-100 text-blue-800' :
                          driver.status === 'off_duty' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {driver.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={driver.status} 
                          onValueChange={(value) => handleDriverStatusChange(driver.id, value as 'available' | 'on_delivery' | 'off_duty' | 'inactive')}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="on_delivery">On Delivery</SelectItem>
                            <SelectItem value="off_duty">Off Duty</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No drivers found</p>
                <Button className="mt-4" onClick={() => {
                  setManageDriversDialogOpen(false);
                  setAddDriverDialogOpen(true);
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Driver
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};