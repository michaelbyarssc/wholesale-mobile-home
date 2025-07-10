import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type AppointmentSlot = Tables<'appointment_slots'>;
type Appointment = Tables<'appointments'>;
type AppointmentTemplate = Tables<'appointment_templates'>;

interface AppointmentWithSlotAndHome extends Appointment {
  appointment_slots?: AppointmentSlot;
  mobile_homes?: {
    id: string;
    model: string;
    manufacturer: string;
    display_name?: string;
  };
}

interface AppointmentSlotWithDetails extends AppointmentSlot {
  appointments?: Appointment[];
  mobile_homes?: {
    id: string;
    model: string;
    manufacturer: string;
    display_name?: string;
  };
}

export const useAppointmentScheduling = (userId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AppointmentSlotWithDetails[]>([]);
  const [userAppointments, setUserAppointments] = useState<AppointmentWithSlotAndHome[]>([]);
  const [templates, setTemplates] = useState<AppointmentTemplate[]>([]);
  const { toast } = useToast();

  // Fetch available appointment slots
  const fetchAvailableSlots = useCallback(async (startDate?: Date, endDate?: Date, mobileHomeId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('appointment_slots')
        .select(`
          *,
          mobile_homes:mobile_home_id (id, model, manufacturer, display_name)
        `)
        .eq('available', true)
        .gte('date', startDate ? startDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (endDate) {
        query = query.lte('date', endDate.toISOString().split('T')[0]);
      }

      if (mobileHomeId) {
        query = query.eq('mobile_home_id', mobileHomeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAvailableSlots(data || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast({
        title: "Error",
        description: "Failed to load available appointment slots.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Fetch user's appointments
  const fetchUserAppointments = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          appointment_slots!slot_id (*),
          mobile_homes:mobile_home_id (id, model, manufacturer, display_name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUserAppointments(data || []);
    } catch (error) {
      console.error('Error fetching user appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load your appointments.",
        variant: "destructive"
      });
    }
  }, [userId, toast]);

  // Fetch appointment templates
  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('appointment_templates')
        .select('*')
        .eq('active', true)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  // Book an appointment
  const bookAppointment = useCallback(async (
    slotId: string,
    appointmentData: {
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      mobileHomeId?: string;
      partySize?: number;
      appointmentType?: string;
      specialRequests?: string;
    }
  ) => {
    setIsLoading(true);
    try {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          slot_id: slotId,
          user_id: userId,
          mobile_home_id: appointmentData.mobileHomeId,
          customer_name: appointmentData.customerName,
          customer_email: appointmentData.customerEmail,
          customer_phone: appointmentData.customerPhone,
          party_size: appointmentData.partySize || 1,
          appointment_type: appointmentData.appointmentType || 'viewing',
          special_requests: appointmentData.specialRequests,
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Appointment Booked!",
        description: "Your appointment has been successfully scheduled. You'll receive a confirmation email shortly."
      });

      // Refresh data
      await fetchAvailableSlots();
      if (userId) {
        await fetchUserAppointments();
      }

      // Send confirmation notification
      try {
        await supabase.functions.invoke('send-appointment-confirmation', {
          body: { appointmentId: appointment.id }
        });
      } catch (notificationError) {
        console.error('Error sending confirmation:', notificationError);
      }

      return appointment;
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Booking Failed",
        description: error.message || "Failed to book appointment. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast, fetchAvailableSlots, fetchUserAppointments]);

  // Cancel an appointment
  const cancelAppointment = useCallback(async (appointmentId: string, reason?: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: reason ? `Cancelled: ${reason}` : 'Cancelled by customer'
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled successfully."
      });

      // Refresh data
      await fetchAvailableSlots();
      if (userId) {
        await fetchUserAppointments();
      }

      // Send cancellation notification
      try {
        await supabase.functions.invoke('send-appointment-cancellation', {
          body: { appointmentId, reason }
        });
      } catch (notificationError) {
        console.error('Error sending cancellation notification:', notificationError);
      }
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchAvailableSlots, fetchUserAppointments, userId]);

  // Reschedule an appointment
  const rescheduleAppointment = useCallback(async (appointmentId: string, newSlotId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          slot_id: newSlotId,
          status: 'scheduled',
          confirmed_at: null
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: "Appointment Rescheduled",
        description: "Your appointment has been rescheduled successfully."
      });

      // Refresh data
      await fetchAvailableSlots();
      if (userId) {
        await fetchUserAppointments();
      }

      // Send reschedule notification
      try {
        await supabase.functions.invoke('send-appointment-reschedule', {
          body: { appointmentId, newSlotId }
        });
      } catch (notificationError) {
        console.error('Error sending reschedule notification:', notificationError);
      }
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      toast({
        title: "Reschedule Failed",
        description: error.message || "Failed to reschedule appointment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, fetchAvailableSlots, fetchUserAppointments, userId]);

  // Generate slots from templates
  const generateSlotsFromTemplates = useCallback(async (startDate: Date, endDate: Date) => {
    try {
      await supabase.functions.invoke('generate-appointment-slots', {
        body: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
      });

      toast({
        title: "Slots Generated",
        description: "Appointment slots have been generated successfully."
      });

      await fetchAvailableSlots(startDate, endDate);
    } catch (error: any) {
      console.error('Error generating slots:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate appointment slots.",
        variant: "destructive"
      });
    }
  }, [toast, fetchAvailableSlots]);

  // Set up real-time subscriptions
  useEffect(() => {
    let slotsChannel: any = null;
    let appointmentsChannel: any = null;

    try {
      slotsChannel = supabase
        .channel(`appointment-slots-changes-${Math.random()}`) // Unique channel name
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointment_slots'
          },
          () => {
            fetchAvailableSlots();
          }
        )
        .subscribe();

      appointmentsChannel = supabase
        .channel(`appointments-changes-${Math.random()}`) // Unique channel name
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments'
          },
          () => {
            if (userId) {
              fetchUserAppointments();
            }
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error setting up real-time subscriptions:', error);
    }

    return () => {
      try {
        if (slotsChannel) {
          supabase.removeChannel(slotsChannel);
        }
        if (appointmentsChannel) {
          supabase.removeChannel(appointmentsChannel);
        }
      } catch (error) {
        console.error('Error cleaning up subscriptions:', error);
      }
    };
  }, [userId]); // Only depend on userId, not the callback functions

  // Load initial data
  useEffect(() => {
    fetchAvailableSlots();
    fetchTemplates();
    if (userId) {
      fetchUserAppointments();
    }
  }, [fetchAvailableSlots, fetchTemplates, fetchUserAppointments, userId]);

  return {
    isLoading,
    availableSlots,
    userAppointments,
    templates,
    bookAppointment,
    cancelAppointment,
    rescheduleAppointment,
    generateSlotsFromTemplates,
    fetchAvailableSlots,
    fetchUserAppointments
  };
};