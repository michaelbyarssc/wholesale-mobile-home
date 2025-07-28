
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Truck, MapPin, Clock, User, ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { cn } from '@/lib/utils';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  phone: string;
  delivery_assignments?: Array<{
    id: string;
    delivery_id: string;
    deliveries: {
      id: string;
      delivery_number: string;
      customer_name: string;
      delivery_address: string;
      status: string;
      scheduled_pickup_date_tz: string | null;
      scheduled_delivery_date_tz: string | null;
      mobile_home_type: string;
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
  customer_name: string;
  delivery_address: string;
  status: string;
  scheduled_pickup_date_tz: string | null;
  scheduled_delivery_date_tz: string | null;
  mobile_home_type: string;
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
  drivers: Driver[];
  deliveries: Delivery[];
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
}

export const DriverScheduleCalendar: React.FC<Props> = ({ drivers, deliveries, currentWeek, onWeekChange }) => {
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);

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

  const weekStart = startOfWeek(currentWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getDeliveriesForDriverAndDay = (driver: Driver, day: Date) => {
    const driverDeliveries = driver.delivery_assignments?.map(assignment => assignment.deliveries) || [];
    
    return driverDeliveries.filter(delivery => {
      if (!delivery) return false;
      
      const pickupDate = safeParseDateTz(delivery.scheduled_pickup_date_tz);
      const deliveryDate = safeParseDateTz(delivery.scheduled_delivery_date_tz);
      
      return (pickupDate && isSameDay(pickupDate, day)) || (deliveryDate && isSameDay(deliveryDate, day));
    });
  };

  // Get all unscheduled deliveries for this driver
  const getUnscheduledDeliveriesForDriver = (driver: Driver) => {
    const driverDeliveries = driver.delivery_assignments?.map(assignment => assignment.deliveries) || [];
    
    return driverDeliveries.filter(delivery => {
      if (!delivery) return false;
      
      // Show if it has no scheduled dates and is in an active status
      const hasNoScheduledDates = !delivery.scheduled_pickup_date_tz && !delivery.scheduled_delivery_date_tz;
      const isActive = ['scheduled', 'factory_pickup_scheduled', 'factory_pickup_in_progress', 'in_transit', 'delivery_in_progress'].includes(delivery.status);
      
      return hasNoScheduledDates && isActive;
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'bg-green-100 text-green-800 border-green-200',
      on_delivery: 'bg-blue-100 text-blue-800 border-blue-200',
      off_duty: 'bg-gray-100 text-gray-800 border-gray-200',
      inactive: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getDeliveryStatusColor = (status: string) => {
    const colors = {
      factory_pickup_scheduled: 'bg-yellow-100 text-yellow-800',
      factory_pickup_in_progress: 'bg-orange-100 text-orange-800',
      in_transit: 'bg-blue-100 text-blue-800',
      delivery_in_progress: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      delayed: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const handleDeliveryClick = (delivery: any) => {
    setSelectedDelivery(delivery);
    setShowDetails(true);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'next' ? addWeeks(currentWeek, 1) : subWeeks(currentWeek, 1);
    onWeekChange(newDate);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const weekStartDate = startOfWeek(date);
      onWeekChange(weekStartDate);
      setShowWeekPicker(false);
    }
  };

  const goToCurrentWeek = () => {
    onWeekChange(new Date());
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Driver Schedule Calendar
            </CardTitle>
            
            {/* Week Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover open={showWeekPicker} onOpenChange={setShowWeekPicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="min-w-[200px]">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={currentWeek}
                    onSelect={handleDateSelect}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
              >
                Current Week
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2">
            {/* Header Row */}
            <div className="font-medium text-sm text-muted-foreground p-2">Driver</div>
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="font-medium text-sm text-center p-2 border-b">
                <div>{format(day, 'EEE')}</div>
                <div className="text-xs text-muted-foreground">{format(day, 'MMM d')}</div>
              </div>
            ))}

            {/* Driver Rows */}
            {drivers.map((driver) => {
              const unscheduledDeliveries = getUnscheduledDeliveriesForDriver(driver);
              
              return (
                <React.Fragment key={driver.id}>
                  {/* Driver Info Column */}
                  <div className="p-2 border-r">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {driver.first_name} {driver.last_name}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getStatusColor(driver.status))}
                      >
                        {driver.status.replace('_', ' ')}
                      </Badge>
                      {unscheduledDeliveries.length > 0 && (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                          {unscheduledDeliveries.length} unscheduled
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Schedule Columns for Each Day */}
                  {weekDays.map((day) => {
                    const dayDeliveries = getDeliveriesForDriverAndDay(driver, day);
                    
                    return (
                      <div key={`${driver.id}-${day.toISOString()}`} className="p-1 border-r border-b min-h-[80px]">
                        <div className="space-y-1">
                          {dayDeliveries.map((delivery) => (
                            <Button
                              key={delivery.id}
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "w-full text-xs p-1 h-auto justify-start",
                                getDeliveryStatusColor(delivery.status)
                              )}
                              onClick={() => handleDeliveryClick(delivery)}
                            >
                              <div className="text-left truncate">
                                <div className="font-medium">{delivery.delivery_number}</div>
                                <div className="text-xs opacity-75">{delivery.customer_name}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>

          {/* Show unscheduled deliveries section */}
          {drivers.some(driver => getUnscheduledDeliveriesForDriver(driver).length > 0) && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-4 text-sm">Unscheduled Deliveries</h3>
              <div className="space-y-3">
                {drivers.map((driver) => {
                  const unscheduledDeliveries = getUnscheduledDeliveriesForDriver(driver);
                  if (unscheduledDeliveries.length === 0) return null;
                  
                  return (
                    <div key={`unscheduled-${driver.id}`} className="border rounded-lg p-3">
                      <div className="font-medium text-sm mb-2">
                        {driver.first_name} {driver.last_name}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {unscheduledDeliveries.map((delivery) => (
                          <Button
                            key={delivery.id}
                            variant="outline"
                            size="sm"
                            className="text-xs h-auto py-1"
                            onClick={() => handleDeliveryClick(delivery)}
                          >
                            <div className="text-left">
                              <div className="font-medium">{delivery.delivery_number}</div>
                              <div className="text-xs opacity-75">{delivery.customer_name}</div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedDelivery?.delivery_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Customer</p>
                  <p className="text-sm text-muted-foreground">{selectedDelivery.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge className={getDeliveryStatusColor(selectedDelivery.status)}>
                    {selectedDelivery.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Delivery Address
                </p>
                <p className="text-sm text-muted-foreground">{selectedDelivery.delivery_address}</p>
              </div>

              <div>
                <p className="text-sm font-medium">Mobile Home</p>
                <p className="text-sm text-muted-foreground">
                  {selectedDelivery.mobile_homes?.manufacturer} {selectedDelivery.mobile_homes?.model}
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedDelivery.mobile_home_type?.replace(/_/g, ' ')}
                </p>
              </div>

              {selectedDelivery.scheduled_pickup_date_tz && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Scheduled Pickup
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const pickupDate = safeParseDateTz(selectedDelivery.scheduled_pickup_date_tz);
                      return pickupDate ? format(pickupDate, 'MMM d, yyyy h:mm a') : 'Not scheduled';
                    })()}
                  </p>
                </div>
              )}

              {selectedDelivery.scheduled_delivery_date_tz && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Scheduled Delivery
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(() => {
                      const deliveryDate = safeParseDateTz(selectedDelivery.scheduled_delivery_date_tz);
                      return deliveryDate ? format(deliveryDate, 'MMM d, yyyy h:mm a') : 'Not scheduled';
                    })()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
