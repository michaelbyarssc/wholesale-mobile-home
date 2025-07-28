import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, CalendarClock, Clock, Truck, MapPin, AlertTriangle, User } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, isWithinInterval, isSameDay } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LoadTimelineView } from './LoadTimelineView';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
}

interface Delivery {
  id: string;
  delivery_number: string;
  customer_name: string;
  delivery_address: string;
  pickup_address: string;
  status: string;
  scheduled_pickup_date_tz: string | null;
  scheduled_delivery_date_tz: string | null;
  mobile_home_type: string;
  total_delivery_cost: number;
  mobile_homes: {
    manufacturer: string;
    model: string;
  } | null;
  delivery_assignments: Array<{
    id: string;
    driver_id: string;
    drivers: {
      first_name: string;
      last_name: string;
    };
  }>;
  invoices: {
    id: string;
    mobile_homes: {
      mobile_home_factories: Array<{
        factories: {
          name: string;
          street_address: string;
          city: string;
          state: string;
          zip_code: string;
        };
      }>;
    } | null;
  } | null;
}

export const DriverScheduleDashboard: React.FC = () => {
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());

  const { data: deliveries, isLoading, error } = useQuery({
    queryKey: ['deliveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          mobile_homes(manufacturer, model),
          delivery_assignments(
            id,
            driver_id,
            drivers(
              first_name,
              last_name
            )
          ),
          invoices(
            id,
            mobile_homes(
              mobile_home_factories(
                factories(
                  name,
                  street_address,
                  city,
                  state,
                  zip_code
                )
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: drivers, isLoading: isDriversLoading, error: driversError } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading || isDriversLoading) {
    return <div>Loading...</div>;
  }

  if (error || driversError) {
    return <div>Error: {error?.message || driversError?.message}</div>;
  }

  const start = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const end = endOfWeek(currentWeek, { weekStartsOn: 0 });

  const getDayLabels = (): string[] => {
    const labels = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      labels.push(format(day, 'EEE d'));
    }
    return labels;
  };

  const dayLabels = getDayLabels();

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Driver Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-4">
            {/* Calendar */}
            <div className="col-span-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={'outline'}
                    className={
                      'w-full justify-start text-left font-normal' +
                      (currentWeek ? ' pl-3' : ' text-muted-foreground')
                    }
                  >
                    <CalendarClock className="mr-2 h-4 w-4" />
                    {currentWeek ? format(currentWeek, 'MMMM yyyy') : <span>Pick a week</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    defaultMonth={currentWeek}
                    selected={currentWeek}
                    onSelect={(date) => {
                      if (date) {
                        setCurrentWeek(date);
                      }
                    }}
                    className="rounded-md border"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Day Labels */}
            {dayLabels.map((dayLabel, index) => (
              <div key={index} className="font-semibold text-center">
                {dayLabel}
              </div>
            ))}
          </div>

          {/* Load Timeline View */}
          <div className="mt-4">
            {deliveries && drivers && (
              <LoadTimelineView deliveries={deliveries} drivers={drivers} currentWeek={currentWeek} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
