import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, MapPin, Calendar, User, Search, Filter, Eye, Navigation, RefreshCw } from "lucide-react";
import { DocuSignButton } from "./DocuSignButton";
import { useToast } from "@/hooks/use-toast";

export const ActiveDeliveries = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ["active-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          mobile_homes(model, manufacturer),
          delivery_assignments(
            role,
            drivers(first_name, last_name, status)
          ),
          factories(name)
        `)
        .neq("status", "completed")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const filteredDeliveries = deliveries?.filter(delivery => {
    const matchesSearch = 
      delivery.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || delivery.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Fetch GPS tracking data for selected delivery
  const { data: gpsData } = useQuery({
    queryKey: ["gps-tracking", selectedDelivery?.id],
    queryFn: async () => {
      if (!selectedDelivery?.id) return null;
      const { data, error } = await supabase
        .from("delivery_gps_tracking")
        .select("*")
        .eq("delivery_id", selectedDelivery.id)
        .order("timestamp", { ascending: false })
        .limit(1);
      
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!selectedDelivery?.id && isTrackingOpen,
  });

  const handleViewDetails = (delivery: any) => {
    setSelectedDelivery(delivery);
    setIsDetailsOpen(true);
  };

  const handleTrackLocation = (delivery: any) => {
    setSelectedDelivery(delivery);
    setIsTrackingOpen(true);
  };

  const handleUpdateStatus = (delivery: any) => {
    setSelectedDelivery(delivery);
    setNewStatus(delivery.status);
    setIsStatusOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedDelivery || !newStatus) return;

    try {
      const { error } = await supabase
        .from("deliveries")
        .update({ status: newStatus as any })
        .eq("id", selectedDelivery.id);

      if (error) throw error;

      // Insert status history
      const { data: user } = await supabase.auth.getUser();
      await supabase
        .from("delivery_status_history")
        .insert({
          delivery_id: selectedDelivery.id,
          previous_status: selectedDelivery.status as any,
          new_status: newStatus as any,
          changed_by: user.user?.id,
          notes: `Status updated via admin dashboard`
        });

      toast({
        title: "Status Updated",
        description: `Delivery status changed to ${newStatus.replace(/_/g, ' ')}`
      });

      queryClient.invalidateQueries({ queryKey: ["active-deliveries"] });
      setIsStatusOpen(false);
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update delivery status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { variant: "secondary", color: "bg-blue-100 text-blue-800" },
      factory_pickup_scheduled: { variant: "outline", color: "bg-purple-100 text-purple-800" },
      factory_pickup_in_progress: { variant: "default", color: "bg-orange-100 text-orange-800" },
      factory_pickup_completed: { variant: "default", color: "bg-green-100 text-green-800" },
      in_transit: { variant: "default", color: "bg-yellow-100 text-yellow-800" },
      delivery_in_progress: { variant: "default", color: "bg-blue-100 text-blue-800" },
      delivered: { variant: "default", color: "bg-green-100 text-green-800" },
      delayed: { variant: "destructive", color: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.scheduled;

    return (
      <Badge variant={config.variant as any} className={config.color}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Loading deliveries...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Active Deliveries</h2>
          <p className="text-muted-foreground">Monitor and manage ongoing deliveries</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search deliveries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="factory_pickup_scheduled">Factory Pickup Scheduled</SelectItem>
            <SelectItem value="factory_pickup_in_progress">Factory Pickup In Progress</SelectItem>
            <SelectItem value="factory_pickup_completed">Factory Pickup Completed</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>
            <SelectItem value="delivery_in_progress">Delivery In Progress</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="delayed">Delayed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deliveries List */}
      <div className="space-y-4">
        {filteredDeliveries?.map((delivery) => (
          <Card key={delivery.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{delivery.delivery_number}</CardTitle>
                  <CardDescription>
                    {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
                  </CardDescription>
                </div>
                {getStatusBadge(delivery.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Customer:</span>
                  </div>
                  <div className="text-sm">
                    <p>{delivery.customer_name}</p>
                    <p className="text-muted-foreground">{delivery.customer_phone}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Delivery Address:</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {delivery.delivery_address}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Scheduled Date:</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {delivery.scheduled_delivery_date 
                      ? new Date(delivery.scheduled_delivery_date).toLocaleDateString()
                      : "Not scheduled"
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Driver:</span>
                  </div>
                  <div className="text-sm">
                    {delivery.delivery_assignments?.length > 0 ? (
                      delivery.delivery_assignments.map((assignment, index) => (
                        <p key={index} className="text-muted-foreground">
                          {assignment.drivers?.first_name} {assignment.drivers?.last_name} ({assignment.role})
                        </p>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No driver assigned</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewDetails(delivery)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleTrackLocation(delivery)}
                >
                  <Navigation className="h-4 w-4 mr-1" />
                  Track Location
                </Button>
                <DocuSignButton
                  deliveryId={delivery.id}
                  customerEmail={delivery.customer_email}
                  customerName={delivery.customer_name}
                  deliveryNumber={delivery.delivery_number}
                />
                <Button 
                  size="sm"
                  onClick={() => handleUpdateStatus(delivery)}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Update Status
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDeliveries?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No active deliveries found</p>
          </CardContent>
        </Card>
      )}

      {/* View Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedDelivery?.delivery_number}
            </DialogDescription>
          </DialogHeader>
          {selectedDelivery && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Customer Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedDelivery.customer_name}</p>
                    <p><span className="font-medium">Email:</span> {selectedDelivery.customer_email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedDelivery.customer_phone}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Mobile Home</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Model:</span> {selectedDelivery.mobile_homes?.manufacturer} {selectedDelivery.mobile_homes?.model}</p>
                    <p><span className="font-medium">Type:</span> {selectedDelivery.mobile_home_type?.replace(/_/g, ' ')}</p>
                    <p><span className="font-medium">Crew Type:</span> {selectedDelivery.crew_type?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Addresses</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Pickup:</span> {selectedDelivery.pickup_address}</p>
                    <p><span className="font-medium">Delivery:</span> {selectedDelivery.delivery_address}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Schedule</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Pickup Date:</span> {selectedDelivery.scheduled_pickup_date || "Not scheduled"}</p>
                    <p><span className="font-medium">Delivery Date:</span> {selectedDelivery.scheduled_delivery_date || "Not scheduled"}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Status & Costs</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Status:</span> {getStatusBadge(selectedDelivery.status)}</p>
                    <p><span className="font-medium">Total Cost:</span> ${selectedDelivery.total_delivery_cost || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Track Location Modal */}
      <Dialog open={isTrackingOpen} onOpenChange={setIsTrackingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>GPS Tracking</DialogTitle>
            <DialogDescription>
              Current location for {selectedDelivery?.delivery_number}
            </DialogDescription>
          </DialogHeader>
          {gpsData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Latitude</p>
                  <p className="text-muted-foreground">{gpsData.latitude}</p>
                </div>
                <div>
                  <p className="font-medium">Longitude</p>
                  <p className="text-muted-foreground">{gpsData.longitude}</p>
                </div>
                <div>
                  <p className="font-medium">Last Update</p>
                  <p className="text-muted-foreground">
                    {new Date(gpsData.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Speed</p>
                  <p className="text-muted-foreground">{gpsData.speed_mph || 0} mph</p>
                </div>
              </div>
              {gpsData.address && (
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-muted-foreground">{gpsData.address}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No GPS data available for this delivery.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
            <DialogDescription>
              Change status for {selectedDelivery?.delivery_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium mb-2">Current Status</p>
              {selectedDelivery && getStatusBadge(selectedDelivery.status)}
            </div>
            <div>
              <p className="font-medium mb-2">New Status</p>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="factory_pickup_scheduled">Factory Pickup Scheduled</SelectItem>
                  <SelectItem value="factory_pickup_in_progress">Factory Pickup In Progress</SelectItem>
                  <SelectItem value="factory_pickup_completed">Factory Pickup Completed</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivery_in_progress">Delivery In Progress</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsStatusOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStatusUpdate}>
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};