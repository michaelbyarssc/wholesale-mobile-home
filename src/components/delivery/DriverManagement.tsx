import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, Phone, Mail } from "lucide-react";
import { useUserRoles } from "@/hooks/useUserRoles";

export const DriverManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSuperAdmin, verifyAdminAccess } = useUserRoles();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    cdl_class: '',
    license_number: '',
    license_expiry: '',
    hourly_rate: '',
    employee_id: '',
    status: 'available' as const
  });

  const { data: drivers, isLoading } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      // Verify admin access
      const hasAccess = await verifyAdminAccess();
      if (!hasAccess) {
        throw new Error('Admin access required');
      }

      const { data, error } = await supabase
        .from("drivers")
        .select(`
          *,
          delivery_assignments(
            id,
            delivery_id,
            active,
            deliveries(delivery_number, status)
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Create driver mutation
  const createDriverMutation = useMutation({
    mutationFn: async (driverData: typeof formData) => {
      // Verify admin access
      const hasAccess = await verifyAdminAccess();
      if (!hasAccess) {
        throw new Error('Admin access required to create drivers');
      }

      // First create auth user
      const tempPassword = `Driver${Math.random().toString(36).slice(-8)}`;
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: driverData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          role: 'driver'
        }
      });

      if (authError) throw authError;

      // Create driver record
      const { data, error } = await supabase
        .from('drivers')
        .insert({
          user_id: authData.user.id,
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          email: driverData.email,
          phone: driverData.phone,
          cdl_class: driverData.cdl_class || null,
          license_number: driverData.license_number || null,
          license_expiry: driverData.license_expiry || null,
          hourly_rate: driverData.hourly_rate ? parseFloat(driverData.hourly_rate) : null,
          employee_id: driverData.employee_id || null,
          status: driverData.status
        })
        .select()
        .single();

      if (error) throw error;

      // Add driver role
      await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'driver'
        });

      return { driver: data, tempPassword };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Driver Created",
        description: `Driver account created with temporary password: ${result.tempPassword}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      cdl_class: '',
      license_number: '',
      license_expiry: '',
      hourly_rate: '',
      employee_id: '',
      status: 'available'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDriverMutation.mutate(formData);
  };

  const filteredDrivers = drivers?.filter(driver =>
    driver.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { variant: "default", color: "text-green-600" },
      on_delivery: { variant: "secondary", color: "text-blue-600" },
      off_duty: { variant: "outline", color: "text-yellow-600" },
      inactive: { variant: "destructive", color: "text-red-600" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;

    return (
      <Badge variant={config.variant as any}>
        {status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Loading drivers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Driver Management</h2>
          <p className="text-muted-foreground">Manage delivery drivers and their assignments</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Driver</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cdl_class">CDL Class</Label>
                  <Select value={formData.cdl_class} onValueChange={(value) => setFormData({ ...formData, cdl_class: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select CDL Class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">Class A</SelectItem>
                      <SelectItem value="B">Class B</SelectItem>
                      <SelectItem value="C">Class C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_number">License Number</Label>
                  <Input
                    id="license_number"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_expiry">License Expiry</Label>
                  <Input
                    id="license_expiry"
                    type="date"
                    value={formData.license_expiry}
                    onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input
                    id="employee_id"
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="on_delivery">On Delivery</SelectItem>
                      <SelectItem value="off_duty">Off Duty</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDriverMutation.isPending}>
                  Create Driver
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search drivers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDrivers?.map((driver) => (
          <Card key={driver.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {driver.first_name} {driver.last_name}
                    </CardTitle>
                    <CardDescription>
                      ID: {driver.employee_id || 'Not assigned'}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(driver.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{driver.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{driver.email}</span>
                </div>
              </div>

              {driver.delivery_assignments?.filter(a => a.active).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Current Assignments:</p>
                  {driver.delivery_assignments
                    .filter(a => a.active)
                    .map((assignment) => (
                      <div key={assignment.id} className="text-xs p-2 bg-muted rounded">
                        Delivery: {assignment.deliveries?.delivery_number}
                        <br />
                        Status: {assignment.deliveries?.status?.replace(/_/g, ' ')}
                      </div>
                    ))}
                </div>
              )}

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Details
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDrivers?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No drivers found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};