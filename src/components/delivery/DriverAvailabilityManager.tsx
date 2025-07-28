import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Clock, User, Phone, Settings, Calendar, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  phone: string;
  email?: string;
  delivery_assignments?: Array<{
    id: string;
    deliveries: {
      status: string;
      scheduled_pickup_date_tz: string | null;
      delivery_number: string;
    };
  }>;
}

interface Props {
  drivers: Driver[];
}

export const DriverAvailabilityManager: React.FC<Props> = ({ drivers }) => {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  type DriverStatus = 'available' | 'on_delivery' | 'off_duty' | 'inactive';
  const [statusUpdate, setStatusUpdate] = useState<DriverStatus | ''>('');
  const [notes, setNotes] = useState<string>('');
  const queryClient = useQueryClient();

  const updateDriverStatusMutation = useMutation({
    mutationFn: async ({ driverId, status, notes }: { driverId: string; status: DriverStatus; notes?: string }) => {
      const { error } = await supabase
        .from('drivers')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (error) throw error;

      // Log the status change in audit log if needed
      // Could also create a driver_status_history table
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers-with-assignments'] });
      toast({
        title: "Status Updated",
        description: "Driver status has been updated successfully.",
      });
      setIsDialogOpen(false);
      setSelectedDriver(null);
      setStatusUpdate('');
      setNotes('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update driver status. Please try again.",
        variant: "destructive",
      });
    }
  });

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'bg-green-100 text-green-800 border-green-200',
      on_delivery: 'bg-blue-100 text-blue-800 border-blue-200',
      off_duty: 'bg-gray-100 text-gray-800 border-gray-200',
      inactive: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getActiveAssignments = (driver: Driver) => {
    return driver.delivery_assignments?.filter(assignment =>
      !['delivered', 'completed', 'cancelled'].includes(assignment.deliveries?.status || '')
    ) || [];
  };

  const getNextScheduledDelivery = (driver: Driver) => {
    const activeAssignments = getActiveAssignments(driver);
    const upcoming = activeAssignments
      .filter(assignment => assignment.deliveries?.scheduled_pickup_date_tz)
      .sort((a, b) => {
        const dateA = new Date(a.deliveries.scheduled_pickup_date_tz!);
        const dateB = new Date(b.deliveries.scheduled_pickup_date_tz!);
        return dateA.getTime() - dateB.getTime();
      });

    return upcoming[0]?.deliveries || null;
  };

  const handleStatusUpdate = () => {
    if (!selectedDriver || !statusUpdate) return;

    updateDriverStatusMutation.mutate({
      driverId: selectedDriver.id,
      status: statusUpdate,
      notes
    });
  };

  const handleDriverSelect = (driver: Driver) => {
    setSelectedDriver(driver);
    setStatusUpdate(driver.status as DriverStatus);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Driver Availability Management
          </CardTitle>
          <CardDescription>
            Manage driver schedules, availability, and status updates
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Driver Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map((driver) => {
          const activeAssignments = getActiveAssignments(driver);
          const nextDelivery = getNextScheduledDelivery(driver);

          return (
            <Card key={driver.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">
                      {driver.first_name} {driver.last_name}
                    </h3>
                  </div>
                  <Badge className={getStatusColor(driver.status)}>
                    {driver.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {driver.phone}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Active Assignments */}
                <div>
                  <p className="text-sm font-medium mb-1">Active Assignments</p>
                  <p className="text-2xl font-bold">{activeAssignments.length}</p>
                </div>

                {/* Next Scheduled Delivery */}
                {nextDelivery && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Next Delivery</p>
                    <div className="text-xs space-y-1">
                      <p className="font-medium">{nextDelivery.delivery_number}</p>
                      {nextDelivery.scheduled_pickup_date_tz && (
                        <p className="text-muted-foreground">
                          {format(parseISO(nextDelivery.scheduled_pickup_date_tz), 'MMM d, h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {!nextDelivery && driver.status === 'available' && (
                  <div className="text-sm text-muted-foreground">
                    Ready for new assignments
                  </div>
                )}

                {/* Action Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleDriverSelect(driver)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Update Status
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Update Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Driver Status</DialogTitle>
            <DialogDescription>
              {selectedDriver && (
                <>Update status for {selectedDriver.first_name} {selectedDriver.last_name}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedDriver && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusUpdate} onValueChange={(value) => setStatusUpdate(value as DriverStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on_delivery">On Delivery</SelectItem>
                    <SelectItem value="off_duty">Off Duty</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes about this status change..."
                  rows={3}
                />
              </div>

              {/* Current Assignment Warning */}
              {selectedDriver && getActiveAssignments(selectedDriver).length > 0 && statusUpdate === 'off_duty' && (
                <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Warning</p>
                      <p className="text-yellow-700">
                        This driver has {getActiveAssignments(selectedDriver).length} active assignment(s). 
                        Setting them off-duty may require reassigning these loads.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleStatusUpdate}
                  disabled={!statusUpdate || updateDriverStatusMutation.isPending}
                  className="flex-1"
                >
                  {updateDriverStatusMutation.isPending ? 'Updating...' : 'Update Status'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};