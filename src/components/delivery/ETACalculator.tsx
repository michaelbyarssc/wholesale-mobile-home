import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Navigation, 
  Clock, 
  MapPin, 
  Truck,
  RefreshCw,
  AlertTriangle,
  Route
} from "lucide-react";

interface ETACalculatorProps {
  deliveryId: string;
  deliveryAddress: string;
}

export const ETACalculator = ({ deliveryId, deliveryAddress }: ETACalculatorProps) => {
  const [etaData, setEtaData] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Get current GPS location
  const { data: currentLocation, isLoading } = useQuery({
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
    refetchInterval: 60000 // Update every minute
  });

  // Calculate ETA
  const calculateETA = async () => {
    if (!currentLocation) {
      return;
    }

    setIsCalculating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('calculate-shipping-distance', {
        body: {
          origin: `${currentLocation.latitude},${currentLocation.longitude}`,
          destination: deliveryAddress,
          delivery_id: deliveryId,
          include_traffic: true
        }
      });

      if (error) throw error;
      
      setEtaData(data);
    } catch (error) {
      console.error('Error calculating ETA:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate ETA when location changes
  useEffect(() => {
    if (currentLocation && !etaData) {
      calculateETA();
    }
  }, [currentLocation]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDistance = (meters: number) => {
    const miles = meters * 0.000621371;
    return `${miles.toFixed(1)} miles`;
  };

  const getETAStatus = () => {
    if (!etaData) return { variant: 'secondary', text: 'Calculating...' };
    
    const now = new Date();
    const eta = new Date(etaData.estimated_arrival);
    const diffMinutes = (eta.getTime() - now.getTime()) / (1000 * 60);
    
    if (diffMinutes < 30) {
      return { variant: 'destructive', text: 'Arriving Soon' };
    } else if (diffMinutes < 60) {
      return { variant: 'default', text: 'En Route' };
    } else {
      return { variant: 'secondary', text: 'In Transit' };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading GPS data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!currentLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            ETA Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No GPS data available. Driver needs to start tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = getETAStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            ETA Calculator
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={calculateETA}
            disabled={isCalculating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status</span>
          <Badge variant={status.variant as any}>
            {status.text}
          </Badge>
        </div>

        {/* ETA Information */}
        {etaData && (
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Clock className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <div className="text-lg font-semibold">
                {new Date(etaData.estimated_arrival).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                Estimated Arrival
              </div>
            </div>

            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <Route className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <div className="text-lg font-semibold">
                {formatDuration(etaData.duration_minutes)}
              </div>
              <div className="text-xs text-muted-foreground">
                Time Remaining
              </div>
            </div>
          </div>
        )}

        {/* Route Details */}
        {etaData && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Distance Remaining</span>
              <span className="font-medium">{formatDistance(etaData.distance_meters)}</span>
            </div>
            
            {etaData.traffic_conditions && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Traffic Conditions</span>
                <Badge 
                  variant="outline" 
                  className={
                    etaData.traffic_conditions === 'heavy' ? 'border-red-500 text-red-700' :
                    etaData.traffic_conditions === 'moderate' ? 'border-amber-500 text-amber-700' :
                    'border-green-500 text-green-700'
                  }
                >
                  {etaData.traffic_conditions}
                </Badge>
              </div>
            )}

            {currentLocation.speed_mph && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Current Speed</span>
                <span className="font-medium">{currentLocation.speed_mph.toFixed(1)} mph</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last GPS Update</span>
              <span className="font-medium">
                {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {/* Current Location */}
        <div className="border-t pt-4">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">Current Location</div>
              <div className="text-xs text-muted-foreground">
                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </div>
              <div className="text-xs text-muted-foreground">
                Accuracy: ±{currentLocation.accuracy_meters}m
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Destination */}
        <div className="border-t pt-4">
          <div className="flex items-start gap-2">
            <Truck className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium">Delivery Destination</div>
              <div className="text-xs text-muted-foreground">
                {deliveryAddress}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};