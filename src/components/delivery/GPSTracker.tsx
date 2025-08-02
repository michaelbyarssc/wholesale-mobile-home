import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Navigation, 
  Signal, 
  Battery, 
  Clock, 
  MapPin, 
  AlertTriangle,
  Play,
  Pause,
  TrendingUp
} from "lucide-react";
import GPSOptimizer, { GPSPerformanceMonitor, type GPSPoint } from "@/utils/gpsOptimization";

interface GPSTrackerProps {
  deliveryId: string;
  driverId: string;
  isActive: boolean;
}

interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: Date;
}

export const GPSTracker = ({ deliveryId, driverId, isActive }: GPSTrackerProps) => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GPSPoint | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [trackingInterval, setTrackingInterval] = useState<number>(60000); // 60 seconds default
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const gpsOptimizerRef = useRef<GPSOptimizer | null>(null);
  const performanceMonitorRef = useRef<GPSPerformanceMonitor>(new GPSPerformanceMonitor());
  const offlineQueueRef = useRef<GPSPoint[]>([]);

  // GPS logging mutation with optimization
  const logGPSMutation = useMutation({
    mutationFn: async (gpsData: GPSPoint) => {
      // Use GPS optimizer if available
      if (gpsOptimizerRef.current) {
        const wasSignificant = gpsOptimizerRef.current.addGPSPoint(gpsData);
        performanceMonitorRef.current.recordGPSPoint(gpsData, !wasSignificant);
        
        if (!wasSignificant) {
          return; // Point was filtered out
        }
      }

      const { error } = await supabase
        .from('delivery_gps_tracking')
        .insert({
          delivery_id: deliveryId,
          driver_id: driverId,
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          accuracy_meters: gpsData.accuracy,
          speed_mph: gpsData.speed,
          heading: gpsData.heading,
          timestamp: gpsData.timestamp.toISOString(),
          meets_accuracy_requirement: gpsData.accuracy <= 50,
          battery_level: gpsData.batteryLevel
        });

      if (error) throw error;
      
      performanceMonitorRef.current.recordNetworkRequest();
    },
    onError: (error) => {
      // If online logging fails, queue for offline sync
      if (currentLocation) {
        offlineQueueRef.current.push(currentLocation);
        console.log('GPS data queued for offline sync');
      }
    }
  });

  // Sync offline data using optimized batch processing
  const syncOfflineData = async () => {
    if (offlineQueueRef.current.length > 0) {
      console.log(`Syncing ${offlineQueueRef.current.length} GPS points`);
      
      const { error } = await supabase.functions.invoke('process-gps-batch', {
        body: {
          points: offlineQueueRef.current,
          deliveryId,
          driverId,
          batchStartTime: offlineQueueRef.current[0]?.timestamp || new Date(),
          batchEndTime: offlineQueueRef.current[offlineQueueRef.current.length - 1]?.timestamp || new Date()
        }
      });

      if (!error) {
        offlineQueueRef.current = [];
        toast.success('Offline GPS data synced successfully');
      }
    }
  };

  // Get battery level
  const getBatteryLevel = async () => {
    try {
      if ('getBattery' in navigator) {
        const battery: any = await (navigator as any).getBattery();
        setBatteryLevel(Math.round(battery.level * 100));
      }
    } catch (error) {
      console.log('Battery API not available');
    }
  };

  // Start GPS tracking with optimization
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported');
      return;
    }

    setIsTracking(true);
    getBatteryLevel();

    // Initialize GPS optimizer
    gpsOptimizerRef.current = new GPSOptimizer(deliveryId, driverId);

    // Get adaptive interval based on context
    const adaptiveInterval = gpsOptimizerRef.current.getAdaptiveInterval(
      isActive,
      batteryLevel || undefined,
      currentLocation?.accuracy
    );
    setTrackingInterval(adaptiveInterval);

    // Start position watching
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const gpsData: GPSPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          timestamp: new Date(),
          batteryLevel: batteryLevel || undefined
        };

        setCurrentLocation(gpsData);
        setLastUpdate(new Date());

        // Log GPS data immediately for high accuracy or significant movement
        if (position.coords.accuracy <= 50) {
          logGPSMutation.mutate(gpsData);
        }
      },
      (error) => {
        console.error('GPS error:', error);
        toast.error(`GPS error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );

    // Set up periodic logging with adaptive interval
    intervalRef.current = setInterval(() => {
      if (currentLocation) {
        logGPSMutation.mutate(currentLocation);
      }
    }, adaptiveInterval);

    // Set up offline sync check
    const syncInterval = setInterval(syncOfflineData, 300000); // Every 5 minutes

    // Cleanup on component unmount
    return () => clearInterval(syncInterval);
  };

  // Stop GPS tracking with cleanup
  const stopTracking = () => {
    setIsTracking(false);
    
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Final sync and cleanup
    if (gpsOptimizerRef.current) {
      gpsOptimizerRef.current.cleanup();
    }
    
    syncOfflineData();
  };

  // Auto-start tracking when active
  useEffect(() => {
    if (isActive && !isTracking) {
      startTracking();
    } else if (!isActive && isTracking) {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy <= 10) return 'text-green-600';
    if (accuracy <= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSignalStrength = (accuracy: number) => {
    if (accuracy <= 10) return 'Excellent';
    if (accuracy <= 30) return 'Good';
    if (accuracy <= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            GPS Tracking
          </div>
          <div className="flex items-center gap-2">
            {isTracking ? (
              <Badge variant="default" className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Active
              </Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location */}
        {currentLocation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/50 rounded">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Location</span>
              </div>
              <div className="text-xs font-mono">
                <div>Lat: {currentLocation.latitude.toFixed(6)}</div>
                <div>Lng: {currentLocation.longitude.toFixed(6)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Signal className="h-4 w-4" />
                <span className="font-medium">Accuracy</span>
              </div>
              <div className="text-xs">
                <div className={getAccuracyColor(currentLocation.accuracy)}>
                  ±{currentLocation.accuracy.toFixed(0)}m ({getSignalStrength(currentLocation.accuracy)})
                </div>
                {currentLocation.speed && (
                  <div>Speed: {(currentLocation.speed * 2.237).toFixed(1)} mph</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status Information */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <div>
              <div className="text-xs text-muted-foreground">Update Interval</div>
              <div>{trackingInterval / 1000}s</div>
            </div>
          </div>

          {lastUpdate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <div>
                <div className="text-xs text-muted-foreground">Last Update</div>
                <div>{lastUpdate.toLocaleTimeString()}</div>
              </div>
            </div>
          )}

          {batteryLevel !== null && (
            <div className="flex items-center gap-2">
              <Battery className="h-4 w-4" />
              <div>
                <div className="text-xs text-muted-foreground">Battery</div>
                <div>{batteryLevel}%</div>
              </div>
            </div>
          )}

          {offlineQueueRef.current.length > 0 && (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <div className="text-xs">Offline Queue</div>
                <div>{offlineQueueRef.current.length} points</div>
              </div>
            </div>
          )}
        </div>

        {/* Manual Controls */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button size="sm" onClick={startTracking}>
              <Play className="h-4 w-4 mr-2" />
              Start Tracking
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={stopTracking}>
              <Pause className="h-4 w-4 mr-2" />
              Stop Tracking
            </Button>
          )}

          {offlineQueueRef.current.length > 0 && (
            <Button size="sm" variant="outline" onClick={syncOfflineData}>
              Sync Offline Data ({offlineQueueRef.current.length})
            </Button>
          )}
        </div>

        {/* Accuracy Warning */}
        {currentLocation && currentLocation.accuracy > 50 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <span>
              GPS accuracy is {currentLocation.accuracy.toFixed(0)}m. Move to an open area for better accuracy.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};