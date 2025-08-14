import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DeliveryTimeSlotBookingProps {
  deliveryId: string;
  onSlotBooked?: (slotId: string) => void;
}

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  delivery_type: string;
  service_area: string;
  price_modifier: number;
  available: boolean;
}

export const DeliveryTimeSlotBooking: React.FC<DeliveryTimeSlotBookingProps> = ({ 
  deliveryId, 
  onSlotBooked 
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const { data: timeSlots, isLoading } = useQuery({
    queryKey: ['delivery-time-slots'],
    queryFn: async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data, error } = await supabase
        .from('delivery_time_slots')
        .select('*')
        .eq('available', true)
        .gte('date', tomorrow.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(20);

      if (error) throw error;
      return data as TimeSlot[];
    },
  });

  const bookSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      // Update delivery with selected time slot
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({ 
          scheduled_delivery_date: timeSlots?.find(slot => slot.id === slotId)?.date
        })
        .eq('id', deliveryId);

      if (deliveryError) throw deliveryError;

      // Update slot booking count
      const slot = timeSlots?.find(s => s.id === slotId);
      if (!slot) throw new Error('Slot not found');

      const { error: slotError } = await supabase
        .from('delivery_time_slots')
        .update({ 
          booked_count: slot.booked_count + 1,
          available: slot.booked_count + 1 < slot.capacity
        })
        .eq('id', slotId);

      if (slotError) throw slotError;

      return slotId;
    },
    onSuccess: (slotId) => {
      toast({
        title: "Time Slot Booked",
        description: "Delivery time slot has been successfully booked.",
      });
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ['delivery-time-slots'] });
      onSlotBooked?.(slotId);
    },
    onError: (error: any) => {
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book time slot",
        variant: "destructive",
      });
    },
  });

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString([], { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getAvailabilityColor = (slot: TimeSlot) => {
    const availableSpots = slot.capacity - slot.booked_count;
    if (availableSpots === 0) return 'destructive';
    if (availableSpots <= 2) return 'secondary';
    return 'default';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Time Slot Booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Time Slot Booking
        </CardTitle>
        <CardDescription>
          Select a preferred delivery time slot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!timeSlots || timeSlots.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No available time slots found.
          </div>
        ) : (
          <div className="space-y-3">
            {timeSlots.map((slot) => {
              const availableSpots = slot.capacity - slot.booked_count;
              const isSelected = selectedSlot === slot.id;
              
              return (
                <div 
                  key={slot.id} 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  } ${availableSpots === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => availableSpots > 0 && setSelectedSlot(isSelected ? null : slot.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatDate(slot.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {slot.delivery_type && (
                          <Badge variant="outline">{slot.delivery_type}</Badge>
                        )}
                        {slot.service_area && (
                          <Badge variant="outline">{slot.service_area}</Badge>
                        )}
                        {slot.price_modifier !== 1 && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {slot.price_modifier > 1 ? '+' : ''}{((slot.price_modifier - 1) * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{availableSpots}/{slot.capacity}</span>
                      </div>
                      <Badge variant={getAvailabilityColor(slot)}>
                        {availableSpots === 0 ? 'Full' : `${availableSpots} left`}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}

            {selectedSlot && (
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => bookSlotMutation.mutate(selectedSlot)}
                  disabled={bookSlotMutation.isPending}
                  className="w-full"
                >
                  {bookSlotMutation.isPending ? 'Booking...' : 'Book Selected Slot'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};