
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MobileHome {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
  price: number;
  active: boolean;
}

export const MobileHomesTab = () => {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    manufacturer: 'Clayton',
    series: 'Tru',
    model: '',
    price: ''
  });

  const { data: mobileHomes = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-mobile-homes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .order('series', { ascending: true });
      
      if (error) throw error;
      return data as MobileHome[];
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('mobile_homes')
        .insert({
          manufacturer: formData.manufacturer,
          series: formData.series,
          model: formData.model,
          price: parseFloat(formData.price)
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Mobile home added successfully.",
      });

      setFormData({ manufacturer: 'Clayton', series: 'Tru', model: '', price: '' });
      setShowAddForm(false);
      refetch();
    } catch (error) {
      console.error('Error adding mobile home:', error);
      toast({
        title: "Error",
        description: "Failed to add mobile home.",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from('mobile_homes')
        .update({ active: !active })
        .eq('id', id);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error updating mobile home:', error);
    }
  };

  const updatePrice = async (id: string, newPrice: number) => {
    try {
      const { error } = await supabase
        .from('mobile_homes')
        .update({ price: newPrice })
        .eq('id', id);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Error updating price:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading mobile homes...</span>
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
            <CardTitle>Mobile Homes Management</CardTitle>
            <Button onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : 'Add Mobile Home'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddForm && (
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 mb-6 p-4 border rounded-lg">
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="series">Series</Label>
                <Select value={formData.series} onValueChange={(value) => setFormData({...formData, series: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tru">Tru</SelectItem>
                    <SelectItem value="Epic">Epic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  required
                />
              </div>
              <div className="col-span-2">
                <Button type="submit" className="w-full">Add Mobile Home</Button>
              </div>
            </form>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mobileHomes.map((home) => (
                <TableRow key={home.id}>
                  <TableCell>{home.manufacturer}</TableCell>
                  <TableCell>{home.series}</TableCell>
                  <TableCell>{home.model}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={home.price}
                      onBlur={(e) => updatePrice(home.id, parseFloat(e.target.value))}
                      className="w-32"
                    />
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      home.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {home.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleActive(home.id, home.active)}
                    >
                      {home.active ? 'Deactivate' : 'Activate'}
                    </Button>
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
