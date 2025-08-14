import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ETAData {
  estimated_arrival: string;
  duration_minutes: number;
  distance_meters: number;
  traffic_conditions?: 'light' | 'moderate' | 'heavy';
  alternate_routes?: Array<{
    duration_minutes: number;
    distance_meters: number;
    description: string;
  }>;
}

export function useETACalculation(deliveryId: string, deliveryAddress: string) {
  const [etaData, setEtaData] = useState<ETAData | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Get current GPS location
  const { data: currentLocation, refetch: refetchLocation } = useQuery({
    queryKey: ['current-gps', deliveryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_gps_tracking')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    },
    refetchInterval: 30000, // Update every 30 seconds
    enabled: !!deliveryId
  });

  // Calculate ETA
  const calculateETA = async (includeTraffic = true) => {
    if (!currentLocation || !deliveryAddress) {
      return null;
    }

    setIsCalculating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('calculate-shipping-distance', {
        body: {
          origin: `${currentLocation.latitude},${currentLocation.longitude}`,
          destination: deliveryAddress,
          delivery_id: deliveryId,
          include_traffic: includeTraffic,
          include_alternatives: true
        }
      });

      if (error) throw error;
      
      setEtaData(data);
      return data;
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return null;
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate ETA when location changes
  useEffect(() => {
    if (currentLocation && deliveryAddress) {
      calculateETA();
    }
  }, [currentLocation?.timestamp, deliveryAddress]);

  // Calculate time until arrival
  const getTimeUntilArrival = () => {
    if (!etaData?.estimated_arrival) return null;
    
    const now = new Date();
    const eta = new Date(etaData.estimated_arrival);
    const diffMs = eta.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    return {
      minutes: diffMinutes,
      hours: Math.floor(diffMinutes / 60),
      isOverdue: diffMinutes < 0,
      formatted: formatDuration(Math.abs(diffMinutes))
    };
  };

  // Get arrival status
  const getArrivalStatus = () => {
    const timeUntil = getTimeUntilArrival();
    
    if (!timeUntil) return 'unknown';
    
    if (timeUntil.isOverdue) return 'overdue';
    if (timeUntil.minutes <= 15) return 'arriving_soon';
    if (timeUntil.minutes <= 60) return 'en_route';
    return 'in_transit';
  };

  // Format duration helper
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Format distance helper
  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371;
    if (miles >= 1) {
      return `${miles.toFixed(1)} mi`;
    }
    const feet = meters * 3.28084;
    return `${feet.toFixed(0)} ft`;
  };

  // Get traffic delay
  const getTrafficDelay = () => {
    if (!etaData?.alternate_routes?.length) return null;
    
    const fastestRoute = etaData.alternate_routes.reduce((fastest, route) => 
      route.duration_minutes < fastest.duration_minutes ? route : fastest
    );
    
    const delay = etaData.duration_minutes - fastestRoute.duration_minutes;
    return delay > 5 ? delay : 0; // Only show significant delays
  };

  return {
    etaData,
    currentLocation,
    isCalculating,
    calculateETA,
    getTimeUntilArrival,
    getArrivalStatus,
    formatDuration,
    formatDistance,
    getTrafficDelay,
    refetchLocation
  };
}