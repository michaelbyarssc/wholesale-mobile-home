import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Truck, 
  MapPin, 
  Camera, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Navigation,
  Battery,
  Signal
} from "lucide-react";

interface DriverPortalProps {
  driverProfile: any;
}

export const DriverPortal = ({ driverProfile }: DriverPortalProps) => {
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get current assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["driver-assignments", driverProfile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_assignments")
        .select(`
          *,
          deliveries(
            *,
            mobile_homes(model, manufacturer)
          )
        `)
        .eq("driver_id", driverProfile.id)
        .eq("active", true)
        .order("assigned_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Get location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(position);
        setLocationError(null);
      },
      (error) => {
        setLocationError(`Location error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("deliveries")
        .update({ status: newStatus as any })
        .eq("id", deliveryId);

      if (error) throw error;

      // Insert status history
      await supabase
        .from("delivery_status_history")
        .insert({
          delivery_id: deliveryId,
          new_status: newStatus as any,
          changed_by: driverProfile.user_id,
          notes: `Status updated by driver ${driverProfile.first_name} ${driverProfile.last_name}`
        });

    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { variant: "secondary", icon: Clock },
      factory_pickup_scheduled: { variant: "outline", icon: Truck },
      factory_pickup_in_progress: { variant: "default", icon: Truck },
      factory_pickup_completed: { variant: "default", icon: CheckCircle },
      in_transit: { variant: "default", icon: Navigation },
      delivery_in_progress: { variant: "default", icon: MapPin },
      delivered: { variant: "default", icon: CheckCircle },
      delayed: { variant: "destructive", icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Loading your assignments...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Driver Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl">Welcome, {driverProfile.first_name}!</h1>
              <p className="text-muted-foreground">Driver Portal - Employee ID: {driverProfile.employee_id}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button onClick={getCurrentLocation} variant="outline">
              <MapPin className="h-4 w-4 mr-2" />
              Get Location
            </Button>
            {currentLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Signal className="h-4 w-4" />
                Location: {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
                <span className="text-xs">
                  (±{currentLocation.coords.accuracy.toFixed(0)}m)
                </span>
              </div>
            )}
            {locationError && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {locationError}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Assignments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Active Deliveries</h2>
        
        {assignments?.map((assignment) => (
          <Card key={assignment.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {assignment.deliveries.delivery_number}
                  </CardTitle>
                  <CardDescription>
                    {assignment.deliveries.mobile_homes?.manufacturer} {assignment.deliveries.mobile_homes?.model}
                  </CardDescription>
                </div>
                {getStatusBadge(assignment.deliveries.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Customer</Label>
                  <p className="text-sm">{assignment.deliveries.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{assignment.deliveries.customer_phone}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Delivery Address</Label>
                  <p className="text-sm text-muted-foreground">
                    {assignment.deliveries.delivery_address}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Pickup Address</Label>
                  <p className="text-sm text-muted-foreground">
                    {assignment.deliveries.pickup_address}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Your Role</Label>
                  <p className="text-sm capitalize">{assignment.role} driver</p>
                </div>
              </div>

              {assignment.deliveries.special_instructions && (
                <div>
                  <Label className="text-sm font-medium">Special Instructions</Label>
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {assignment.deliveries.special_instructions}
                  </p>
                </div>
              )}

              {/* Status Update Buttons */}
              <div className="flex flex-wrap gap-2">
                {assignment.deliveries.status === 'scheduled' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.deliveries.id, 'factory_pickup_in_progress')}
                  >
                    Start Factory Pickup
                  </Button>
                )}
                
                {assignment.deliveries.status === 'factory_pickup_in_progress' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.deliveries.id, 'factory_pickup_completed')}
                  >
                    Pickup Complete
                  </Button>
                )}
                
                {assignment.deliveries.status === 'factory_pickup_completed' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.deliveries.id, 'in_transit')}
                  >
                    Start Transit
                  </Button>
                )}
                
                {assignment.deliveries.status === 'in_transit' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.deliveries.id, 'delivery_in_progress')}
                  >
                    Arrived at Delivery
                  </Button>
                )}
                
                {assignment.deliveries.status === 'delivery_in_progress' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.deliveries.id, 'delivered')}
                  >
                    Mark Delivered
                  </Button>
                )}

                <Button variant="outline" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photos
                </Button>
                
                <Button variant="outline" size="sm">
                  Report Issue
                </Button>
              </div>

              {/* Notes Section */}
              <div className="space-y-2">
                <Label htmlFor={`notes-${assignment.id}`}>Delivery Notes</Label>
                <Textarea
                  id={`notes-${assignment.id}`}
                  placeholder="Add any notes about this delivery..."
                  className="min-h-[80px]"
                />
                <Button variant="outline" size="sm">
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {assignments?.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active deliveries assigned</p>
              <p className="text-sm text-muted-foreground">
                Check back later for new assignments
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};