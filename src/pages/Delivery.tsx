import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DeliveryDashboard } from "@/components/delivery/DeliveryDashboard";
import { DriverManagement } from "@/components/delivery/DriverManagement";
import { ActiveDeliveries } from "@/components/delivery/ActiveDeliveries";
import { CompletedDeliveries } from "@/components/delivery/CompletedDeliveries";
import { NewDeliveryScheduling } from "@/components/delivery/NewDeliveryScheduling";
import { GPSTracking } from "@/components/delivery/GPSTracking";
import { DriverPortal } from "@/components/delivery/DriverPortal";
import { DriverMobileApp } from "@/components/delivery/DriverMobileApp";
import { CustomerTrackingMap } from "@/components/delivery/CustomerTrackingMap";
import { DeliveryPerformanceDashboard } from "@/components/delivery/DeliveryPerformanceDashboard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/layout/LoadingSpinner";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { Truck, Users, Calendar, MapPin, BarChart3, CheckCircle, Search, HelpCircle, Mail, MessageSquare, Navigation, AlertCircle, Loader2, UserCheck, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validateTrackingToken, extractTokenFromUrl } from "@/utils/trackingUtils";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Delivery = () => {
  const { user, userProfile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };
  const { isAdmin, isSuperAdmin, isLoading: rolesLoading } = useUserRoles();
  const { cartItems } = useShoppingCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // URL parameters and state
  const { token, trackingToken } = useParams();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [currentView, setCurrentView] = useState<"loading" | "customer_tracking" | "driver_login" | "driver_portal" | "admin_dashboard">("loading");
  const [trackingInput, setTrackingInput] = useState("");
  const [driverEmail, setDriverEmail] = useState("");
  const [driverPassword, setDriverPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Emulation state for super admins
  const [emulationMode, setEmulationMode] = useState<"none" | "customer" | "admin" | "driver">("none");
  const [showEmulationControls, setShowEmulationControls] = useState(false);

  // Get tracking token from various sources
  const urlTrackingToken = token || trackingToken || searchParams.get('token') || searchParams.get('tracking') || extractTokenFromUrl(window.location.pathname);
  const mode = searchParams.get('mode');

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

  const isDriver = !!driverProfile;

  // Determine what view to show based on context and emulation
  useEffect(() => {
    if (isLoadingDriver || rolesLoading) {
      setCurrentView("loading");
      return;
    }

    // Reset tab if admin loses access to restricted tabs
    if (isAdmin && !isSuperAdmin && (activeTab === "scheduling" || activeTab === "drivers")) {
      setActiveTab("dashboard");
    }

    // Handle emulation mode for super admins
    if (isSuperAdmin && emulationMode !== "none") {
      switch (emulationMode) {
        case "customer":
          setCurrentView("customer_tracking");
          return;
        case "admin":
          setCurrentView("admin_dashboard");
          return;
        case "driver":
          setCurrentView("driver_portal");
          return;
      }
    }

    // If there's a tracking token in URL, show customer tracking
    if (urlTrackingToken && validateTrackingToken(urlTrackingToken)) {
      setCurrentView("customer_tracking");
      return;
    }

    // If mode is set to driver or user needs driver login
    if (mode === "driver" || (searchParams.get('login') === 'driver')) {
      if (user && isDriver) {
        setCurrentView("driver_portal");
      } else {
        setCurrentView("driver_login");
      }
      return;
    }

    // If user is authenticated
    if (user) {
      if (isDriver && !isAdmin) {
        setCurrentView("driver_portal");
      } else if (isAdmin) {
        setCurrentView("admin_dashboard");
      } else {
        // Regular users see tracking interface
        setCurrentView("customer_tracking");
      }
      return;
    }

    // Default: show customer tracking interface
    setCurrentView("customer_tracking");
  }, [user, isAdmin, isDriver, isLoadingDriver, rolesLoading, urlTrackingToken, mode, searchParams, isSuperAdmin, emulationMode]);

  // Handle driver login
  const handleDriverLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: driverEmail,
        password: driverPassword,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data.user) {
        // Check if user is a driver
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("*")
          .eq("user_id", data.user.id)
          .single();
        
        if (driverError || !driverData) {
          setError("Access denied. Driver account required.");
          await supabase.auth.signOut();
          return;
        }

        toast({
          title: "Welcome back!",
          description: `Logged in as ${driverData.first_name} ${driverData.last_name}`,
        });
        
        setCurrentView("driver_portal");
      }
    } catch (error: any) {
      setError(error.message || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle tracking search
  const handleTrackingSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking number",
        variant: "destructive"
      });
      return;
    }

    // Validate and navigate
    if (validateTrackingToken(trackingInput.trim())) {
      navigate(`/delivery/${trackingInput.trim()}`);
    } else {
      // Try navigating to delivery portal
      navigate(`/delivery/${trackingInput.trim()}`);
    }
  };

  // Handle emulation mode changes
  const handleEmulationChange = (mode: "none" | "customer" | "admin" | "driver") => {
    setEmulationMode(mode);
    if (mode === "none") {
      setShowEmulationControls(false);
    }
  };

  // Create mock driver profile for emulation
  const mockDriverProfile = {
    id: "mock-driver-id",
    user_id: user?.id || "mock-user-id",
    first_name: "Demo",
    last_name: "Driver",
    phone: "555-0123",
    license_number: "DL123456",
    status: "available"
  };

  // Emulation Controls Component
  const EmulationControls = () => {
    if (!isSuperAdmin) return null;

    return (
      <div className="fixed top-20 right-4 z-[60]">
        {!showEmulationControls ? (
          <Button
            onClick={() => setShowEmulationControls(true)}
            variant="outline"
            size="sm"
            className="bg-purple-600 text-white border-purple-600 hover:bg-purple-700 shadow-lg"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Emulate User
          </Button>
        ) : (
          <Card className="bg-white border-2 border-purple-600 shadow-xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-purple-700">User Emulation</h3>
                <Button
                  onClick={() => setShowEmulationControls(false)}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Select value={emulationMode} onValueChange={handleEmulationChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Normal (Super Admin)</SelectItem>
                  <SelectItem value="customer">Customer View</SelectItem>
                  <SelectItem value="admin">Admin View</SelectItem>
                  <SelectItem value="driver">Driver View</SelectItem>
                </SelectContent>
              </Select>
              
              {emulationMode !== "none" && (
                <div className="flex items-center gap-2 text-sm text-purple-700">
                  <Eye className="h-3 w-3" />
                  Emulating: {emulationMode}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Emulation Status Banner
  const EmulationBanner = () => {
    if (!isSuperAdmin || emulationMode === "none") return null;
    
    return (
      <div className="bg-purple-100 border-b border-purple-200 px-4 py-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-200 text-purple-800">
              <Eye className="h-3 w-3 mr-1" />
              Emulation Mode: {emulationMode.charAt(0).toUpperCase() + emulationMode.slice(1)}
            </Badge>
            <span className="text-sm text-purple-700">
              You are viewing the delivery portal as a {emulationMode} would see it
            </span>
          </div>
          <Button
            onClick={() => handleEmulationChange("none")}
            variant="outline"
            size="sm"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            Exit Emulation
          </Button>
        </div>
      </div>
    );
  };

  // Render loading state
  if (currentView === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <EmulationBanner />
        <Header user={user} userProfile={userProfile} cartItems={cartItems} isLoading={true} onLogout={handleLogout} onToggleCart={() => {}} />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <LoadingSpinner />
          </div>
        </main>
        <Footer />
        <EmulationControls />
      </div>
    );
  }

  // Render customer tracking interface
  if (currentView === "customer_tracking") {
    return (
      <div className="min-h-screen bg-background">
        <EmulationBanner />
        <Header user={user} userProfile={userProfile} cartItems={cartItems} isLoading={false} onLogout={handleLogout} onToggleCart={() => {}} />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4 max-w-4xl">
            {urlTrackingToken ? (
              // Show tracking results
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold mb-2">Delivery Tracking</h1>
                  <p className="text-muted-foreground">Track your mobile home delivery in real-time</p>
                </div>
                
                <CustomerTrackingMap 
                  trackingToken={urlTrackingToken}
                />
                
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/delivery')}
                  >
                    Track Different Delivery
                  </Button>
                </div>
              </div>
            ) : (
              // Show tracking input form
              <div className="space-y-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                    <Truck className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold mb-2">Track Your Delivery</h1>
                  <p className="text-muted-foreground">
                    Enter your tracking number to view your delivery status
                  </p>
                </div>

                <Card className="max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Enter Tracking Information
                    </CardTitle>
                    <CardDescription>
                      Enter your estimate number, invoice number, or delivery number
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleTrackingSearch} className="space-y-4">
                      <div>
                        <label htmlFor="tracking-number" className="block text-sm font-medium mb-2">
                          Tracking Number
                        </label>
                        <Input
                          id="tracking-number"
                          type="text"
                          placeholder="WMH-E-123456, WMH-I-123456, or track_abc123"
                          value={trackingInput}
                          onChange={(e) => setTrackingInput(e.target.value)}
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter your estimate number (WMH-E-), invoice number (WMH-I-), delivery number (WMH-D-), or tracking token
                        </p>
                      </div>
                      <Button type="submit" className="w-full">
                        Track My Delivery
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HelpCircle className="h-5 w-5" />
                      How to Find Your Tracking Number
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Mail className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">Check Your Email</h4>
                          <p className="text-sm text-muted-foreground">
                            Look for your estimate, invoice, or delivery confirmation email.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium">Check Your Text Messages</h4>
                          <p className="text-sm text-muted-foreground">
                            Look for an SMS containing your tracking information.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Need help? Contact us:</h4>
                      <div className="text-sm">
                        <p><strong>Phone:</strong> 864-680-4030</p>
                        <p><strong>Email:</strong> Support@WholesaleMobileHome.com</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Driver Login Option */}
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Are you a driver?</p>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentView("driver_login")}
                  >
                    Driver Login
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
        <EmulationControls />
      </div>
    );
  }

  // Render driver login
  if (currentView === "driver_login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-background flex items-center justify-center p-4">
        <EmulationBanner />
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-6">
              <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
                <Truck className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold">Driver Portal</CardTitle>
              <p className="text-muted-foreground">
                Sign in to access your delivery assignments
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleDriverLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="driver@company.com"
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">Password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={driverPassword}
                    onChange={(e) => setDriverPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Navigation className="mr-2 h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
              
              <div className="mt-6 text-center space-y-2">
                <Button 
                  variant="link" 
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={() => navigate('/auth?forgot=true&driver=true')}
                >
                  Forgot your password?
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  Need help? Contact your administrator
                </p>
                <Button 
                  variant="link" 
                  className="mt-2 text-sm"
                  onClick={() => navigate('/delivery')}
                >
                  ← Back to Tracking
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <EmulationControls />
      </div>
    );
  }

  // Render driver portal (mobile app for drivers)
  if (currentView === "driver_portal") {
    // Use real driver profile if user is a driver, otherwise use mock for emulation
    const activeDriverProfile = isDriver ? driverProfile : mockDriverProfile;
    
    return (
      <div className="min-h-screen bg-background">
        <EmulationBanner />
        <DriverMobileApp driverProfile={activeDriverProfile} />
        <EmulationControls />
      </div>
    );
  }

  // Render admin dashboard (existing delivery management)
  if (currentView === "admin_dashboard") {
    return (
      <div className="min-h-screen bg-background">
        <EmulationBanner />
        <Header user={user} userProfile={userProfile} cartItems={cartItems} isLoading={false} onLogout={handleLogout} onToggleCart={() => {}} />
        <main className="flex-1 py-8">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Delivery Management</h1>
              <p className="text-muted-foreground">
                Manage deliveries, drivers, and track mobile home deliveries in real-time
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-7' : 'grid-cols-5'}`}>
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="deliveries" className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Active Deliveries
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Completed
                </TabsTrigger>
                {isSuperAdmin && (
                  <TabsTrigger value="scheduling" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Scheduling
                  </TabsTrigger>
                )}
                {isSuperAdmin && (
                  <TabsTrigger value="drivers" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Driver Management
                  </TabsTrigger>
                )}
                <TabsTrigger value="tracking" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  GPS Tracking
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Performance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="mt-6">
                <DeliveryDashboard />
              </TabsContent>

              <TabsContent value="deliveries" className="mt-6">
                <ActiveDeliveries />
              </TabsContent>

              <TabsContent value="completed" className="mt-6">
                <CompletedDeliveries />
              </TabsContent>

              {isSuperAdmin && (
                <TabsContent value="scheduling" className="mt-6">
                  <NewDeliveryScheduling />
                </TabsContent>
              )}

              {isSuperAdmin && (
                <TabsContent value="drivers" className="mt-6">
                  <DriverManagement />
                </TabsContent>
              )}

              <TabsContent value="tracking" className="mt-6">
                <GPSTracking />
              </TabsContent>

              <TabsContent value="performance" className="mt-6">
                <DeliveryPerformanceDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <Footer />
        <EmulationControls />
      </div>
    );
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen bg-background">
      <Header user={user} userProfile={userProfile} cartItems={cartItems} isLoading={false} onLogout={handleLogout} onToggleCart={() => {}} />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
              <CardDescription>
                Determining the appropriate view for your account.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Delivery;
