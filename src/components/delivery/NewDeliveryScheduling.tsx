import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, Clock, Truck, MapPin, User, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface DeliveryWithSchedule {
  id: string;
  delivery_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  mobile_home_type: string;
  factory_id: string;
  created_at: string;
  delivery_schedules?: Array<{
    id: string;
    pickup_scheduled_date: string | null;
    pickup_scheduled_time_start: string | null;
    pickup_scheduled_time_end: string | null;
    pickup_driver_id: string | null;
    pickup_timezone: string | null;
    delivery_scheduled_date: string | null;
    delivery_scheduled_time_start: string | null;
    delivery_scheduled_time_end: string | null;
    delivery_driver_id: string | null;
    delivery_timezone: string | null;
  }> | null;
  factories?: {
    name: string;
    address: string;
    timezone: string;
  } | null;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  status: string;
}

const getTimezoneFromAddress = (address: string): string => {
  const normalizedAddress = address.toLowerCase();
  
  // Map states to timezones - simplified version
  const stateTimezoneMap: Record<string, string> = {
    'california': 'America/Los_Angeles', 'ca': 'America/Los_Angeles',
    'oregon': 'America/Los_Angeles', 'or': 'America/Los_Angeles',
    'washington': 'America/Los_Angeles', 'wa': 'America/Los_Angeles',
    'arizona': 'America/Phoenix', 'az': 'America/Phoenix',
    'colorado': 'America/Denver', 'co': 'America/Denver',
    'utah': 'America/Denver', 'ut': 'America/Denver',
    'texas': 'America/Chicago', 'tx': 'America/Chicago',
    'illinois': 'America/Chicago', 'il': 'America/Chicago',
    'florida': 'America/New_York', 'fl': 'America/New_York',
    'new york': 'America/New_York', 'ny': 'America/New_York',
  };
  
  for (const [state, timezone] of Object.entries(stateTimezoneMap)) {
    if (normalizedAddress.includes(state)) {
      return timezone;
    }
  }
  
  return 'America/New_York'; // Default to Eastern Time
};

export const NewDeliveryScheduling = () => {
  const [selectedDelivery, setSelectedDelivery] = useState<string>('');
  const [scheduleType, setScheduleType] = useState<'pickup' | 'delivery'>('pickup');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch deliveries awaiting scheduling
  const { data: deliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['deliveries-awaiting-scheduling'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          delivery_schedules (
            id,
            pickup_scheduled_date,
            pickup_scheduled_time_start,
            pickup_scheduled_time_end,
            pickup_driver_id,
            pickup_timezone,
            delivery_scheduled_date,
            delivery_scheduled_time_start,
            delivery_scheduled_time_end,
            delivery_driver_id,
            delivery_timezone
          ),
          factories (
            name,
            address,
            timezone
          )
        `)
        .in('status', ['awaiting_pickup_schedule', 'pickup_scheduled', 'pickup_completed', 'awaiting_delivery_schedule'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any;
    },
  });

  // Fetch available drivers
  const { data: drivers, isLoading: driversLoading } = useQuery({
    queryKey: ['available-drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('active', true)
        .order('first_name');

      if (error) throw error;
      return data as Driver[];
    },
  });

  // Schedule delivery mutation
  const scheduleDeliveryMutation = useMutation({
    mutationFn: async (scheduleData: {
      deliveryId: string;
      scheduleType: 'pickup' | 'delivery';
      date: Date;
      startTime: string;
      endTime: string;
      driverId: string;
      timezone: string;
    }) => {
      const { deliveryId, scheduleType, date, startTime, endTime, driverId, timezone } = scheduleData;
      
      // Convert date and time to timestamp with timezone
      const scheduledDate = new Date(`${format(date, 'yyyy-MM-dd')}T${startTime}:00`);
      const dateOnly = format(date, 'yyyy-MM-dd');
      
      // Prepare schedule payload
      const updateData = scheduleType === 'pickup' ? {
        pickup_scheduled_date: scheduledDate.toISOString(),
        pickup_scheduled_time_start: startTime,
        pickup_scheduled_time_end: endTime,
        pickup_driver_id: driverId,
        pickup_timezone: timezone,
      } : {
        delivery_scheduled_date: scheduledDate.toISOString(),
        delivery_scheduled_time_start: startTime,
        delivery_scheduled_time_end: endTime,
        delivery_driver_id: driverId,
        delivery_timezone: timezone,
      };

      // Ensure a delivery_schedules row exists for this delivery
      const { data: existingSchedule, error: existingErr } = await supabase
        .from('delivery_schedules')
        .select('id')
        .eq('delivery_id', deliveryId)
        .maybeSingle();
      if (existingErr) throw existingErr;

      if (existingSchedule) {
        const { error } = await supabase
          .from('delivery_schedules')
          .update(updateData)
          .eq('id', existingSchedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_schedules')
          .insert({ delivery_id: deliveryId, ...updateData });
        if (error) throw error;
      }

      // Update the delivery status and simple date field for fallback display
      const newStatus = scheduleType === 'pickup' ? 'pickup_scheduled' : 'delivery_scheduled';
      const deliveryUpdate = scheduleType === 'pickup'
        ? { status: newStatus, scheduled_pickup_date: dateOnly }
        : { status: newStatus, scheduled_delivery_date: dateOnly };

      const { error: deliveryError } = await supabase
        .from('deliveries')
        .update(deliveryUpdate as any)
        .eq('id', deliveryId);
      if (deliveryError) throw deliveryError;

      return { deliveryId, scheduleType };
    },
    onSuccess: () => {
      toast({
        title: "Schedule Updated",
        description: `${scheduleType === 'pickup' ? 'Pickup' : 'Delivery'} has been scheduled successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['deliveries-awaiting-scheduling'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setIsScheduleDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to schedule ${scheduleType}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedDelivery('');
    setScheduleType('pickup');
    setSelectedDate(undefined);
    setStartTime('09:00');
    setEndTime('17:00');
    setSelectedDriver('');
  };

  const handleSchedule = () => {
    if (!selectedDelivery || !selectedDate || !selectedDriver) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const delivery = deliveries?.find(d => d.id === selectedDelivery);
    if (!delivery) return;

    const timezone = scheduleType === 'pickup' 
      ? delivery.factories?.timezone || getTimezoneFromAddress(delivery.pickup_address)
      : getTimezoneFromAddress(delivery.delivery_address);

    scheduleDeliveryMutation.mutate({
      deliveryId: selectedDelivery,
      scheduleType,
      date: selectedDate,
      startTime,
      endTime,
      driverId: selectedDriver,
      timezone,
    });
  };

  const getDeliveryStatusBadge = (delivery: any) => {
    const schedule = delivery.delivery_schedules?.[0];
    
    if (delivery.status === 'awaiting_pickup_schedule') {
      return <Badge variant="secondary">Awaiting Pickup Schedule</Badge>;
    }
    if (delivery.status === 'pickup_scheduled') {
      return <Badge variant="default">Pickup Scheduled</Badge>;
    }
    if (delivery.status === 'pickup_completed') {
      return <Badge variant="default">Pickup Complete - Awaiting Delivery Schedule</Badge>;
    }
    if (delivery.status === 'delivery_scheduled') {
      return <Badge variant="default">Delivery Scheduled</Badge>;
    }
    
    return <Badge variant="outline">{delivery.status}</Badge>;
  };

  const canSchedulePickup = (delivery: any) => {
    return delivery.status === 'awaiting_pickup_schedule' && !delivery.delivery_schedules?.[0]?.pickup_scheduled_date;
  };

  const canScheduleDelivery = (delivery: any) => {
    return (delivery.status === 'pickup_completed' || delivery.status === 'awaiting_delivery_schedule') && 
           delivery.delivery_schedules?.[0]?.pickup_scheduled_date && 
           !delivery.delivery_schedules?.[0]?.delivery_scheduled_date;
  };

  if (deliveriesLoading || driversLoading) {
    return <div className="p-6">Loading...</div>;
  }

  const awaitingDeliveries = deliveries?.filter(d => 
    canSchedulePickup(d) || canScheduleDelivery(d)
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Delivery Scheduling</h2>
          <p className="text-muted-foreground">
            Schedule pickup and delivery times for paid orders
          </p>
        </div>
        
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={awaitingDeliveries.length === 0}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule Delivery
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Schedule Delivery</DialogTitle>
              <DialogDescription>
                Schedule pickup from factory or delivery to customer
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Side - Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Delivery</Label>
                  <Select value={selectedDelivery} onValueChange={setSelectedDelivery}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a delivery" />
                    </SelectTrigger>
                    <SelectContent>
                      {awaitingDeliveries.map((delivery) => (
                        <SelectItem key={delivery.id} value={delivery.id}>
                          {delivery.delivery_number} - {delivery.customer_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDelivery && (
                  <>
                    <div className="space-y-2">
                      <Label>Schedule Type</Label>
                      <Select value={scheduleType} onValueChange={(value: 'pickup' | 'delivery') => setScheduleType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {awaitingDeliveries.find(d => d.id === selectedDelivery && canSchedulePickup(d)) && (
                            <SelectItem value="pickup">Factory Pickup</SelectItem>
                          )}
                          {awaitingDeliveries.find(d => d.id === selectedDelivery && canScheduleDelivery(d)) && (
                            <SelectItem value="delivery">Customer Delivery</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Driver</Label>
                      <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a driver" />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers?.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.first_name} {driver.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={handleSchedule} 
                      className="w-full"
                      disabled={scheduleDeliveryMutation.isPending}
                    >
                      {scheduleDeliveryMutation.isPending ? 'Scheduling...' : `Schedule ${scheduleType === 'pickup' ? 'Pickup' : 'Delivery'}`}
                    </Button>
                  </>
                )}
              </div>

              {/* Right Side - Calendar */}
              <div className="space-y-4">
                <Label>Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
                
                {selectedDelivery && selectedDate && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">Schedule Summary</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Date:</strong> {format(selectedDate, 'PPPP')}</p>
                      <p><strong>Time:</strong> {startTime} - {endTime}</p>
                      <p><strong>Type:</strong> {scheduleType === 'pickup' ? 'Factory Pickup' : 'Customer Delivery'}</p>
                      {selectedDriver && drivers && (
                        <p><strong>Driver:</strong> {drivers.find(d => d.id === selectedDriver)?.first_name} {drivers.find(d => d.id === selectedDriver)?.last_name}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Deliveries Awaiting Scheduling */}
      <div className="grid gap-4">
        {awaitingDeliveries.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <h3 className="text-lg font-medium">All Caught Up!</h3>
                <p className="text-muted-foreground">No deliveries awaiting scheduling at the moment.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          awaitingDeliveries.map((delivery) => (
            <Card key={delivery.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{delivery.delivery_number}</CardTitle>
                    <CardDescription>{delivery.customer_name}</CardDescription>
                  </div>
                  {getDeliveryStatusBadge(delivery)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{delivery.customer_email}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="mr-2">📞</span>
                      <span>{delivery.customer_phone}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Factory: {delivery.factories?.name || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{delivery.pickup_address}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{delivery.delivery_address}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="mr-2">🏠</span>
                      <span>{delivery.mobile_home_type}</span>
                    </div>
                  </div>
                </div>

                {/* Schedule Information */}
                {delivery.delivery_schedules?.[0] && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {delivery.delivery_schedules[0].pickup_scheduled_date && (
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">Pickup Schedule</h4>
                          <div className="text-sm text-muted-foreground">
                            <p>{format(new Date(delivery.delivery_schedules[0].pickup_scheduled_date), 'PPP')}</p>
                            <p>{delivery.delivery_schedules[0].pickup_scheduled_time_start} - {delivery.delivery_schedules[0].pickup_scheduled_time_end}</p>
                          </div>
                        </div>
                      )}
                      
                      {delivery.delivery_schedules[0].delivery_scheduled_date && (
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">Delivery Schedule</h4>
                          <div className="text-sm text-muted-foreground">
                            <p>{format(new Date(delivery.delivery_schedules[0].delivery_scheduled_date), 'PPP')}</p>
                            <p>{delivery.delivery_schedules[0].delivery_scheduled_time_start} - {delivery.delivery_schedules[0].delivery_scheduled_time_end}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};