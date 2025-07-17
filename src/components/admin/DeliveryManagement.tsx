import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Calendar, CheckCircle, Clock, AlertCircle, MapPin, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

type Delivery = {
  id: string;
  delivery_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  status: string;
  scheduled_pickup_date: string | null;
  scheduled_delivery_date: string | null;
  created_at: string;
};

const statusColors: Record<string, string> = {
  pending_payment: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300',
  scheduled: 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300',
  factory_pickup_scheduled: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300',
  factory_pickup_in_progress: 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300',
  factory_pickup_completed: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900 dark:text-cyan-300',
  in_transit: 'bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300',
  delivery_in_progress: 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300',
  delivered: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300',
  completed: 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300',
  delayed: 'bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300',
};

const getStatusBadge = (status: string) => {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';
  return <Badge className={colorClass}>{status.replace('_', ' ')}</Badge>;
};

export const DeliveryManagement = () => {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in_transit' | 'completed' | 'pending_payment' | 'factory_pickup_scheduled' | 'factory_pickup_in_progress' | 'factory_pickup_completed' | 'delivery_in_progress' | 'delivered' | 'cancelled' | 'delayed'>('all');

  const { data: deliveries, isLoading, error } = useQuery({
    queryKey: ['deliveries', filter],
    queryFn: async () => {
      let query = supabase
        .from('deliveries')
        .select('*');
      
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Delivery[];
    },
  });

  const getFilteredDeliveries = () => {
    if (!deliveries) return [];
    return deliveries;
  };

  const filteredDeliveries = getFilteredDeliveries();

  const getFormattedDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading deliveries...</div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-500">Error loading deliveries</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Delivery Management</h3>
          <p className="text-sm text-muted-foreground">
            Track and manage customer deliveries
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setFilter('all')} 
                  className={filter === 'all' ? 'bg-primary text-primary-foreground' : ''}>
            All
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFilter('scheduled')}
                  className={filter === 'scheduled' ? 'bg-primary text-primary-foreground' : ''}>
            Scheduled
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFilter('in_transit')}
                  className={filter === 'in_transit' ? 'bg-primary text-primary-foreground' : ''}>
            In Transit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFilter('completed')}
                  className={filter === 'completed' ? 'bg-primary text-primary-foreground' : ''}>
            Completed
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Truck className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">{deliveries?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">
                {deliveries?.filter(d => d.status === 'scheduled').length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-muted-foreground mr-2" />
              <span className="text-2xl font-bold">
                {deliveries?.filter(d => d.status === 'in_transit').length || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableCaption>List of all deliveries</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Delivery #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pickup Date</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDeliveries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No deliveries found</TableCell>
              </TableRow>
            ) : (
              filteredDeliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell className="font-medium">{delivery.delivery_number}</TableCell>
                  <TableCell>
                    <div>
                      <div>{delivery.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{delivery.customer_phone}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                  <TableCell>{getFormattedDate(delivery.scheduled_pickup_date)}</TableCell>
                  <TableCell>{getFormattedDate(delivery.scheduled_delivery_date)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <MapPin className="h-3 w-3 mr-1" />
                        Track
                      </Button>
                      <Button variant="outline" size="sm">
                        <FileText className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};