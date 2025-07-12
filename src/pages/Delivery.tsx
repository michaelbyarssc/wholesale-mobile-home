import { useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeliveryDashboard } from "@/components/delivery/DeliveryDashboard";
import { DriverManagement } from "@/components/delivery/DriverManagement";
import { ActiveDeliveries } from "@/components/delivery/ActiveDeliveries";
import { DeliveryScheduling } from "@/components/delivery/DeliveryScheduling";
import { GPSTracking } from "@/components/delivery/GPSTracking";
import { DriverPortal } from "@/components/delivery/DriverPortal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/layout/LoadingSpinner";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { Truck, Users, Calendar, MapPin, BarChart3 } from "lucide-react";

const Delivery = () => {
  const { user } = useAuthUser();
  const { cartItems } = useShoppingCart();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Check if user is a driver
  const { data: driverProfile, isLoading: isLoadingDriver } = useQuery({
    queryKey: ["driver-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        console.log("User is not a driver");
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });

  // Check if user is admin
  const { data: userRoles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isAdmin = userRoles?.some(role => ['admin', 'super_admin'].includes(role.role));
  const isDriver = !!driverProfile;

  if (isLoadingDriver || isLoadingRoles) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} userProfile={null} cartItems={cartItems} isLoading={isLoadingDriver || isLoadingRoles} onLogout={() => {}} onToggleCart={() => {}} />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <LoadingSpinner />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If user is a driver, show driver portal
  if (isDriver && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} userProfile={null} cartItems={cartItems} isLoading={false} onLogout={() => {}} onToggleCart={() => {}} />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <DriverPortal driverProfile={driverProfile} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If user is not admin or driver, show access denied
  if (!isAdmin && !isDriver) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} userProfile={null} cartItems={cartItems} isLoading={false} onLogout={() => {}} onToggleCart={() => {}} />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <Card>
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  You don't have permission to access the delivery management system.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} userProfile={null} cartItems={cartItems} isLoading={false} onLogout={() => {}} onToggleCart={() => {}} />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Delivery Management</h1>
            <p className="text-muted-foreground">
              Manage deliveries, drivers, and track mobile home deliveries in real-time
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="deliveries" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Active Deliveries
              </TabsTrigger>
              <TabsTrigger value="scheduling" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Scheduling
              </TabsTrigger>
              <TabsTrigger value="drivers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Driver Management
              </TabsTrigger>
              <TabsTrigger value="tracking" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                GPS Tracking
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <DeliveryDashboard />
            </TabsContent>

            <TabsContent value="deliveries" className="mt-6">
              <ActiveDeliveries />
            </TabsContent>

            <TabsContent value="scheduling" className="mt-6">
              <DeliveryScheduling />
            </TabsContent>

            <TabsContent value="drivers" className="mt-6">
              <DriverManagement />
            </TabsContent>

            <TabsContent value="tracking" className="mt-6">
              <GPSTracking />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Delivery;