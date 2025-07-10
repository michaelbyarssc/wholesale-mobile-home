import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Phone, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppointmentScheduling } from '@/hooks/useAppointmentScheduling';
import { format, parseISO } from 'date-fns';

interface AppointmentBookingWidgetProps {
  userId?: string;
  mobileHomeId?: string;
  mobileHomeName?: string;
  className?: string;
}

export const AppointmentBookingWidget: React.FC<AppointmentBookingWidgetProps> = ({
  userId,
  mobileHomeId,
  mobileHomeName,
  className
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    partySize: 1,
    appointmentType: 'viewing',
    specialRequests: ''
  });

  const {
    isLoading,
    availableSlots,
    bookAppointment
  } = useAppointmentScheduling(userId);

  const handleBooking = async () => {
    if (!selectedSlot || !formData.customerName || !formData.customerEmail || !formData.customerPhone) {
      return;
    }

    try {
      await bookAppointment(selectedSlot.id, {
        ...formData,
        mobileHomeId
      });

      setIsDialogOpen(false);
      setSelectedSlot(null);
      setFormData({
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        partySize: 1,
        appointmentType: 'viewing',
        specialRequests: ''
      });
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const getLocationTypeIcon = (locationType: string) => {
    switch (locationType) {
      case 'showroom':
        return <MapPin className="h-4 w-4" />;
      case 'on_site':
        return <MapPin className="h-4 w-4" />;
      case 'virtual':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getLocationTypeName = (locationType: string) => {
    switch (locationType) {
      case 'showroom':
        return 'Showroom Visit';
      case 'on_site':
        return 'On-Site Visit';
      case 'virtual':
        return 'Virtual Tour';
      default:
        return 'Showroom Visit';
    }
  };

  // Filter slots for specific mobile home if provided
  const filteredSlots = mobileHomeId 
    ? availableSlots.filter(slot => !slot.mobile_home_id || slot.mobile_home_id === mobileHomeId)
    : availableSlots;

  // Group slots by date
  const slotsByDate = filteredSlots.reduce((acc, slot) => {
    const date = slot.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, typeof filteredSlots>);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule a Viewing
        </CardTitle>
        <CardDescription>
          Book an appointment to chat about our mobile homes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.keys(slotsByDate).length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No Available Appointments</h3>
              <p className="text-sm text-muted-foreground mb-4">
                There are currently no available appointment slots. Please check back later or contact us directly.
              </p>
              <Button variant="outline">
                <Phone className="h-4 w-4 mr-2" />
                Call to Schedule
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {Object.entries(slotsByDate).slice(0, 7).map(([date, slots]) => (
                <div key={date} className="space-y-2">
                  <h4 className="font-medium text-sm">
                    {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {slots.map((slot) => (
                      <Dialog key={slot.id} open={isDialogOpen && selectedSlot?.id === slot.id} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) setSelectedSlot(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="justify-start text-left h-auto p-3"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <div className="flex flex-col gap-1 w-full">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span className="text-sm font-medium">
                                  {format(parseISO(`2000-01-01T${slot.start_time}`), 'h:mm a')} - 
                                  {format(parseISO(`2000-01-01T${slot.end_time}`), 'h:mm a')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {getLocationTypeIcon(slot.location_type)}
                                  <span className="text-xs text-muted-foreground">
                                    {getLocationTypeName(slot.location_type)}
                                  </span>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {slot.max_bookings - slot.current_bookings} available
                                </Badge>
                              </div>
                            </div>
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Book Appointment</DialogTitle>
                            <DialogDescription>
                              {format(parseISO(slot.date), 'EEEE, MMMM d, yyyy')} at{' '}
                              {format(parseISO(`2000-01-01T${slot.start_time}`), 'h:mm a')}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="name">Full Name *</Label>
                                <Input
                                  id="name"
                                  value={formData.customerName}
                                  onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                                  placeholder="John Doe"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="party-size">Party Size</Label>
                                <Select
                                  value={formData.partySize.toString()}
                                  onValueChange={(value) => setFormData(prev => ({ ...prev, partySize: parseInt(value) }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[1, 2, 3, 4, 5, 6].map(size => (
                                      <SelectItem key={size} value={size.toString()}>
                                        {size} {size === 1 ? 'person' : 'people'}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="email">Email Address *</Label>
                              <Input
                                id="email"
                                type="email"
                                value={formData.customerEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                                placeholder="john@example.com"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="phone">Phone Number *</Label>
                              <Input
                                id="phone"
                                type="tel"
                                value={formData.customerPhone}
                                onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                                placeholder="(555) 123-4567"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="appointment-type">Appointment Type</Label>
                              <Select
                                value={formData.appointmentType}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, appointmentType: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewing">Home Viewing</SelectItem>
                                  <SelectItem value="consultation">Consultation</SelectItem>
                                  <SelectItem value="inspection">Inspection</SelectItem>
                                  <SelectItem value="delivery_planning">Delivery Planning</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="special-requests">Special Requests</Label>
                              <Textarea
                                id="special-requests"
                                value={formData.specialRequests}
                                onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                                placeholder="Any specific questions or requirements..."
                                rows={3}
                              />
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => setIsDialogOpen(false)}
                                variant="outline"
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleBooking}
                                disabled={isLoading || !formData.customerName || !formData.customerEmail || !formData.customerPhone}
                                className="flex-1"
                              >
                                {isLoading ? 'Booking...' : 'Book Appointment'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Free consultation included</span>
              </div>
              <Button variant="ghost" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Email us instead
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};