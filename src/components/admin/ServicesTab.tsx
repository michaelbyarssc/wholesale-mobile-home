import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  single_wide_price: number;
  double_wide_price: number;
  active: boolean;
  conditions?: any;
  dependencies?: string[];
  applicable_manufacturers?: string[];
  applicable_series?: string[];
  requires_admin?: boolean;
  conditional_pricing?: any;
}

interface MobileHome {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
}

export const ServicesTab = () => {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    single_wide_price: '',
    double_wide_price: '',
    dependencies: [] as string[],
    applicable_manufacturers: [] as string[],
    applicable_series: [] as string[],
    requires_admin: false,
    conditional_pricing: {} as any
  });

  const { data: services = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Service[];
    }
  });

  const { data: mobileHomes = [] } = useQuery({
    queryKey: ['mobile-homes-for-conditions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('active', true);
      
      if (error) throw error;
      return data as MobileHome[];
    }
  });

  const uniqueManufacturers = [...new Set(mobileHomes.map(home => home.manufacturer))];
  const uniqueSeries = [...new Set(mobileHomes.map(home => home.series))];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const serviceData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        single_wide_price: parseFloat(formData.single_wide_price),
        double_wide_price: parseFloat(formData.double_wide_price),
        dependencies: formData.dependencies,
        applicable_manufacturers: formData.applicable_manufacturers,
        applicable_series: formData.applicable_series,
        requires_admin: formData.requires_admin,
        conditional_pricing: formData.conditional_pricing
      };

      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('services')
          .insert(serviceData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: editingService ? "Service updated successfully." : "Service added successfully.",
      });

      resetForm();
      refetch();
    } catch (error) {
      console.error('Error saving service:', error);
      toast({
        title: "Error",
        description: "Failed to save service.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      single_wide_price: '',
      double_wide_price: '',
      dependencies: [],
      applicable_manufacturers: [],
      applicable_series: [],
      requires_admin: false,
      conditional_pricing: {}
    });
    setEditingService(null);
    setShowAddForm(false);
  };

  const editService = (service: Service) => {
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      single_wide_price: service.single_wide_price.toString(),
      double_wide_price: service.double_wide_price.toString(),
      dependencies: service.dependencies || [],
      applicable_manufacturers: service.applicable_manufacturers || [],
      applicable_series: service.applicable_series || [],
      requires_admin: service.requires_admin || false,
      conditional_pricing: service.conditional_pricing || {}
    });
    setEditingService(service);
    setShowAddForm(true);
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const updatePrice = async (id: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ price: newPrice })
        .eq('id', id);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  const handleDependencyChange = (serviceId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      dependencies: checked 
        ? [...prev.dependencies, serviceId]
        : prev.dependencies.filter(id => id !== serviceId)
    }));
  };

  const handleManufacturerChange = (manufacturer: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      applicable_manufacturers: checked 
        ? [...prev.applicable_manufacturers, manufacturer]
        : prev.applicable_manufacturers.filter(m => m !== manufacturer)
    }));
  };

  const handleSeriesChange = (series: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      applicable_series: checked 
        ? [...prev.applicable_series, series]
        : prev.applicable_series.filter(s => s !== series)
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading services...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Conditional Services Management</CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : 'Add Service'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 mb-6 p-4 border rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Base Price (Legacy)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="single_wide_price">Single Wide Price (≤16 ft)</Label>
                  <Input
                    id="single_wide_price"
                    type="number"
                    value={formData.single_wide_price}
                    onChange={(e) => setFormData({...formData, single_wide_price: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="double_wide_price">Double Wide Price (>16 ft)</Label>
                  <Input
                    id="double_wide_price"
                    type="number"
                    value={formData.double_wide_price}
                    onChange={(e) => setFormData({...formData, double_wide_price: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires_admin"
                  checked={formData.requires_admin}
                  onCheckedChange={(checked) => setFormData({...formData, requires_admin: checked as boolean})}
                />
                <Label htmlFor="requires_admin">Requires Admin Approval</Label>
              </div>

              <div>
                <Label>Service Dependencies</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {services.filter(s => s.id !== editingService?.id).map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dep-${service.id}`}
                        checked={formData.dependencies.includes(service.id)}
                        onCheckedChange={(checked) => handleDependencyChange(service.id, checked as boolean)}
                      />
                      <Label htmlFor={`dep-${service.id}`} className="text-sm">{service.name}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Applicable Manufacturers (empty = all)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {uniqueManufacturers.map((manufacturer) => (
                    <div key={manufacturer} className="flex items-center space-x-2">
                      <Checkbox
                        id={`mfg-${manufacturer}`}
                        checked={formData.applicable_manufacturers.includes(manufacturer)}
                        onCheckedChange={(checked) => handleManufacturerChange(manufacturer, checked as boolean)}
                      />
                      <Label htmlFor={`mfg-${manufacturer}`} className="text-sm">{manufacturer}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Applicable Series (empty = all)</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {uniqueSeries.map((series) => (
                    <div key={series} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ser-${series}`}
                        checked={formData.applicable_series.includes(series)}
                        onCheckedChange={(checked) => handleSeriesChange(series, checked as boolean)}
                      />
                      <Label htmlFor={`ser-${series}`} className="text-sm">{series}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full">
                {editingService ? 'Update Service' : 'Add Service'}
              </Button>
            </form>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Single Wide Price</TableHead>
                <TableHead>Double Wide Price</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{service.description}</TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{formatPrice(service.single_wide_price)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium">{formatPrice(service.double_wide_price)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {service.requires_admin && (
                        <Badge variant="outline" className="text-xs">Admin Required</Badge>
                      )}
                      {service.dependencies && service.dependencies.length > 0 && (
                        <Badge variant="outline" className="text-xs">Has Dependencies</Badge>
                      )}
                      {service.applicable_manufacturers && service.applicable_manufacturers.length > 0 && (
                        <Badge variant="outline" className="text-xs">Manufacturer Specific</Badge>
                      )}
                      {service.applicable_series && service.applicable_series.length > 0 && (
                        <Badge variant="outline" className="text-xs">Series Specific</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      service.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {service.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editService(service)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleActive(service.id, service.active)}
                      >
                        {service.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
