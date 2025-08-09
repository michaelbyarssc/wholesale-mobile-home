import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Truck, 
  MapPin, 
  Camera, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Navigation,
  Signal,
  Phone,
  Mail,
  Home,
  Factory,
  AlertCircle,
  Timer,
  Settings,
  KeyRound,
  Play,
  Flag,
  ClipboardList
} from "lucide-react";
import { DeliveryPhotoCapture } from "./DeliveryPhotoCapture";
import { DeliveryIssueReporter } from "./DeliveryIssueReporter";
import { GPSTracker } from "./GPSTracker";
import { QualityControl } from "./QualityControl";
import { PasswordChangeDialog } from "@/components/auth/PasswordChangeDialog";
import { DriverChecklistWizard } from "./DriverChecklistWizard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DeliveryDetailsView from "./DeliveryDetailsView";

interface EnhancedDriverPortalProps {
  driverProfile: any;
}

export const EnhancedDriverPortal = ({ driverProfile }: EnhancedDriverPortalProps) => {
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [startingMileage, setStartingMileage] = useState<number | null>(null);
  const [endingMileage, setEndingMileage] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
const [checklistDeliveryId, setChecklistDeliveryId] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);
  const queryClient = useQueryClient();

  // Get pending and active assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["driver-assignments", driverProfile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_assignments")
        .select(`
          *,
          deliveries(
            *,
            mobile_homes(model, manufacturer),
            delivery_photos(id, photo_category, photo_url, taken_at)
          )
        `)
        .eq("driver_id", driverProfile.id)
        .in("assignment_status", ["pending", "accepted", "in_progress", "started"])
        .order("assigned_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Accept assignment mutation
  const acceptAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("delivery_assignments")
        .update({ 
          assignment_status: "accepted",
          accepted_at: new Date().toISOString()
        })
        .eq("id", assignmentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-assignments"] });
      toast.success("Assignment accepted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to accept assignment: ${error.message}`);
    }
  });

  // Decline assignment mutation
  const declineAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("delivery_assignments")
        .update({ 
          assignment_status: "declined",
          declined_at: new Date().toISOString()
        })
        .eq("id", assignmentId);
      
      if (error) throw error;

      // Trigger admin notification
      const assignment = assignments?.find(a => a.id === assignmentId);
      if (assignment) {
        await supabase.functions.invoke('notify-admin-driver-decline', {
          body: {
            assignmentId,
            driverId: driverProfile.id,
            deliveryId: assignment.delivery_id
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-assignments"] });
      toast.success("Assignment declined. Admin has been notified.");
    },
    onError: (error) => {
      toast.error(`Failed to decline assignment: ${error.message}`);
    }
  });

  // NEW: Update assignment status (start/finish)
  const updateAssignmentStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: 'in_progress' | 'started' | 'completed' }) => {
      console.log('[DriverPortal] Updating assignment status', { assignmentId, status });
      const { error } = await supabase
        .from("delivery_assignments")
        .update({ assignment_status: status })
        .eq("id", assignmentId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["driver-assignments"] });
      const label = variables.status === 'completed' ? 'completed' : 'started';
      toast.success(`Assignment ${label}.`);
    },
    onError: (error: any) => {
      console.error('[DriverPortal] Failed to update assignment status:', error);
      toast.error(error?.message || "Failed to update assignment");
    }
  });

  // Get high-accuracy location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation(position);
        setGpsAccuracy(position.coords.accuracy);
        setLocationError(null);
      },
      (error) => {
        setLocationError(`Location error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  };

  // Update delivery status with GPS tracking
  const updateDeliveryStatus = async (assignmentId: string, deliveryId: string, newStatus: string) => {
    try {
      // Get current location for status update
      if (currentLocation) {
        // Update delivery status
        const { error: deliveryError } = await supabase
          .from("deliveries")
          .update({ status: newStatus as any })
          .eq("id", deliveryId);

        if (deliveryError) throw deliveryError;

        // Log status change with location
        await supabase
          .from("delivery_status_history")
          .insert({
            delivery_id: deliveryId,
            new_status: newStatus as any,
            changed_by: driverProfile.user_id,
            driver_id: driverProfile.id,
            location_lat: currentLocation.coords.latitude,
            location_lng: currentLocation.coords.longitude,
            accuracy_meters: currentLocation.coords.accuracy,
            notes: `Status updated by driver ${driverProfile.full_name || driverProfile.first_name}`
          });

        // Update assignment phase times
        const phaseKey = newStatus.replace(/_/g, '_') + '_started_at';
        await supabase
          .from("delivery_assignments")
          .update({
            phase_times: {
              [phaseKey]: new Date().toISOString()
            }
          })
          .eq("id", assignmentId);

        // Send notifications to stakeholders
        await supabase.functions.invoke('send-delivery-status-notification', {
          body: {
            deliveryId,
            newStatus,
            driverName: driverProfile.full_name || driverProfile.first_name,
            location: {
              lat: currentLocation.coords.latitude,
              lng: currentLocation.coords.longitude
            }
          }
        });

        queryClient.invalidateQueries({ queryKey: ["driver-assignments"] });
        toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      } else {
        toast.error("Please enable GPS location first");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  // Save mileage
  const saveMileage = async (assignmentId: string, type: 'starting' | 'ending', mileage: number) => {
    try {
      const updateData = type === 'starting' 
        ? { starting_mileage: mileage }
        : { ending_mileage: mileage };

      const { error } = await supabase
        .from("delivery_assignments")
        .update(updateData)
        .eq("id", assignmentId);

      if (error) throw error;
      
      toast.success(`${type} mileage saved`);
      queryClient.invalidateQueries({ queryKey: ["driver-assignments"] });
    } catch (error) {
      toast.error("Failed to save mileage");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { variant: "secondary", icon: Clock },
      factory_pickup_scheduled: { variant: "outline", icon: Factory },
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

  const getAssignmentStatusBadge = (status: string) => {
    const variants = {
      pending: "outline",
      accepted: "default",
      declined: "destructive",
      in_progress: "secondary",
      started: "secondary",
      completed: "default"
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Check GPS accuracy
  const isGPSAccurate = gpsAccuracy ? gpsAccuracy <= 50 : false;

  if (isLoading) {
    return <div>Loading your assignments...</div>;
  }

  const pendingAssignments = assignments?.filter(a => a.assignment_status === 'pending') || [];
  const activeAssignments = assignments?.filter(a => ['accepted', 'in_progress', 'started'].includes(a.assignment_status)) || [];

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
              <h1 className="text-2xl">Welcome, {driverProfile.full_name || driverProfile.first_name}!</h1>
              <p className="text-muted-foreground">Driver Portal - Employee ID: {driverProfile.employee_id}</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4 flex-wrap justify-between">
              <div className="flex gap-4 flex-wrap">
                <Button onClick={getCurrentLocation} variant="outline">
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Location
                </Button>
                
                {currentLocation && (
                  <div className="flex items-center gap-2 text-sm">
                    <Signal className="h-4 w-4" />
                    <span className={isGPSAccurate ? "text-green-600" : "text-amber-600"}>
                      GPS: ±{gpsAccuracy?.toFixed(0)}m
                    </span>
                    {!isGPSAccurate && (
                      <span className="text-xs text-amber-600">(Accuracy required: ≤50m)</span>
                    )}
                  </div>
                )}
              </div>

              <Button 
                onClick={() => setShowSettings(!showSettings)} 
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
            
            {locationError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
            )}

            {!isGPSAccurate && currentLocation && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  GPS accuracy is {gpsAccuracy?.toFixed(0)}m. For better tracking, move to an open area and try again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Driver Settings Panel */}
      {showSettings && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Driver Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Account Settings</h4>
                <Button 
                  variant="outline" 
                  onClick={() => setShowPasswordDialog(true)}
                  className="w-full justify-start"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Profile Information</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {driverProfile.first_name} {driverProfile.last_name}</p>
                  <p><strong>Employee ID:</strong> {driverProfile.employee_id}</p>
                  <p><strong>License:</strong> {driverProfile.license_number}</p>
                  <p><strong>Phone:</strong> {driverProfile.phone}</p>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                variant="ghost" 
                onClick={() => setShowSettings(false)}
                size="sm"
              >
                Close Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Password Change Dialog */}
      <PasswordChangeDialog 
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
      />

      {/* Pending Assignments */}
      {pendingAssignments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Pending Assignments ({pendingAssignments.length})
          </h2>
          
          {pendingAssignments.map((assignment) => (
            <Card key={assignment.id} className="border-amber-200 bg-amber-50/50">
              <CardHeader onClick={() => setSelectedDelivery(assignment.deliveries)} className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {assignment.deliveries.transaction_number || assignment.deliveries.delivery_number}
                    </CardTitle>
                    <CardDescription>
                      {assignment.deliveries.mobile_homes?.manufacturer} {assignment.deliveries.mobile_homes?.model}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getAssignmentStatusBadge(assignment.assignment_status)}
                    {getStatusBadge(assignment.deliveries.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Customer Details
                    </Label>
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{assignment.deliveries.customer_name}</p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        {assignment.deliveries.customer_phone}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        {assignment.deliveries.customer_email}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mobile Home Details</Label>
                    <div className="text-sm space-y-1">
                      <p>{assignment.deliveries.mobile_homes?.manufacturer} {assignment.deliveries.mobile_homes?.model}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Factory className="h-4 w-4" />
                      Pickup Address
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {assignment.deliveries.pickup_address}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Delivery Address
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {assignment.deliveries.delivery_address}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Your Role</Label>
                    <p className="text-sm capitalize">{assignment.role} driver</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Assigned
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(assignment.assigned_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                {assignment.deliveries.special_instructions && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Special Instructions</Label>
                    <div className="text-sm bg-amber-100 p-3 rounded border border-amber-200">
                      {assignment.deliveries.special_instructions}
                    </div>
                  </div>
                )}

                {/* Accept/Decline Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Are you sure you want to accept this delivery assignment?"
                      );
                      if (confirmed) {
                        acceptAssignmentMutation.mutate(assignment.id);
                      }
                    }}
                    className="flex-1"
                    disabled={acceptAssignmentMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Assignment
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Are you sure you want to decline this delivery assignment? This will notify the admin."
                      );
                      if (confirmed) {
                        declineAssignmentMutation.mutate(assignment.id);
                      }
                    }}
                    disabled={declineAssignmentMutation.isPending}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Active Assignments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Active Deliveries ({activeAssignments.length})</h2>
        
        {activeAssignments.map((assignment) => (
          <Card key={assignment.id}>
            <CardHeader onClick={() => setSelectedDelivery(assignment.deliveries)} className="cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {assignment.deliveries.transaction_number || assignment.deliveries.delivery_number}
                  </CardTitle>
                  <CardDescription>
                    {assignment.deliveries.mobile_homes?.manufacturer} {assignment.deliveries.mobile_homes?.model}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {getAssignmentStatusBadge(assignment.assignment_status)}
                  {getStatusBadge(assignment.deliveries.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* NEW: Assignment Controls */}
              <div className="flex flex-wrap gap-2">
                {assignment.assignment_status === 'accepted' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      const confirmed = window.confirm("Start this assignment now?");
                      if (confirmed) {
                        // Prefer 'in_progress', fall back to 'started' if needed
                        updateAssignmentStatusMutation.mutate({ assignmentId: assignment.id, status: 'in_progress' });
                      }
                    }}
                    disabled={updateAssignmentStatusMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Assignment
                  </Button>
                )}

                {['in_progress', 'started'].includes(assignment.assignment_status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const confirmed = window.confirm("Mark this assignment as completed?");
                      if (confirmed) {
                        updateAssignmentStatusMutation.mutate({ assignmentId: assignment.id, status: 'completed' });
                      }
                    }}
                    disabled={updateAssignmentStatusMutation.isPending}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Complete Assignment
                  </Button>
                )}

                {/* Start Guided Checklist */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setChecklistDeliveryId(assignment.deliveries.id)}
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Start Guided Checklist
                </Button>
              </div>

              {/* Mileage Tracking */}
              {assignment.assignment_status === 'accepted' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label>Starting Mileage</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Enter odometer reading"
                        value={startingMileage || assignment.starting_mileage || ''}
                        onChange={(e) => setStartingMileage(Number(e.target.value))}
                      />
                      <Button
                        size="sm"
                        onClick={() => startingMileage && saveMileage(assignment.id, 'starting', startingMileage)}
                        disabled={!startingMileage}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Ending Mileage</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Enter final reading"
                        value={endingMileage || assignment.ending_mileage || ''}
                        onChange={(e) => setEndingMileage(Number(e.target.value))}
                      />
                      <Button
                        size="sm"
                        onClick={() => endingMileage && saveMileage(assignment.id, 'ending', endingMileage)}
                        disabled={!endingMileage}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* GPS Tracker Component */}
              {assignment.assignment_status === 'accepted' && 
               ['factory_pickup_in_progress', 'in_transit', 'delivery_in_progress'].includes(assignment.deliveries.status) && (
                <GPSTracker 
                  deliveryId={assignment.deliveries.id}
                  driverId={driverProfile.id}
                  isActive={true}
                />
              )}

              {/* Quality Control */}
              <QualityControl 
                deliveryId={assignment.deliveries.id}
                assignmentId={assignment.id}
                currentStatus={assignment.deliveries.status}
              />

              {/* Status Update Buttons */}
              <div className="flex flex-wrap gap-2">
                {assignment.deliveries.status === 'scheduled' && assignment.assignment_status === 'accepted' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.id, assignment.deliveries.id, 'factory_pickup_in_progress')}
                    disabled={!isGPSAccurate}
                  >
                    Start Factory Pickup
                  </Button>
                )}
                
                {assignment.deliveries.status === 'factory_pickup_in_progress' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.id, assignment.deliveries.id, 'factory_pickup_completed')}
                  >
                    Pickup Complete
                  </Button>
                )}
                
                {assignment.deliveries.status === 'factory_pickup_completed' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.id, assignment.deliveries.id, 'in_transit')}
                  >
                    Start Transit
                  </Button>
                )}
                
                {assignment.deliveries.status === 'in_transit' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.id, assignment.deliveries.id, 'delivery_in_progress')}
                  >
                    Arrived at Delivery
                  </Button>
                )}
                
                {assignment.deliveries.status === 'delivery_in_progress' && (
                  <Button 
                    size="sm"
                    onClick={() => updateDeliveryStatus(assignment.id, assignment.deliveries.id, 'delivered')}
                  >
                    Mark Delivered
                  </Button>
                )}

                {/* Photo Capture */}
                <DeliveryPhotoCapture 
                  deliveryId={assignment.deliveries.id}
                  driverId={driverProfile.id}
                  currentPhase={assignment.deliveries.status}
                />
                
                {/* Issue Reporter */}
                <DeliveryIssueReporter 
                  deliveryId={assignment.deliveries.id}
                  driverId={driverProfile.id}
                  assignmentId={assignment.id}
                />
              </div>
              <DriverChecklistWizard
                open={checklistDeliveryId === assignment.deliveries.id}
                onClose={() => setChecklistDeliveryId(null)}
                deliveryId={assignment.deliveries.id}
                driverId={driverProfile.id}
                currentStatus={assignment.deliveries.status}
              />
            </CardContent>
          </Card>
        ))}

        {assignments?.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No deliveries assigned</p>
              <p className="text-sm text-muted-foreground">
                Check back later for new assignments
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedDelivery} onOpenChange={(open) => !open && setSelectedDelivery(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Delivery Details - {selectedDelivery?.transaction_number || selectedDelivery?.delivery_number || selectedDelivery?.customer_name}
            </DialogTitle>
          </DialogHeader>
          {selectedDelivery && <DeliveryDetailsView delivery={selectedDelivery} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
