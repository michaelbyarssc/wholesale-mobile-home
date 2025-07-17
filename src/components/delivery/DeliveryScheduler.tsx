import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, Plus, Truck, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Driver = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  status: string;
  company_id: string | null;
};

type Delivery = {
  id: string;
  delivery_number: string;
  customer_name: string;
  delivery_address: string;
  pickup_address: string;
  status: string;
  scheduled_pickup_date: string | null;
  scheduled_delivery_date: string | null;
  mobile_home_type: string;
  crew_type: string;
};

// Validation schema for scheduling a delivery
const scheduleFormSchema = z.object({
  delivery_id: z.string().min(1, "Please select a delivery"),
  driver_ids: z.array(z.string()).min(1, "Please assign at least one driver"),
  scheduled_pickup_date: z.date().nullable(),
  scheduled_delivery_date: z.date(),
  special_instructions: z.string().optional(),
  pickup_address: z.string().min(1, "Pickup address is required"),
  delivery_address: z.string().min(1, "Delivery address is required")
});

export const DeliveryScheduler = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  
  const form = useForm<z.infer<typeof scheduleFormSchema>>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      delivery_id: "",
      driver_ids: [],
      scheduled_pickup_date: null,
      scheduled_delivery_date: undefined,
      special_instructions: "",
      pickup_address: "",
      delivery_address: ""
    }
  });

  const { data: pendingDeliveries, isLoading: isLoadingDeliveries } = useQuery({
    queryKey: ['pending-deliveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .in('status', ['pending_payment', 'factory_pickup_scheduled'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Delivery[];
    }
  });

  const { data: availableDrivers, isLoading: isLoadingDrivers } = useQuery({
    queryKey: ['available-drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('active', true)
        .in('status', ['available'])
        .order('first_name', { ascending: true });
      
      if (error) throw error;
      return data as Driver[];
    }
  });

  // Handle driver assignment to delivery
  const assignDriversMutation = useMutation({
    mutationFn: async (values: z.infer<typeof scheduleFormSchema>) => {
      // First update the delivery with scheduled dates
      const { data: updatedDelivery, error: deliveryError } = await supabase
        .from('deliveries')
        .update({
          status: 'scheduled',
          scheduled_pickup_date: values.scheduled_pickup_date?.toISOString(),
          scheduled_delivery_date: values.scheduled_delivery_date.toISOString(),
          special_instructions: values.special_instructions,
          pickup_address: values.pickup_address,
          delivery_address: values.delivery_address
        })
        .eq('id', values.delivery_id)
        .select();
      
      if (deliveryError) throw deliveryError;

      // Then assign drivers
      const driverAssignments = values.driver_ids.map(driverId => ({
        delivery_id: values.delivery_id,
        driver_id: driverId,
        assigned_at: new Date().toISOString(),
        assigned_by: null, // This would ideally be the current user ID
        active: true,
        role: 'driver'
      }));

      const { data: assignmentData, error: assignmentError } = await supabase
        .from('delivery_assignments')
        .insert(driverAssignments)
        .select();

      if (assignmentError) throw assignmentError;

      // Create calendar events for each driver if Google Calendar is connected
      try {
        // This would call an edge function to create Google Calendar events
        // await supabase.functions.invoke('sync-delivery-calendar', {
        //   body: { 
        //     delivery_id: values.delivery_id, 
        //     driver_ids: values.driver_ids 
        //   }
        // });
      } catch (e) {
        console.error('Failed to sync with calendar:', e);
        // Continue with the scheduling process even if calendar sync fails
      }

      return { delivery: updatedDelivery, assignments: assignmentData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-deliveries'] });
      setOpen(false);
      form.reset();
    }
  });

  const onDeliverySelect = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    form.setValue("delivery_id", delivery.id);
    form.setValue("pickup_address", delivery.pickup_address);
    form.setValue("delivery_address", delivery.delivery_address);
  };

  const onSubmit = (values: z.infer<typeof scheduleFormSchema>) => {
    assignDriversMutation.mutate(values);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Delivery Scheduling</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Schedule Delivery
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Schedule a Delivery</DialogTitle>
              <DialogDescription>
                Assign drivers and set pickup/delivery dates
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                {/* Delivery Selection */}
                <FormField
                  control={form.control}
                  name="delivery_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Delivery</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a delivery to schedule" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingDeliveries ? (
                            <SelectItem value="loading" disabled>Loading deliveries...</SelectItem>
                          ) : pendingDeliveries?.length === 0 ? (
                            <SelectItem value="none" disabled>No pending deliveries available</SelectItem>
                          ) : (
                            pendingDeliveries?.map((delivery) => (
                              <SelectItem 
                                key={delivery.id} 
                                value={delivery.id}
                                onClick={() => onDeliverySelect(delivery)}
                              >
                                {delivery.delivery_number} - {delivery.customer_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {selectedDelivery && (
                          <div className="mt-2">
                            <div className="font-semibold">{selectedDelivery.customer_name}</div>
                            <div className="text-sm">{selectedDelivery.mobile_home_type}</div>
                            <div className="text-sm">Crew: {selectedDelivery.crew_type}</div>
                          </div>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Driver Assignment */}
                <FormField
                  control={form.control}
                  name="driver_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Drivers</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const currentValues = field.value || [];
                          if (!currentValues.includes(value)) {
                            field.onChange([...currentValues, value]);
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select drivers to assign" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingDrivers ? (
                            <SelectItem value="loading" disabled>Loading drivers...</SelectItem>
                          ) : availableDrivers?.length === 0 ? (
                            <SelectItem value="none" disabled>No available drivers</SelectItem>
                          ) : (
                            availableDrivers?.map((driver) => (
                              <SelectItem 
                                key={driver.id} 
                                value={driver.id}
                                disabled={field.value.includes(driver.id)}
                              >
                                {driver.first_name} {driver.last_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value.map(driverId => {
                          const driver = availableDrivers?.find(d => d.id === driverId);
                          return driver ? (
                            <div key={driverId} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-1 text-xs">
                              <UserCheck className="h-3 w-3" />
                              {driver.first_name} {driver.last_name}
                              <button 
                                type="button"
                                className="ml-1 rounded-full hover:bg-secondary/80"
                                onClick={() => {
                                  const updatedValues = field.value.filter(id => id !== driverId);
                                  field.onChange(updatedValues);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : null;
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pickup Date */}
                <FormField
                  control={form.control}
                  name="scheduled_pickup_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Pickup Date (optional)</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <Button
                            variant={"outline"}
                            className={`w-full justify-start text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                            type="button"
                            onClick={() => {
                              const datePickerDialog = document.getElementById("pickup_date_dialog");
                              if (datePickerDialog) {
                                const isHidden = datePickerDialog.hasAttribute("hidden");
                                if (isHidden) {
                                  datePickerDialog.removeAttribute("hidden");
                                } else {
                                  datePickerDialog.setAttribute("hidden", "");
                                }
                              }
                            }}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                          <div 
                            id="pickup_date_dialog" 
                            className="absolute top-12 left-0 z-50 bg-background border rounded-md shadow-md" 
                            hidden
                          >
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
                              onSelect={(date) => {
                                field.onChange(date);
                                document.getElementById("pickup_date_dialog")?.setAttribute("hidden", "");
                              }}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </div>
                        </div>
                        <Input 
                          type="time" 
                          placeholder="Time"
                          onChange={(e) => {
                            if (field.value && e.target.value) {
                              const [hours, minutes] = e.target.value.split(':');
                              const newDate = new Date(field.value);
                              newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                              field.onChange(newDate);
                            }
                          }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Delivery Date */}
                <FormField
                  control={form.control}
                  name="scheduled_delivery_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Delivery Date</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <Button
                            variant={"outline"}
                            className={`w-full justify-start text-left font-normal ${
                              !field.value && "text-muted-foreground"
                            }`}
                            type="button"
                            onClick={() => {
                              const datePickerDialog = document.getElementById("delivery_date_dialog");
                              if (datePickerDialog) {
                                const isHidden = datePickerDialog.hasAttribute("hidden");
                                if (isHidden) {
                                  datePickerDialog.removeAttribute("hidden");
                                } else {
                                  datePickerDialog.setAttribute("hidden", "");
                                }
                              }
                            }}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                          </Button>
                          <div 
                            id="delivery_date_dialog" 
                            className="absolute top-12 left-0 z-50 bg-background border rounded-md shadow-md" 
                            hidden
                          >
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={(date) => {
                                if (date) field.onChange(date);
                                document.getElementById("delivery_date_dialog")?.setAttribute("hidden", "");
                              }}
                              disabled={(date) => {
                                const today = new Date();
                                return date < today;
                              }}
                              initialFocus
                            />
                          </div>
                        </div>
                        <Input 
                          type="time" 
                          placeholder="Time"
                          onChange={(e) => {
                            if (field.value && e.target.value) {
                              const [hours, minutes] = e.target.value.split(':');
                              const newDate = new Date(field.value);
                              newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                              field.onChange(newDate);
                            }
                          }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Addresses */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pickup_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Pickup location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="delivery_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Delivery location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Special Instructions */}
                <FormField
                  control={form.control}
                  name="special_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter any special instructions for the drivers..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setOpen(false);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={assignDriversMutation.isPending}>
                    {assignDriversMutation.isPending ? "Scheduling..." : "Schedule Delivery"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Scheduled Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center text-muted-foreground">
              <Truck className="h-16 w-16 mb-4 opacity-20" />
              <p>Scheduled deliveries will appear here</p>
              <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
                Schedule a delivery
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};