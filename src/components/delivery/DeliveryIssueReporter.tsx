import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, MapPin } from "lucide-react";

interface DeliveryIssueReporterProps {
  deliveryId: string;
  driverId: string;
  assignmentId: string;
}

const ISSUE_TYPES = [
  { value: 'mechanical', label: 'Mechanical Issue' },
  { value: 'route', label: 'Route Problem' },
  { value: 'weather', label: 'Weather Delay' },
  { value: 'customer', label: 'Customer Issue' },
  { value: 'permit', label: 'Permit Problem' },
  { value: 'damage', label: 'Damage Discovered' },
  { value: 'other', label: 'Other' }
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low - Minor delay expected' },
  { value: 'medium', label: 'Medium - Moderate delay' },
  { value: 'high', label: 'High - Significant delay' },
  { value: 'critical', label: 'Critical - Cannot proceed' }
];

export const DeliveryIssueReporter = ({ deliveryId, driverId, assignmentId }: DeliveryIssueReporterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [issueType, setIssueType] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const queryClient = useQueryClient();

  // Get current location when dialog opens
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCurrentLocation(position),
        (error) => console.error('Location error:', error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // Report issue mutation
  const reportIssueMutation = useMutation({
    mutationFn: async () => {
      if (!issueType || !description) {
        throw new Error('Issue type and description are required');
      }

      const issueData = {
        delivery_id: deliveryId,
        driver_id: driverId,
        assignment_id: assignmentId,
        issue_type: issueType,
        description,
        severity,
        location_lat: currentLocation?.coords.latitude,
        location_lng: currentLocation?.coords.longitude,
        created_by: driverId
      };

      const { data, error } = await supabase
        .from('delivery_issues')
        .insert(issueData)
        .select()
        .single();

      if (error) throw error;

      // Update delivery status to delayed if high/critical severity
      if (['high', 'critical'].includes(severity)) {
        await supabase
          .from('deliveries')
          .update({ status: 'delayed' })
          .eq('id', deliveryId);

        // Log status change
        await supabase
          .from('delivery_status_history')
          .insert({
            delivery_id: deliveryId,
            new_status: 'delayed',
            changed_by: driverId,
            driver_id: driverId,
            notes: `Issue reported: ${issueType} - ${description}`,
            location_lat: currentLocation?.coords.latitude,
            location_lng: currentLocation?.coords.longitude
          });
      }

      // Send notification to admins
      await supabase.functions.invoke('send-delivery-status-notification', {
        body: {
          deliveryId,
          newStatus: 'issue_reported',
          issueData: {
            type: issueType,
            severity,
            description,
            location: currentLocation ? {
              lat: currentLocation.coords.latitude,
              lng: currentLocation.coords.longitude
            } : null
          }
        }
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Issue reported successfully. Admin has been notified.");
      setIsOpen(false);
      setIssueType('');
      setDescription('');
      setSeverity('medium');
      setCurrentLocation(null);
      queryClient.invalidateQueries({ queryKey: ["driver-assignments"] });
    },
    onError: (error) => {
      toast.error(`Failed to report issue: ${error.message}`);
    }
  });

  const handleSubmit = () => {
    reportIssueMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) {
        getLocation();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Report Delivery Issue</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Location */}
          {currentLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded">
              <MapPin className="h-4 w-4" />
              <span>
                Location: {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
                (±{currentLocation.coords.accuracy.toFixed(0)}m)
              </span>
            </div>
          )}

          {/* Issue Type */}
          <div className="space-y-2">
            <Label>Issue Type *</Label>
            <select 
              className="w-full p-2 border rounded"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
            >
              <option value="">Select issue type...</option>
              {ISSUE_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label>Severity Level</Label>
            <select 
              className="w-full p-2 border rounded"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              {SEVERITY_LEVELS.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail..."
              className="min-h-[100px]"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!issueType || !description || reportIssueMutation.isPending}
              className="flex-1"
            >
              {reportIssueMutation.isPending ? 'Reporting...' : 'Report Issue'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>

          {(['high', 'critical'].includes(severity)) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2 text-amber-600" />
              <span className="text-amber-800">
                This severity level will automatically mark the delivery as delayed and notify administrators immediately.
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};