
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Clock, Truck, MapPin, AlertTriangle, User } from 'lucide-react';
import { format, differenceInDays, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';

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
}

interface Props {
  deliveries: Delivery[];
  drivers: Driver[];
  currentWeek: Date;
}

export const LoadTimelineView: React.FC<Props> = ({ deliveries, drivers, currentWeek }) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');

  // Filter deliveries to show all active deliveries with driver assignments
  const filteredDeliveries = deliveries.filter(delivery => {
    // Only show deliveries that have driver assignments
    if (!delivery.delivery_assignments || delivery.delivery_assignments.length === 0) {
      return false;
    }

    // Show all active deliveries regardless of scheduled dates
    const activeStatuses = ['scheduled', 'factory_pickup_scheduled', 'factory_pickup_in_progress', 'in_transit', 'delivery_in_progress'];
    if (!activeStatuses.includes(delivery.status)) {
      return false;
    }

    // Apply status filter
    if (statusFilter !== 'all' && delivery.status !== statusFilter) return false;
    
    // Apply driver filter
    if (driverFilter !== 'all') {
      const hasDriver = delivery.delivery_assignments.some(a => a.driver_id === driverFilter);
      if (!hasDriver) return false;
    }
    
    return true;
  });

  // Sort deliveries by pickup date, then delivery date
  const sortedDeliveries = [...filteredDeliveries].sort((a, b) => {
    const aDate = a.scheduled_pickup_date_tz || a.scheduled_delivery_date_tz;
    const bDate = b.scheduled_pickup_date_tz || b.scheduled_delivery_date_tz;
    
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });

  // Safe date parsing function that handles timezone abbreviations
  const safeParseDateTz = (dateString: string | null): Date | null => {
    console.log('Parsing date string:', dateString);
    if (!dateString) {
      console.log('Date string is null or empty');
      return null;
    }
    try {
      // Use Date constructor which can handle timezone abbreviations like "EDT"
      const date = new Date(dateString);
      const isValid = !isNaN(date.getTime());
      console.log('Parsed date:', date, 'isValid:', isValid);
      return isValid ? date : null;
    } catch (error) {
      console.warn('Failed to parse date:', dateString, error);
      return null;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      factory_pickup_scheduled: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      factory_pickup_in_progress: 'bg-orange-100 text-orange-800 border-orange-200',
      in_transit: 'bg-blue-100 text-blue-800 border-blue-200',
      delivery_in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      delayed: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getUrgencyLevel = (delivery: Delivery) => {
    const now = new Date();
    const pickupDate = safeParseDateTz(delivery.scheduled_pickup_date_tz);
    const deliveryDate = safeParseDateTz(delivery.scheduled_delivery_date_tz);
    
    // Check if overdue
    if (pickupDate && isBefore(pickupDate, now) && !['delivered', 'completed'].includes(delivery.status)) {
      return 'overdue';
    }
    
    // Check if due soon (within 2 days)
    if (pickupDate && differenceInDays(pickupDate, now) <= 2 && differenceInDays(pickupDate, now) >= 0) {
      return 'urgent';
    }
    
    if (deliveryDate && differenceInDays(deliveryDate, now) <= 2 && differenceInDays(deliveryDate, now) >= 0) {
      return 'urgent';
    }
    
    return 'normal';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      overdue: 'border-l-red-500 bg-red-50',
      urgent: 'border-l-yellow-500 bg-yellow-50',
      normal: 'border-l-blue-500 bg-white'
    };
    return colors[urgency as keyof typeof colors] || 'border-l-gray-500 bg-white';
  };

  const getTransitDuration = (delivery: Delivery) => {
    if (!delivery.scheduled_pickup_date_tz || !delivery.scheduled_delivery_date_tz) return null;
    
    const pickup = safeParseDateTz(delivery.scheduled_pickup_date_tz);
    const deliveryDate = safeParseDateTz(delivery.scheduled_delivery_date_tz);
    
    if (!pickup || !deliveryDate) return null;
    
    const days = differenceInDays(deliveryDate, pickup);
    
    return days;
  };

  const uniqueStatuses = [...new Set(deliveries.map(d => d.status))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Driver:</label>
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {drivers.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.first_name} {driver.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Badge variant="outline" className="border-red-500 text-red-700">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Overdue
              </Badge>
              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                <Clock className="h-3 w-3 mr-1" />
                Due Soon
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Active Deliveries ({sortedDeliveries.length} loads)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sortedDeliveries.map((delivery) => {
              const urgency = getUrgencyLevel(delivery);
              const transitDays = getTransitDuration(delivery);
              const assignedDriver = delivery.delivery_assignments?.[0]?.drivers;

              return (
                <div
                  key={delivery.id}
                  className={cn(
                    "border-l-4 p-4 rounded-r-lg border transition-all hover:shadow-md",
                    getUrgencyColor(urgency)
                  )}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Load Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{delivery.delivery_number}</h3>
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{delivery.customer_name}</p>
                      <p className="text-sm font-medium">
                        {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {delivery.mobile_home_type?.replace(/_/g, ' ')}
                      </p>
                    </div>

                    {/* Timeline Dates */}
                    <div className="space-y-2">
                      {(() => {
                        const pickupDate = safeParseDateTz(delivery.scheduled_pickup_date_tz);
                        return pickupDate ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3 w-3 text-blue-500" />
                            <span className="font-medium">Pickup:</span>
                            <span>{format(pickupDate, 'MMM d, h:mm a')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium">Pickup:</span>
                            <span className="italic">Not scheduled</span>
                          </div>
                        );
                      })()}
                      
                      {(() => {
                        const deliveryDate = safeParseDateTz(delivery.scheduled_delivery_date_tz);
                        return deliveryDate ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Truck className="h-3 w-3 text-green-500" />
                            <span className="font-medium">Delivery:</span>
                            <span>{format(deliveryDate, 'MMM d, h:mm a')}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            <span className="font-medium">Delivery:</span>
                            <span className="italic">Not scheduled</span>
                          </div>
                        );
                      })()}
                      
                      {transitDays !== null && (
                        <div className="text-xs text-muted-foreground">
                          Transit time: {transitDays} {transitDays === 1 ? 'day' : 'days'}
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3 w-3 text-gray-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium">Delivery Address:</p>
                          <p className="text-muted-foreground text-xs">{delivery.delivery_address}</p>
                        </div>
                      </div>
                    </div>

                    {/* Driver & Cost */}
                    <div className="space-y-2">
                      {assignedDriver && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-gray-500" />
                          <span className="font-medium">Driver:</span>
                          <span>{assignedDriver.first_name} {assignedDriver.last_name}</span>
                        </div>
                      )}
                      {!assignedDriver && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>No driver assigned</span>
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="font-medium">Cost: </span>
                        <span className="text-green-600">${delivery.total_delivery_cost?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {sortedDeliveries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active deliveries found for assigned drivers matching your filters.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
