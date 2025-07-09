import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Phone, CheckCircle, XCircle, AlertCircle, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppointmentScheduling } from '@/hooks/useAppointmentScheduling';
import { format, parseISO } from 'date-fns';

interface MyAppointmentsProps {
  userId?: string;
}

export const MyAppointments: React.FC<MyAppointmentsProps> = ({ userId }) => {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  const {
    isLoading,
    userAppointments,
    cancelAppointment
  } = useAppointmentScheduling(userId);

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      await cancelAppointment(selectedAppointment.id, cancellationReason);
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
      setCancellationReason('');
    } catch (error) {
      console.error('Cancellation failed:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAppointmentTypeLabel = (type: string) => {
    switch (type) {
      case 'viewing':
        return 'Home Viewing';
      case 'consultation':
        return 'Consultation';
      case 'inspection':
        return 'Inspection';
      case 'delivery_planning':
        return 'Delivery Planning';
      default:
        return 'Appointment';
    }
  };

  const canCancelAppointment = (appointment: any) => {
    return appointment.status === 'scheduled' || appointment.status === 'confirmed';
  };

  const upcomingAppointments = userAppointments.filter(
    appt => ['scheduled', 'confirmed'].includes(appt.status)
  );

  const pastAppointments = userAppointments.filter(
    appt => ['completed', 'cancelled', 'no_show'].includes(appt.status)
  );

  if (!userId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Sign in to view appointments</h3>
            <p className="text-sm text-muted-foreground">
              Please sign in to view and manage your appointments.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>
            Your scheduled and confirmed appointments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingAppointments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No upcoming appointments</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any upcoming appointments scheduled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(appointment.status)}
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <Badge variant="outline">
                          {getAppointmentTypeLabel(appointment.appointment_type)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(parseISO(appointment.appointment_slots?.date || ''), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {format(parseISO(`2000-01-01T${appointment.appointment_slots?.start_time}`), 'h:mm a')} - 
                            {format(parseISO(`2000-01-01T${appointment.appointment_slots?.end_time}`), 'h:mm a')}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {appointment.appointment_slots?.location_type === 'showroom' && 'Showroom Visit'}
                            {appointment.appointment_slots?.location_type === 'on_site' && 'On-Site Visit'}
                            {appointment.appointment_slots?.location_type === 'virtual' && 'Virtual Tour'}
                          </span>
                        </div>
                        
                        {appointment.party_size > 1 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{appointment.party_size} people</span>
                          </div>
                        )}
                        
                        {appointment.mobile_homes && (
                          <div className="text-sm font-medium">
                            Viewing: {appointment.mobile_homes.manufacturer} {appointment.mobile_homes.model}
                            {appointment.mobile_homes.display_name && ` (${appointment.mobile_homes.display_name})`}
                          </div>
                        )}
                        
                        {appointment.special_requests && (
                          <div className="text-sm text-muted-foreground">
                            <strong>Special requests:</strong> {appointment.special_requests}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      {canCancelAppointment(appointment) && (
                        <Dialog open={cancelDialogOpen && selectedAppointment?.id === appointment.id} onOpenChange={(open) => {
                          setCancelDialogOpen(open);
                          if (!open) setSelectedAppointment(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAppointment(appointment)}
                            >
                              Cancel
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Cancel Appointment</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to cancel this appointment? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="cancellation-reason">Reason for cancellation (optional)</Label>
                                <Textarea
                                  id="cancellation-reason"
                                  value={cancellationReason}
                                  onChange={(e) => setCancellationReason(e.target.value)}
                                  placeholder="Please let us know why you're cancelling..."
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setCancelDialogOpen(false)}
                                  className="flex-1"
                                >
                                  Keep Appointment
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={handleCancelAppointment}
                                  disabled={isLoading}
                                  className="flex-1"
                                >
                                  {isLoading ? 'Cancelling...' : 'Cancel Appointment'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4 mr-2" />
                        Reschedule
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Appointments</CardTitle>
            <CardDescription>
              Your appointment history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastAppointments.slice(0, 5).map((appointment) => (
                <div key={appointment.id} className="border rounded-lg p-4 opacity-75">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(appointment.status)}
                        <Badge className={getStatusColor(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <Badge variant="outline">
                          {getAppointmentTypeLabel(appointment.appointment_type)}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>
                          {format(parseISO(appointment.appointment_slots?.date || ''), 'MMM d, yyyy')} at{' '}
                          {format(parseISO(`2000-01-01T${appointment.appointment_slots?.start_time}`), 'h:mm a')}
                        </div>
                        
                        {appointment.mobile_homes && (
                          <div>
                            {appointment.mobile_homes.manufacturer} {appointment.mobile_homes.model}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};