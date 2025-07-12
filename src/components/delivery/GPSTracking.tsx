import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Clock, Truck, AlertTriangle } from "lucide-react";
import { GPSMap } from "./GPSMap";

export const GPSTracking = () => {
  const [selectedDelivery, setSelectedDelivery] = useState<string>("all");

  const { data: activeDeliveries } = useQuery({
    queryKey: ["active-gps-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          mobile_homes(model, manufacturer),
          delivery_assignments(
            drivers(id, first_name, last_name, status)
          )
        `)
        .in("status", ["factory_pickup_in_progress", "in_transit", "delivery_in_progress"])
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: gpsData } = useQuery({
    queryKey: ["gps-tracking", selectedDelivery],
    queryFn: async () => {
      let query = supabase
        .from("delivery_gps_tracking")
        .select(`
          *,
          deliveries(delivery_number, customer_name),
          drivers(first_name, last_name)
        `)
        .eq("is_active", true)
        .order("timestamp", { ascending: false })
        .limit(50);

      if (selectedDelivery !== "all") {
        query = query.eq("delivery_id", selectedDelivery);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      factory_pickup_in_progress: { variant: "default", icon: Truck },
      in_transit: { variant: "secondary", icon: Navigation },
      delivery_in_progress: { variant: "default", icon: MapPin },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "outline", icon: MapPin };
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const getSpeedColor = (speed: number) => {
    if (speed === 0) return "text-red-600";
    if (speed < 35) return "text-yellow-600";
    if (speed < 65) return "text-green-600";
    return "text-orange-600";
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* GPS Map */}
      <GPSMap height="500px" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">GPS Tracking Details</h2>
          <p className="text-muted-foreground">Detailed location data and delivery information</p>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Updates every 30 seconds
          </span>
        </div>
      </div>

      {/* Delivery Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Delivery Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDelivery} onValueChange={setSelectedDelivery}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select delivery to track" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Active Deliveries</SelectItem>
              {activeDeliveries?.map((delivery) => (
                <SelectItem key={delivery.id} value={delivery.id}>
                  {delivery.delivery_number} - {delivery.customer_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Active Deliveries Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeDeliveries?.map((delivery) => (
          <Card key={delivery.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{delivery.delivery_number}</CardTitle>
                {getStatusBadge(delivery.status)}
              </div>
              <CardDescription>
                {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Customer:</p>
                <p className="text-sm text-muted-foreground">{delivery.customer_name}</p>
              </div>

              {delivery.delivery_assignments?.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Driver:</p>
                  <p className="text-sm text-muted-foreground">
                    {delivery.delivery_assignments[0].drivers?.first_name}{' '}
                    {delivery.delivery_assignments[0].drivers?.last_name}
                  </p>
                </div>
              )}

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setSelectedDelivery(delivery.id)}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Track This Delivery
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* GPS Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Live GPS Data
          </CardTitle>
          <CardDescription>
            Recent location updates from active deliveries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gpsData?.map((location) => (
              <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">
                    {location.deliveries?.delivery_number} - {location.deliveries?.customer_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Driver: {location.drivers?.first_name} {location.drivers?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {location.address || `${location.latitude}, ${location.longitude}`}
                  </p>
                </div>
                
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getSpeedColor(location.speed_mph || 0)}`}>
                      {location.speed_mph?.toFixed(0) || 0} mph
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(location.timestamp)}
                  </p>
                  <div className="flex items-center gap-1 text-xs">
                    {location.accuracy_meters && (
                      <>
                        <span className="text-muted-foreground">
                          ±{location.accuracy_meters.toFixed(0)}m
                        </span>
                      </>
                    )}
                    {location.battery_level && (
                      <span className={location.battery_level < 20 ? "text-red-600" : "text-green-600"}>
                        {location.battery_level}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {gpsData?.length === 0 && (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No GPS data available</p>
              <p className="text-sm text-muted-foreground">
                GPS tracking will appear here when drivers start their routes
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};