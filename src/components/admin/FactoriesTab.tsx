import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Factory } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Factory = Database['public']['Tables']['factories']['Row'];

interface FactoryFormData {
  name: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
}

export const FactoriesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [formData, setFormData] = useState<FactoryFormData>({
    name: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: ''
  });

  // Fetch factories
  const { data: factories = [], isLoading } = useQuery({
    queryKey: ['factories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('factories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Factory[];
    }
  });

  // Create factory mutation
  const createFactory = useMutation({
    mutationFn: async (data: FactoryFormData) => {
      const { error } = await supabase
        .from('factories')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Factory created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create factory: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Update factory mutation
  const updateFactory = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: FactoryFormData }) => {
      const { error } = await supabase
        .from('factories')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      setEditingFactory(null);
      resetForm();
      toast({
        title: "Success",
        description: "Factory updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update factory: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Delete factory mutation
  const deleteFactory = useMutation({
    mutationFn: async (id: string) => {
      // First check if factory is assigned to any mobile homes
      const { data: assignments } = await supabase
        .from('mobile_home_factories')
        .select('id')
        .eq('factory_id', id)
        .limit(1);

      if (assignments && assignments.length > 0) {
        throw new Error('Cannot delete factory that is assigned to mobile homes');
      }

      const { error } = await supabase
        .from('factories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factories'] });
      toast({
        title: "Success",
        description: "Factory deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      phone: '',
      email: ''
    });
  };

  const handleEdit = (factory: Factory) => {
    setEditingFactory(factory);
    setFormData({
      name: factory.name,
      street_address: factory.street_address,
      city: factory.city,
      state: factory.state,
      zip_code: factory.zip_code,
      phone: factory.phone || '',
      email: factory.email || ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingFactory) {
      updateFactory.mutate({ id: editingFactory.id, data: formData });
    } else {
      createFactory.mutate(formData);
    }
  };

  const validateForm = () => {
    return formData.name && formData.street_address && formData.city && 
           formData.state && formData.zip_code;
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading factories...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Factories Management</h3>
          <p className="text-sm text-gray-600">Manage factory locations for mobile home manufacturing</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Factory
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5" />
                Add New Factory
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Factory Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Clayton Factory - Charleston"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="street_address">Street Address *</Label>
                  <Input
                    id="street_address"
                    value={formData.street_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                    placeholder="123 Industrial Drive"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Charleston"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                    placeholder="SC"
                    maxLength={2}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="zip_code">ZIP Code *</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="29401"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(843) 555-0123"
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="factory@company.com"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!validateForm() || createFactory.isPending}
                >
                  {createFactory.isPending ? 'Creating...' : 'Create Factory'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Factories Table */}
      <Card>
        <CardHeader>
          <CardTitle>Factories ({factories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {factories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No factories found. Add your first factory to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factory Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factories.map((factory) => (
                  <TableRow key={factory.id}>
                    <TableCell className="font-medium">{factory.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{factory.street_address}</div>
                        <div className="text-gray-600">
                          {factory.city}, {factory.state} {factory.zip_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {factory.phone && <div>{factory.phone}</div>}
                        {factory.email && <div className="text-gray-600">{factory.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog 
                          open={editingFactory?.id === factory.id} 
                          onOpenChange={(open) => {
                            if (!open) {
                              setEditingFactory(null);
                              resetForm();
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEdit(factory)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Factory</DialogTitle>
                            </DialogHeader>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                  <Label htmlFor="edit-name">Factory Name *</Label>
                                  <Input
                                    id="edit-name"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                  />
                                </div>
                                
                                <div className="col-span-2">
                                  <Label htmlFor="edit-street_address">Street Address *</Label>
                                  <Input
                                    id="edit-street_address"
                                    value={formData.street_address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="edit-city">City *</Label>
                                  <Input
                                    id="edit-city"
                                    value={formData.city}
                                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="edit-state">State *</Label>
                                  <Input
                                    id="edit-state"
                                    value={formData.state}
                                    onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                                    maxLength={2}
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="edit-zip_code">ZIP Code *</Label>
                                  <Input
                                    id="edit-zip_code"
                                    value={formData.zip_code}
                                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                                    required
                                  />
                                </div>
                                
                                <div>
                                  <Label htmlFor="edit-phone">Phone</Label>
                                  <Input
                                    id="edit-phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                  />
                                </div>
                                
                                <div className="col-span-2">
                                  <Label htmlFor="edit-email">Email</Label>
                                  <Input
                                    id="edit-email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end gap-2">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingFactory(null);
                                    resetForm();
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  type="submit" 
                                  disabled={!validateForm() || updateFactory.isPending}
                                >
                                  {updateFactory.isPending ? 'Updating...' : 'Update Factory'}
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Factory</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{factory.name}"? This action cannot be undone.
                                You cannot delete a factory that is assigned to mobile homes.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteFactory.mutate(factory.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete Factory
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};