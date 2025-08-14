import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Truck, MapPin } from "lucide-react";

export const DeliveryScheduling = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: unscheduledDeliveries } = useQuery({
    queryKey: ["unscheduled-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          mobile_homes(model, manufacturer),
          delivery_assignments(
            drivers(id, first_name, last_name)
          )
        `)
        .in("status", ["scheduled", "pickup_scheduled", "factory_pickup_scheduled", "pending_payment"])
        .is("scheduled_delivery_date", null)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const scheduleDeliveryMutation = useMutation({
    mutationFn: async ({ deliveryId, driverId }: { deliveryId: string; driverId?: string }) => {
      const { error } = await supabase
        .from("deliveries")
        .update({ 
          scheduled_delivery_date: selectedDate.toISOString().split('T')[0] 
        })
        .eq("id", deliveryId);
      
      if (error) throw error;

      // If driver is selected, create or update delivery assignment
      if (driverId && driverId !== "all") {
        const { error: assignmentError } = await supabase
          .from("delivery_assignments")
          .upsert({
            delivery_id: deliveryId,
            driver_id: driverId,
            active: true,
            assigned_at: new Date().toISOString()
          });
        
        if (assignmentError) throw assignmentError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unscheduled-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-deliveries"] });
      toast.success("Delivery scheduled successfully");
    },
    onError: (error) => {
      toast.error("Failed to schedule delivery: " + error.message);
    },
  });

  const { data: availableDrivers } = useQuery({
    queryKey: ["available-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("status", "available")
        .eq("active", true)
        .order("first_name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: scheduledDeliveries } = useQuery({
    queryKey: ["scheduled-deliveries", selectedDate],
    queryFn: async () => {
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          mobile_homes(model, manufacturer),
          delivery_assignments(
            drivers(id, first_name, last_name)
          )
        `)
        .gte("scheduled_delivery_date", startOfDay.toISOString())
        .lte("scheduled_delivery_date", endOfDay.toISOString())
        .order("scheduled_delivery_date");
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDate,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Delivery Scheduling</h2>
        <p className="text-muted-foreground">Schedule deliveries and assign drivers</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Schedule Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Scheduled Deliveries for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle>
              Scheduled for {selectedDate.toLocaleDateString()}
            </CardTitle>
            <CardDescription>
              Deliveries planned for this date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduledDeliveries?.map((delivery) => (
                <div key={delivery.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{delivery.delivery_number}</p>
                    <Badge variant="outline">
                      {delivery.mobile_home_type?.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
                  </p>
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{delivery.delivery_address}</span>
                  </div>
                  {delivery.delivery_assignments?.length > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <Truck className="h-3 w-3" />
                      <span>
                        {delivery.delivery_assignments[0].drivers?.first_name}{' '}
                        {delivery.delivery_assignments[0].drivers?.last_name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {scheduledDeliveries?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No deliveries scheduled for this date
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unscheduled Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Unscheduled Deliveries
            </CardTitle>
            <CardDescription>
              Deliveries waiting to be scheduled
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unscheduledDeliveries?.map((delivery) => (
                <div key={delivery.id} className="p-3 border rounded-lg space-y-3">
                  <div>
                    <p className="font-medium">{delivery.delivery_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Customer: {delivery.customer_name}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Assign driver" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Select driver</SelectItem>
                        {availableDrivers?.map((driver) => (
                          <SelectItem key={driver.id} value={driver.id}>
                            {driver.first_name} {driver.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => scheduleDeliveryMutation.mutate({ 
                        deliveryId: delivery.id, 
                        driverId: selectedDriver 
                      })}
                      disabled={scheduleDeliveryMutation.isPending}
                    >
                      {scheduleDeliveryMutation.isPending ? "Scheduling..." : `Schedule for ${selectedDate.toLocaleDateString()}`}
                    </Button>
                  </div>
                </div>
              ))}
              {unscheduledDeliveries?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All deliveries are scheduled
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};