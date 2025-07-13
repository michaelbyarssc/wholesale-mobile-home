import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  CheckCircle, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  Search,
  Filter,
  Eye,
  Truck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import DeliveryDetailsView from './DeliveryDetailsView';

export const CompletedDeliveries = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

  // Fetch completed deliveries
  const { data: completedDeliveries = [], isLoading } = useQuery({
    queryKey: ['completed-deliveries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select(`
          *,
          mobile_homes (
            manufacturer,
            model,
            width_feet,
            length_feet
          )
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch delivery photos count for each delivery
  const { data: photoCounts = {} } = useQuery({
    queryKey: ['delivery-photo-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_photos')
        .select('delivery_id, photo_type');
      
      if (error) throw error;
      
      // Count photos by delivery and type
      const counts: Record<string, { pickup: number, delivery: number, issue: number }> = {};
      data?.forEach(photo => {
        if (!counts[photo.delivery_id]) {
          counts[photo.delivery_id] = { pickup: 0, delivery: 0, issue: 0 };
        }
        counts[photo.delivery_id][photo.photo_type as keyof typeof counts[string]]++;
      });
      
      return counts;
    },
  });

  // Filter deliveries based on search and filters
  const filteredDeliveries = completedDeliveries.filter(delivery => {
    const matchesSearch = 
      delivery.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.mobile_homes?.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.mobile_homes?.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Completed Deliveries</h2>
          <p className="text-muted-foreground">
            View and manage all completed mobile home deliveries
          </p>
        </div>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          {completedDeliveries.length} Completed
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer, delivery number, or mobile home..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deliveries List */}
      <div className="grid gap-4">
        {filteredDeliveries.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Completed Deliveries</h3>
              <p className="text-muted-foreground text-center">
                {searchTerm ? 'No deliveries match your search criteria.' : 'Completed deliveries will appear here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredDeliveries.map((delivery) => {
            const photoCount = photoCounts[delivery.id] || { pickup: 0, delivery: 0, issue: 0 };
            const totalPhotos = photoCount.pickup + photoCount.delivery + photoCount.issue;
            
            return (
              <Card key={delivery.id} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>#{delivery.delivery_number}</span>
                        <span>•</span>
                        <span>{delivery.mobile_homes?.width_feet}' x {delivery.mobile_homes?.length_feet}'</span>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer & Timeline Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{delivery.customer_name}</p>
                          <p className="text-muted-foreground">{delivery.customer_phone}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">Completed</p>
                          <p className="text-muted-foreground">
                            {new Date(delivery.completed_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Pickup
                      </p>
                      <p className="text-xs text-muted-foreground">{delivery.pickup_address}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Delivery
                      </p>
                      <p className="text-xs text-muted-foreground">{delivery.delivery_address}</p>
                    </div>
                  </div>

                  {/* Photo Summary */}
                  {totalPhotos > 0 && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium mb-2">Delivery Documentation</p>
                      <div className="flex gap-4 text-xs">
                        <span>{photoCount.pickup} Pickup Photos</span>
                        <span>{photoCount.delivery} Delivery Photos</span>
                        <span>{photoCount.issue} Issue Reports</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedDelivery(delivery)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>

                  {/* Notes */}
                  {delivery.completion_notes && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Completion Notes:</p>
                      <p className="text-sm text-blue-700">{delivery.completion_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delivery Details Modal */}
      <Dialog open={!!selectedDelivery} onOpenChange={() => setSelectedDelivery(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Completed Delivery Details - {selectedDelivery?.delivery_number}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDelivery && <DeliveryDetailsView delivery={selectedDelivery} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};