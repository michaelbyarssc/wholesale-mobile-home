import { useState, useEffect } from 'react';
import { Calendar, List, ChevronLeft, ChevronRight, Clock, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  appointment_type: string;
  status: string;
  notes?: string;
  special_requests?: string;
  party_size: number;
  slot: {
    date: string;
    start_time: string;
    end_time: string;
    location_type: string;
    location_address?: string;
  };
  mobile_home?: {
    manufacturer: string;
    model: string;
    display_name: string;
  };
}

interface CalendarViewProps {
  adminUserId?: string; // For super admin viewing specific admin's calendar
}

export function CalendarView({ adminUserId }: CalendarViewProps) {
  const [view, setView] = useState<'month' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          id,
          customer_name,
          customer_email,
          customer_phone,
          appointment_type,
          status,
          notes,
          special_requests,
          party_size,
          slot:appointment_slots!inner (
            date,
            start_time,
            end_time,
            location_type,
            location_address
          ),
          mobile_home:mobile_homes (
            manufacturer,
            model,
            display_name
          )
        `)
        .gte('slot.date', format(startOfMonth(currentDate), 'yyyy-MM-dd'))
        .lte('slot.date', format(endOfMonth(currentDate), 'yyyy-MM-dd'))
        .order('slot.date');

      // If viewing a specific admin's calendar (super admin feature)
      if (adminUserId) {
        query = query.eq('agent_id', adminUserId);
      }
      // Otherwise, show current user's appointments (admin viewing their own)

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [currentDate, adminUserId]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(new Date(apt.slot.date), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'no_show': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <h3 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={view} onValueChange={(value: 'month' | 'list') => setView(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Month
                </div>
              </SelectItem>
              <SelectItem value="list">
                <div className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {view === 'month' ? (
        /* Month View */
        <Card>
          <CardContent className="p-0">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 border-b">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium border-r last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={index}
                    className={`
                      min-h-32 p-2 border-r border-b last:border-r-0
                      ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                      ${isToday ? 'bg-blue-50' : ''}
                    `}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map(appointment => (
                        <div
                          key={appointment.id}
                          className={`
                            text-xs p-1 rounded border truncate
                            ${getStatusColor(appointment.status)}
                          `}
                          title={`${appointment.customer_name} - ${appointment.slot.start_time}`}
                        >
                          <div className="font-medium truncate">{appointment.customer_name}</div>
                          <div className="opacity-75">{appointment.slot.start_time}</div>
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* List View */
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No appointments scheduled for {format(currentDate, 'MMMM yyyy')}
              </CardContent>
            </Card>
          ) : (
            appointments.map(appointment => (
              <Card key={appointment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{appointment.customer_name}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(appointment.slot.date), 'MMM d, yyyy')} at {appointment.slot.start_time}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {appointment.party_size} {appointment.party_size === 1 ? 'person' : 'people'}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {appointment.slot.location_type}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(appointment.status)}>
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Email:</span> {appointment.customer_email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {appointment.customer_phone}
                      </div>
                    </div>
                    
                    {appointment.mobile_home && (
                      <div className="text-sm">
                        <span className="font-medium">Mobile Home:</span> {appointment.mobile_home.display_name}
                      </div>
                    )}
                    
                    {appointment.special_requests && (
                      <div className="text-sm">
                        <span className="font-medium">Special Requests:</span> {appointment.special_requests}
                      </div>
                    )}
                    
                    {appointment.notes && (
                      <div className="text-sm">
                        <span className="font-medium">Notes:</span> {appointment.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
