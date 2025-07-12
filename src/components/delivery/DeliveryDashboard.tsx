import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Clock, CheckCircle, AlertTriangle, Users } from "lucide-react";

export const DeliveryDashboard = () => {
  // Fetch delivery statistics
  const { data: deliveryStats, isLoading } = useQuery({
    queryKey: ["delivery-stats"],
    queryFn: async () => {
      const { data: deliveries, error } = await supabase
        .from("deliveries")
        .select("status");
      
      if (error) throw error;

      const stats = {
        total: deliveries.length,
        scheduled: deliveries.filter(d => d.status === 'scheduled').length,
        inTransit: deliveries.filter(d => d.status === 'in_transit').length,
        delivered: deliveries.filter(d => d.status === 'delivered').length,
        delayed: deliveries.filter(d => d.status === 'delayed').length,
      };

      return stats;
    },
  });

  // Fetch recent deliveries
  const { data: recentDeliveries } = useQuery({
    queryKey: ["recent-deliveries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliveries")
        .select(`
          *,
          mobile_homes(model, manufacturer),
          delivery_assignments(
            drivers(first_name, last_name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch driver statistics
  const { data: driverStats } = useQuery({
    queryKey: ["driver-stats"],
    queryFn: async () => {
      const { data: drivers, error } = await supabase
        .from("drivers")
        .select("status");
      
      if (error) throw error;

      const stats = {
        total: drivers.length,
        available: drivers.filter(d => d.status === 'available').length,
        onDelivery: drivers.filter(d => d.status === 'on_delivery').length,
        offDuty: drivers.filter(d => d.status === 'off_duty').length,
      };

      return stats;
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { variant: "secondary", icon: Clock },
      factory_pickup_scheduled: { variant: "outline", icon: Package },
      factory_pickup_in_progress: { variant: "default", icon: Package },
      factory_pickup_completed: { variant: "default", icon: CheckCircle },
      in_transit: { variant: "default", icon: Truck },
      delivery_in_progress: { variant: "default", icon: Truck },
      delivered: { variant: "default", icon: CheckCircle },
      completed: { variant: "default", icon: CheckCircle },
      delayed: { variant: "destructive", icon: AlertTriangle },
      cancelled: { variant: "secondary", icon: AlertTriangle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { variant: "secondary", icon: Clock };
    const IconComponent = config.icon;

    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">All active deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryStats?.inTransit || 0}</div>
            <p className="text-xs text-muted-foreground">Currently being delivered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{driverStats?.available || 0}</div>
            <p className="text-xs text-muted-foreground">Ready for assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delayed</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryStats?.delayed || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Deliveries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <CardDescription>Latest delivery activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDeliveries?.map((delivery) => (
              <div key={delivery.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{delivery.delivery_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {delivery.mobile_homes?.manufacturer} {delivery.mobile_homes?.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Customer: {delivery.customer_name}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  {getStatusBadge(delivery.status)}
                  <p className="text-xs text-muted-foreground">
                    {delivery.delivery_assignments?.length > 0 
                      ? `Driver: ${delivery.delivery_assignments[0].drivers?.first_name} ${delivery.delivery_assignments[0].drivers?.last_name}`
                      : "No driver assigned"
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};