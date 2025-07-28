import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Truck, Clock, Users, BarChart3, MapPin } from 'lucide-react';
import { DriverScheduleCalendar } from './DriverScheduleCalendar';
import { LoadTimelineView } from './LoadTimelineView';
import { DriverWorkloadDashboard } from './DriverWorkloadDashboard';
import { DriverAvailabilityManager } from './DriverAvailabilityManager';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';

export const DriverScheduleDashboard = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedView, setSelectedView] = useState<'calendar' | 'timeline' | 'workload' | 'availability'>('calendar');

  // Fetch drivers with their assignments and availability
  const { data: driversData, isLoading } = useQuery({
    queryKey: ['drivers-with-assignments', currentWeek],
    queryFn: async () => {
      const weekStart = startOfWeek(currentWeek);
      const weekEnd = endOfWeek(currentWeek);

      // Get drivers with their assignments
      const { data: drivers, error: driversError } = await supabase
        .from('drivers')
        .select(`
          *,
          delivery_assignments!inner(
            id,
            delivery_id,
            assigned_at,
            role,
            deliveries(
              id,
              delivery_number,
              customer_name,
              delivery_address,
              status,
              scheduled_pickup_date,
              scheduled_delivery_date,
              actual_pickup_date,
              actual_delivery_date,
              mobile_home_type,
              total_delivery_cost,
              mobile_homes(manufacturer, model)
            )
          )
        `)
        .eq('active', true)
        .order('first_name');

      if (driversError) throw driversError;

      // Get all deliveries for the week to show unassigned loads
      const { data: allDeliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select(`
          *,
          mobile_homes(manufacturer, model),
          delivery_assignments(
            id,
            driver_id,
            drivers(first_name, last_name)
          )
        `)
        .or(`scheduled_pickup_date.gte.${weekStart.toISOString()},scheduled_delivery_date.gte.${weekStart.toISOString()}`)
        .or(`scheduled_pickup_date.lte.${weekEnd.toISOString()},scheduled_delivery_date.lte.${weekEnd.toISOString()}`)
        .order('scheduled_pickup_date');

      if (deliveriesError) throw deliveriesError;

      return {
        drivers: drivers || [],
        allDeliveries: allDeliveries || []
      };
    },
  });

  // Fetch driver statistics
  const { data: driverStats } = useQuery({
    queryKey: ['driver-stats-enhanced'],
    queryFn: async () => {
      const { data: drivers, error } = await supabase
        .from('drivers')
        .select(`
          *,
          delivery_assignments(
            id,
            deliveries(status)
          )
        `)
        .eq('active', true);

      if (error) throw error;

      const stats = {
        totalDrivers: drivers.length,
        availableDrivers: drivers.filter(d => d.status === 'available').length,
        onDeliveryDrivers: drivers.filter(d => d.status === 'on_delivery').length,
        offDutyDrivers: drivers.filter(d => d.status === 'off_duty').length,
        activeAssignments: drivers.reduce((sum, driver) => 
          sum + (driver.delivery_assignments?.filter(a => 
            !['completed', 'delivered', 'cancelled'].includes(a.deliveries?.status)
          ).length || 0), 0
        )
      };

      return stats;
    },
  });

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'bg-green-500',
      on_delivery: 'bg-blue-500',
      off_duty: 'bg-gray-500',
      inactive: 'bg-red-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(direction === 'next' ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1));
  };

  const handleWeekChange = (date: Date) => {
    setCurrentWeek(date);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading driver schedules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Driver Schedule & Load Management</h2>
          <p className="text-muted-foreground">
            Week of {format(startOfWeek(currentWeek), 'MMM d')} - {format(endOfWeek(currentWeek), 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigateWeek('prev')}>
            Previous Week
          </Button>
          <Button variant="outline" onClick={() => setCurrentWeek(new Date())}>
            Current Week
          </Button>
          <Button variant="outline" onClick={() => navigateWeek('next')}>
            Next Week
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats?.totalDrivers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats?.availableDrivers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Delivery</CardTitle>
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats?.onDeliveryDrivers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Off Duty</CardTitle>
            <div className="h-2 w-2 rounded-full bg-gray-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats?.offDutyDrivers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loads</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats?.activeAssignments || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={selectedView} onValueChange={(value) => setSelectedView(value as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Schedule Calendar
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Load Timeline
          </TabsTrigger>
          <TabsTrigger value="workload" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Workload Analysis
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Availability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <DriverScheduleCalendar 
            drivers={driversData?.drivers || []}
            deliveries={driversData?.allDeliveries || []}
            currentWeek={currentWeek}
            onWeekChange={handleWeekChange}
          />
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <LoadTimelineView 
            deliveries={driversData?.allDeliveries || []}
            drivers={driversData?.drivers || []}
            currentWeek={currentWeek}
          />
        </TabsContent>

        <TabsContent value="workload" className="space-y-4">
          <DriverWorkloadDashboard 
            drivers={driversData?.drivers || []}
            deliveries={driversData?.allDeliveries || []}
          />
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <DriverAvailabilityManager 
            drivers={driversData?.drivers || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
