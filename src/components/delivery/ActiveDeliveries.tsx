import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, MapPin, Calendar, User, Search, Filter } from "lucide-react";

export const ActiveDeliveries = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                <Button variant="outline" size="sm">
                  Track Location
                </Button>
                <Button size="sm">
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
    </div>
  );
};