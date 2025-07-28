import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Truck, DollarSign, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  phone: string;
  delivery_assignments?: Array<{
    id: string;
    delivery_id: string;
    assigned_at: string;
    role: string;
    deliveries: {
      id: string;
      delivery_number: string;
      customer_name: string;
      delivery_address: string;
      status: string;
      scheduled_pickup_date_tz: string | null;
      scheduled_delivery_date_tz: string | null;
      actual_pickup_date: string | null;
      actual_delivery_date: string | null;
      mobile_home_type: string;
      total_delivery_cost: number;
      mobile_homes: {
        manufacturer: string;
        model: string;
      } | null;
    };
  }>;
}

interface Delivery {
  id: string;
  delivery_number: string;
  status: string;
  total_delivery_cost: number;
  delivery_assignments: Array<{
    driver_id: string;
    drivers: {
      first_name: string;
      last_name: string;
    };
  }>;
}

interface Props {
  drivers: Driver[];
  deliveries: Delivery[];
}

export const DriverWorkloadDashboard: React.FC<Props> = ({ drivers, deliveries }) => {
  // Safe date parsing function that handles timezone abbreviations
  const safeParseDateTz = (dateString: string | null): Date | null => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.warn('Failed to parse date:', dateString, error);
      return null;
    }
  };

  // Calculate driver workload metrics
  const driverMetrics = drivers.map(driver => {
    const assignments = driver.delivery_assignments || [];
    const activeAssignments = assignments.filter(a => 
      ['scheduled', 'factory_pickup_scheduled', 'factory_pickup_in_progress', 'in_transit', 'delivery_in_progress'].includes(a.deliveries?.status || '')
    );
    
    const totalRevenue = assignments.reduce((sum, assignment) => 
      sum + (assignment.deliveries?.total_delivery_cost || 0), 0
    );

    const overdueAssignments = assignments.filter(assignment => {
      const delivery = assignment.deliveries;
      if (!delivery || ['delivered', 'completed', 'cancelled'].includes(delivery.status)) return false;
      
      const pickupDate = safeParseDateTz(delivery.scheduled_pickup_date_tz);
      return pickupDate && isBefore(pickupDate, new Date());
    });

    const upcomingAssignments = assignments.filter(assignment => {
      const delivery = assignment.deliveries;
      if (!delivery || ['delivered', 'completed', 'cancelled'].includes(delivery.status)) return false;
      
      const pickupDate = safeParseDateTz(delivery.scheduled_pickup_date_tz);
      if (!pickupDate) return false;
      
      const daysUntil = differenceInDays(pickupDate, new Date());
      return daysUntil >= 0 && daysUntil <= 7; // Next 7 days
    });

    return {
      id: driver.id,
      name: `${driver.first_name} ${driver.last_name}`,
      status: driver.status,
      totalAssignments: assignments.length,
      activeAssignments: activeAssignments.length,
      totalRevenue,
      overdueCount: overdueAssignments.length,
      upcomingCount: upcomingAssignments.length,
      phone: driver.phone
    };
  });

  // Sort by workload for charts
  const sortedByWorkload = [...driverMetrics].sort((a, b) => b.activeAssignments - a.activeAssignments);

  // Status distribution
  const statusDistribution = drivers.reduce((acc, driver) => {
    acc[driver.status] = (acc[driver.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = Object.entries(statusDistribution).map(([status, count]) => ({
    name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    color: getStatusColor(status)
  }));

  // Workload distribution data
  const workloadChartData = sortedByWorkload.slice(0, 10).map(driver => ({
    name: driver.name.split(' ').map(n => n[0]).join(''), // Initials for chart
    fullName: driver.name,
    active: driver.activeAssignments,
    total: driver.totalAssignments,
    revenue: driver.totalRevenue
  }));

  function getStatusColor(status: string) {
    const colors = {
      available: '#10B981', // green
      on_delivery: '#3B82F6', // blue
      off_duty: '#6B7280', // gray
      inactive: '#EF4444' // red
    };
    return colors[status as keyof typeof colors] || '#6B7280';
  }

  // Calculate total metrics
  const totalActiveLoads = driverMetrics.reduce((sum, driver) => sum + driver.activeAssignments, 0);
  const totalRevenue = driverMetrics.reduce((sum, driver) => sum + driver.totalRevenue, 0);
  const totalOverdue = driverMetrics.reduce((sum, driver) => sum + driver.overdueCount, 0);
  const averageLoadsPerDriver = totalActiveLoads / drivers.length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Loads</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveLoads}</div>
            <p className="text-xs text-muted-foreground">
              Avg {averageLoadsPerDriver.toFixed(1)} per driver
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From active assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Loads</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalOverdue}</div>
            <p className="text-xs text-muted-foreground">
              Need immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statusDistribution.available || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for new assignments
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Workload Distribution</CardTitle>
            <CardDescription>Active assignments per driver</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={workloadChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'active' ? 'Active Loads' : 'Total Loads']}
                  labelFormatter={(label) => {
                    const driver = workloadChartData.find(d => d.name === label);
                    return driver ? driver.fullName : label;
                  }}
                />
                <Bar dataKey="active" fill="hsl(var(--primary))" name="Active Loads" />
                <Bar dataKey="total" fill="hsl(var(--muted))" name="Total Loads" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Driver Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Status Distribution</CardTitle>
            <CardDescription>Current availability status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Driver List */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Details</CardTitle>
          <CardDescription>Individual driver workload and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedByWorkload.map((driver) => (
              <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="font-semibold">{driver.name}</h3>
                    <p className="text-sm text-muted-foreground">{driver.phone}</p>
                  </div>
                  <Badge className={`${getStatusColor(driver.status)} text-white`}>
                    {driver.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{driver.activeAssignments}</p>
                    <p className="text-sm text-muted-foreground">Active Loads</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-lg font-semibold">${driver.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                  </div>

                  {driver.overdueCount > 0 && (
                    <div className="text-center">
                      <p className="text-2xl font-bold text-destructive">{driver.overdueCount}</p>
                      <p className="text-sm text-muted-foreground">Overdue</p>
                    </div>
                  )}

                  <div className="text-center">
                    <p className="text-lg font-semibold text-blue-600">{driver.upcomingCount}</p>
                    <p className="text-sm text-muted-foreground">This Week</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};