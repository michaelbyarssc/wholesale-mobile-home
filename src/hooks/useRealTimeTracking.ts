import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TrackingData {
  delivery_id: string;
  driver_name: string;
  current_location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
  };
  delivery_address: string;
  pickup_address: string;
  status: string;
  estimated_arrival: string | null;
  mobile_home_details: {
    manufacturer: string;
    model: string;
    year?: number;
  };
  order_number: string;
  delivery_pieces: Array<{
    piece_number: number;
    piece_type: string;
    status: string;
    vin_number: string;
    mso_number: string;
  }>;
  customer_info: {
    name: string;
    phone: string;
    email: string;
  };
}

interface UseRealTimeTrackingProps {
  trackingToken: string;
  enabled?: boolean;
}

export const useRealTimeTracking = ({ trackingToken, enabled = true }: UseRealTimeTrackingProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Query to get tracking session and delivery data
  const {
    data: trackingData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['real-time-tracking', trackingToken],
    queryFn: async (): Promise<TrackingData | null> => {
      if (!trackingToken) return null;

      // Get tracking session and order info
      const { data: session, error: sessionError } = await supabase
        .from('customer_tracking_sessions')
        .select(`
          *,
          order:orders!inner (
            id,
            order_number,
            customer_name,
            customer_phone,
            customer_email
          )
        `)
        .eq('session_token', trackingToken)
        .eq('active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (sessionError || !session) {
        throw new Error('Invalid tracking token or session expired');
      }

      // Get delivery info using customer email
      const { data: deliveries, error: deliveryError } = await supabase
        .from('deliveries')
        .select(`
          *,
          mobile_homes (
            manufacturer,
            model
          ),
          delivery_pieces (
            piece_number,
            piece_type,
            status,
            vin_number,
            mso_number
          )
        `)
        .eq('customer_email', session.order.customer_email)
        .order('created_at', { ascending: false })
        .limit(1);

      if (deliveryError || !deliveries || deliveries.length === 0) {
        throw new Error('No delivery found for this tracking session');
      }

      const delivery = deliveries[0];

      // Get latest GPS location for the delivery
      const { data: gpsData, error: gpsError } = await supabase
        .from('delivery_gps_tracking')
        .select('*')
        .eq('delivery_id', delivery.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Calculate ETA if we have GPS data
      let estimated_arrival = null;
      if (gpsData) {
        try {
          const { data: etaData } = await supabase.rpc('calculate_delivery_eta', {
            delivery_id_param: delivery.id,
            current_lat: gpsData.latitude,
            current_lng: gpsData.longitude
          });
          estimated_arrival = etaData;
        } catch (etaError) {
          console.warn('Failed to calculate ETA:', etaError);
        }
      }

      return {
        delivery_id: delivery.id,
        driver_name: 'Driver', // We'll get this from assignments later
        current_location: gpsData ? {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          accuracy: gpsData.accuracy_meters,
          speed: gpsData.speed_mph,
          heading: gpsData.heading
        } : null,
        delivery_address: delivery.delivery_address,
        pickup_address: delivery.pickup_address,
        status: delivery.status,
        estimated_arrival,
        mobile_home_details: {
          manufacturer: delivery.mobile_homes?.manufacturer || 'Unknown',
          model: delivery.mobile_homes?.model || 'Unknown'
        },
        order_number: session.order.order_number,
        delivery_pieces: delivery.delivery_pieces || [],
        customer_info: {
          name: session.order.customer_name,
          phone: session.order.customer_phone,
          email: session.order.customer_email
        }
      };
    },
    enabled: enabled && !!trackingToken,
    refetchInterval: 120000, // Refetch every 2 minutes as specified
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Set up real-time subscription for GPS updates
  useEffect(() => {
    if (!trackingData?.delivery_id || !enabled) return;

    const channel = supabase
      .channel('gps-tracking')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'delivery_gps_tracking',
          filter: `delivery_id=eq.${trackingData.delivery_id}`
        },
        (payload) => {
          console.log('New GPS update received:', payload);
          // Trigger a refetch to get updated data
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `id=eq.${trackingData.delivery_id}`
        },
        (payload) => {
          console.log('Delivery status updated:', payload);
          refetch();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionError('Failed to establish real-time connection');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionError('Real-time connection timed out');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [trackingData?.delivery_id, enabled, refetch]);

  // Update last viewed timestamp
  useEffect(() => {
    if (!trackingToken || !enabled) return;

    const updateLastViewed = async () => {
      await supabase
        .from('customer_tracking_sessions')
        .update({ last_viewed: new Date().toISOString() })
        .eq('session_token', trackingToken);
    };

    updateLastViewed();
    
    // Update every 5 minutes while viewing
    const interval = setInterval(updateLastViewed, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [trackingToken, enabled]);

  return {
    trackingData,
    isLoading,
    error: error?.message || connectionError,
    isConnected,
    refetch
  };
};