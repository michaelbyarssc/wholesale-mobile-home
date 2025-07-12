import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  MapPin, 
  Camera, 
  Clock, 
  Route, 
  CheckCircle, 
  AlertCircle, 
  Phone,
  Navigation,
  Battery,
  Wifi,
  Image as ImageIcon,
  Upload,
  Play,
  Pause,
  FileText
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SignaturePad from 'signature_pad';

interface DriverMobileAppProps {
  driverProfile: any;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

interface PhotoUpload {
  file: File;
  category: 'pickup_front' | 'pickup_back' | 'pickup_left' | 'pickup_right' | 'delivery_front' | 'delivery_back' | 'delivery_left' | 'delivery_right' | 'issue';
  caption?: string;
}

export const DriverMobileApp = ({ driverProfile }: DriverMobileAppProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GPSLocation | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [mileageStart, setMileageStart] = useState<number>(0);
  const [mileageEnd, setMileageEnd] = useState<number>(0);
  const [timeStart, setTimeStart] = useState<Date | null>(null);
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [issueDescription, setIssueDescription] = useState('');
  const signaturePadRef = useRef<HTMLCanvasElement>(null);
  const signaturePad = useRef<SignaturePad | null>(null);

  // Fetch active delivery assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['driver-assignments', driverProfile.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          deliveries (
            *,
            mobile_homes (
              model,
              manufacturer,
              width_feet,
              length_feet
            )
          )
        `)
        .eq('driver_id', driverProfile.id)
        .eq('active', true);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Initialize signature pad
  useEffect(() => {
    if (signaturePadRef.current) {
      signaturePad.current = new SignaturePad(signaturePadRef.current, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: 'rgb(0, 0, 0)',
        minWidth: 0.5,
        maxWidth: 2.5,
      });
    }
  }, []);

  // GPS tracking functions
  const startTracking = () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Not Available",
        description: "Your device doesn't support GPS tracking.",
        variant: "destructive",
      });
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
        };
        
        setCurrentLocation(location);
        
        // Update location in database
        if (selectedDelivery) {
          updateGPSLocation(location);
        }
      },
      (error) => {
        console.error('GPS Error:', error);
        toast({
          title: "GPS Error",
          description: "Unable to get your location. Check GPS settings.",
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    setWatchId(id);
    setIsTracking(true);
    setTimeStart(new Date());
    
    toast({
      title: "GPS Tracking Started",
      description: "Your location is now being tracked.",
    });
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    
    toast({
      title: "GPS Tracking Stopped",
      description: "Location tracking has been disabled.",
    });
  };

  // Update GPS location in database
  const updateGPSLocation = async (location: GPSLocation) => {
    try {
      const { error } = await supabase
        .from('delivery_gps_tracking')
        .insert({
          delivery_id: selectedDelivery,
          driver_id: driverProfile.id,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy_meters: location.accuracy,
          speed_mph: location.speed ? location.speed * 2.237 : null, // Convert m/s to mph
          heading: location.heading,
          is_active: isTracking,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating GPS location:', error);
    }
  };

  // Photo upload handler
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>, category: PhotoUpload['category']) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files).map(file => ({
        file,
        category,
        caption: '',
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  // Status update mutation
  const statusUpdateMutation = useMutation({
    mutationFn: async ({ deliveryId, status, notes }: { 
      deliveryId: string; 
      status: 'pending_payment' | 'scheduled' | 'factory_pickup_scheduled' | 'factory_pickup_in_progress' | 'factory_pickup_completed' | 'in_transit' | 'delivery_in_progress' | 'delivered' | 'completed' | 'cancelled' | 'delayed'; 
      notes?: string 
    }) => {
      // Update delivery status
      const { error: deliveryError } = await supabase
        .from('deliveries')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', deliveryId);

      if (deliveryError) throw deliveryError;

      // Add status history
      const { error: historyError } = await supabase
        .from('delivery_status_history')
        .insert({
          delivery_id: deliveryId,
          new_status: status,
          notes: notes || `Status updated by driver ${driverProfile.first_name} ${driverProfile.last_name}`,
          changed_by: driverProfile.user_id,
        });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      toast({
        title: "Status Updated",
        description: "Delivery status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Status update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update delivery status.",
        variant: "destructive",
      });
    },
  });

  // Log hours and mileage
  const logHoursMutation = useMutation({
    mutationFn: async ({ assignmentId, hours, mileage }: { assignmentId: string; hours: number; mileage: number }) => {
      const { error } = await supabase
        .from('delivery_assignments')
        .update({
          hours_logged: hours,
          mileage_logged: mileage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Hours Logged",
        description: "Time and mileage have been recorded.",
      });
    },
  });

  const calculateHours = () => {
    if (timeStart) {
      const now = new Date();
      const diffMs = now.getTime() - timeStart.getTime();
      return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    }
    return 0;
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="h-40 bg-muted rounded-lg"></div>
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  const activeAssignment = assignments.find(a => a.id === selectedDelivery) || assignments[0];

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Driver Portal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Welcome, {driverProfile.first_name}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Wifi className="h-4 w-4 text-green-500" />
                <Battery className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* GPS Tracking Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>GPS Tracking</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                Status: <Badge variant={isTracking ? "default" : "secondary"}>
                  {isTracking ? "Active" : "Inactive"}
                </Badge>
              </p>
              {currentLocation && (
                <p className="text-sm text-muted-foreground mt-1">
                  Accuracy: {Math.round(currentLocation.accuracy || 0)}m
                  {currentLocation.speed && ` • Speed: ${Math.round(currentLocation.speed * 2.237)}mph`}
                </p>
              )}
            </div>
            <Button
              onClick={isTracking ? stopTracking : startTracking}
              variant={isTracking ? "destructive" : "default"}
              size="sm"
              className="flex items-center space-x-2"
            >
              {isTracking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isTracking ? "Stop" : "Start"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Active Deliveries ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No active deliveries assigned
            </p>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedDelivery === assignment.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedDelivery(assignment.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{assignment.deliveries.delivery_number}</Badge>
                        <Badge variant={
                          assignment.deliveries.status === 'in_transit' ? 'default' :
                          assignment.deliveries.status === 'delivered' ? 'default' : 'secondary'
                        }>
                          {assignment.deliveries.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-medium">{assignment.deliveries.customer_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.deliveries.mobile_homes?.manufacturer} {assignment.deliveries.mobile_homes?.model}
                        </p>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Pickup:</strong> {assignment.deliveries.pickup_address}</p>
                        <p><strong>Delivery:</strong> {assignment.deliveries.delivery_address}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge variant="outline">{assignment.role}</Badge>
                      {assignment.started_at && (
                        <p className="text-xs text-muted-foreground">
                          Started: {new Date(assignment.started_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Actions (only show if delivery selected) */}
      {activeAssignment && (
        <>
          {/* Status Updates */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => statusUpdateMutation.mutate({
                    deliveryId: activeAssignment.deliveries.id,
                    status: 'factory_pickup_in_progress'
                  })}
                  variant="outline"
                  size="sm"
                  className="h-auto p-4"
                >
                  <div className="text-center">
                    <Route className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-xs">Start Pickup</span>
                  </div>
                </Button>
                
                <Button
                  onClick={() => statusUpdateMutation.mutate({
                    deliveryId: activeAssignment.deliveries.id,
                    status: 'in_transit'
                  })}
                  variant="outline"
                  size="sm"
                  className="h-auto p-4"
                >
                  <div className="text-center">
                    <Navigation className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-xs">En Route</span>
                  </div>
                </Button>

                <Button
                  onClick={() => statusUpdateMutation.mutate({
                    deliveryId: activeAssignment.deliveries.id,
                    status: 'delivery_in_progress'
                  })}
                  variant="outline"
                  size="sm"
                  className="h-auto p-4"
                >
                  <div className="text-center">
                    <MapPin className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-xs">Arrived</span>
                  </div>
                </Button>

                <Button
                  onClick={() => statusUpdateMutation.mutate({
                    deliveryId: activeAssignment.deliveries.id,
                    status: 'delivered'
                  })}
                  variant="outline"
                  size="sm"
                  className="h-auto p-4"
                >
                  <div className="text-center">
                    <CheckCircle className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-xs">Complete</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Photo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5" />
                <span>Photos ({photos.length}/40)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { category: 'pickup_front', label: 'Pickup Front' },
                  { category: 'pickup_back', label: 'Pickup Back' },
                  { category: 'delivery_front', label: 'Delivery Front' },
                  { category: 'delivery_back', label: 'Delivery Back' },
                ].map(({ category, label }) => (
                  <div key={category}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={(e) => handlePhotoUpload(e, category as PhotoUpload['category'])}
                        className="hidden"
                        id={`photo-${category}`}
                      />
                      <Label htmlFor={`photo-${category}`} className="cursor-pointer">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-xs">Add Photos</p>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>

              {photos.length > 0 && (
                <div className="space-y-2">
                  <Label>Uploaded Photos</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(photo.file)}
                          alt={photo.category}
                          className="w-full h-20 object-cover rounded"
                        />
                        <Badge
                          variant="secondary"
                          className="absolute top-1 left-1 text-xs"
                        >
                          {photo.category.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hours & Mileage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Time & Mileage</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hours Worked</Label>
                  <p className="text-2xl font-bold text-primary">
                    {calculateHours()}h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {timeStart ? `Started: ${timeStart.toLocaleTimeString()}` : 'Not started'}
                  </p>
                </div>
                <div>
                  <Label>Mileage</Label>
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Start miles"
                      value={mileageStart || ''}
                      onChange={(e) => setMileageStart(Number(e.target.value))}
                    />
                    <Input
                      type="number"
                      placeholder="End miles"
                      value={mileageEnd || ''}
                      onChange={(e) => setMileageEnd(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={() => logHoursMutation.mutate({
                  assignmentId: activeAssignment.id,
                  hours: calculateHours(),
                  mileage: mileageEnd - mileageStart
                })}
                className="w-full"
                disabled={!timeStart || mileageEnd <= mileageStart}
              >
                Log Hours & Mileage
              </Button>
            </CardContent>
          </Card>

          {/* Digital Signature */}
          <Card>
            <CardHeader>
              <CardTitle>Digital Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg">
                <canvas
                  ref={signaturePadRef}
                  width="300"
                  height="150"
                  className="w-full h-32 touch-action-none"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => signaturePad.current?.clear()}
                  size="sm"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => {
                    if (signaturePad.current && !signaturePad.current.isEmpty()) {
                      const dataURL = signaturePad.current.toDataURL();
                      // Save signature logic here
                      toast({
                        title: "Signature Saved",
                        description: "Digital signature has been captured.",
                      });
                    }
                  }}
                  size="sm"
                >
                  Save Signature
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Issue Reporting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5" />
                <span>Report Issue</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe any issues found..."
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
              />
              <div>
                <Label>Issue Photos</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(e) => handlePhotoUpload(e, 'issue')}
                    className="hidden"
                    id="issue-photos"
                  />
                  <Label htmlFor="issue-photos" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">Upload Issue Photos</p>
                  </Label>
                </div>
              </div>
              <Button
                className="w-full"
                variant="destructive"
                disabled={!issueDescription.trim()}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Submit Issue Report
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};