import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Edit, Trash2, Phone, Mail, Calendar, MapPin, Key } from 'lucide-react';

const DriversTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);

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

  // Fetch drivers
  const { data: drivers = [], isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select(`
          *,
          delivery_assignments (
            id,
            deliveries (
              id,
              delivery_number,
              status,
              customer_name
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Create driver mutation
  const createDriverMutation = useMutation({
    mutationFn: async (driverData: typeof formData) => {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: driverData.email,
          role: 'driver',
          userData: {
            first_name: driverData.first_name,
            last_name: driverData.last_name,
            phone: driverData.phone,
            cdl_class: driverData.cdl_class || null,
            license_number: driverData.license_number || null,
            license_expiry: driverData.license_expiry || null,
            hourly_rate: driverData.hourly_rate ? parseFloat(driverData.hourly_rate) : null,
            employee_id: driverData.employee_id || null,
            status: driverData.status
          }
        }
      });

      if (error) throw error;
      return data;
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

  // Update driver mutation
  const updateDriverMutation = useMutation({
    mutationFn: async (driverData: typeof formData & { id: string }) => {
      const { data, error } = await supabase
        .from('drivers')
        .update({
          first_name: driverData.first_name,
          last_name: driverData.last_name,
          phone: driverData.phone,
          cdl_class: driverData.cdl_class || null,
          license_number: driverData.license_number || null,
          license_expiry: driverData.license_expiry || null,
          hourly_rate: driverData.hourly_rate ? parseFloat(driverData.hourly_rate) : null,
          employee_id: driverData.employee_id || null,
          status: driverData.status
        })
        .eq('id', driverData.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setEditingDriver(null);
      resetForm();
      toast({
        title: "Driver Updated",
        description: "Driver information has been updated successfully.",
      });
    }
  });

  // Delete driver mutation
  const deleteDriverMutation = useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from('drivers')
        .update({ active: false })
        .eq('id', driverId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: "Driver Deactivated",
        description: "Driver has been deactivated successfully.",
      });
    }
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (driver: any) => {
      if (!driver.user_id) {
        throw new Error("Driver does not have an associated user account. Please contact support.");
      }

      const { data, error } = await supabase.functions.invoke('admin-reset-password-secure', {
        body: {
          user_id: driver.user_id,
          new_password: 'Wholesale2025!'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result, driver) => {
      toast({
        title: "Password Reset Successful",
        description: `Driver password has been reset to: Wholesale2025! Please share this temporary password with ${driver.first_name} ${driver.last_name}.`,
        duration: 10000, // Show for 10 seconds for drivers
      });
    },
    onError: (error: any) => {
      toast({
        title: "Password Reset Failed",
        description: error.message || "Failed to reset driver password.",
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

  const handleEdit = (driver: any) => {
    setEditingDriver(driver);
    setFormData({
      first_name: driver.first_name || '',
      last_name: driver.last_name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      cdl_class: driver.cdl_class || '',
      license_number: driver.license_number || '',
      license_expiry: driver.license_expiry || '',
      hourly_rate: driver.hourly_rate?.toString() || '',
      employee_id: driver.employee_id || '',
      status: driver.status || 'available'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      updateDriverMutation.mutate({ ...formData, id: editingDriver.id });
    } else {
      createDriverMutation.mutate(formData);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'available': { variant: 'default' as const, label: 'Available' },
      'busy': { variant: 'secondary' as const, label: 'Busy' },
      'off_duty': { variant: 'outline' as const, label: 'Off Duty' },
      'inactive': { variant: 'destructive' as const, label: 'Inactive' }
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
  };

  const getActiveDeliveries = (driver: any) => {
    return driver.delivery_assignments?.filter((assignment: any) => 
      assignment.deliveries && !['completed', 'cancelled'].includes(assignment.deliveries.status)
    ).length || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Driver Management</h2>
          <p className="text-muted-foreground">Manage driver accounts and assignments</p>
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
              <DialogTitle>
                {editingDriver ? 'Edit Driver' : 'Create New Driver'}
              </DialogTitle>
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
                    disabled={!!editingDriver} // Can't change email after creation
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
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="off_duty">Off Duty</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingDriver(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createDriverMutation.isPending || updateDriverMutation.isPending}>
                  {editingDriver ? 'Update Driver' : 'Create Driver'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Truck className="h-5 w-5" />
            <span>All Drivers ({drivers.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading drivers...</p>
            </div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No drivers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>CDL Info</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Active Deliveries</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.map((driver) => {
                    const statusBadge = getStatusBadge(driver.status);
                    const activeDeliveries = getActiveDeliveries(driver);
                    
                    return (
                      <TableRow key={driver.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {driver.first_name} {driver.last_name}
                            </div>
                            {driver.employee_id && (
                              <div className="text-sm text-muted-foreground">
                                ID: {driver.employee_id}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1" />
                              {driver.email}
                            </div>
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1" />
                              {driver.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {driver.cdl_class && (
                              <div className="text-sm">
                                <span className="font-medium">Class:</span> {driver.cdl_class}
                              </div>
                            )}
                            {driver.license_expiry && (
                              <div className="text-sm text-muted-foreground">
                                Expires: {new Date(driver.license_expiry).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={activeDeliveries > 0 ? "default" : "outline"}>
                            {activeDeliveries} active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleEdit(driver);
                                setIsCreateDialogOpen(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => resetPasswordMutation.mutate(driver)}
                              disabled={resetPasswordMutation.isPending || driver.status === 'inactive'}
                              title={driver.user_id ? "Reset driver password" : "Driver has no user account"}
                            >
                              <Key className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteDriverMutation.mutate(driver.id)}
                              disabled={activeDeliveries > 0}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriversTab;