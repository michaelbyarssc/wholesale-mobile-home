
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface HomeOption {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  markup_percentage: number;
  calculated_price: number | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

interface HomeOptionForm {
  name: string;
  description: string;
  cost_price: number;
  markup_percentage: number;
  active: boolean;
  display_order: number;
}

export const HomeOptionsTab = () => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<HomeOptionForm>({
    name: '',
    description: '',
    cost_price: 0,
    markup_percentage: 0,
    active: true,
    display_order: 0
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: homeOptions = [], isLoading } = useQuery({
    queryKey: ['home-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('home_options')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching home options:', error);
        throw error;
      }
      
      return data as HomeOption[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newOption: Omit<HomeOptionForm, 'display_order'>) => {
      const maxOrder = Math.max(...homeOptions.map(option => option.display_order), 0);
      const { data, error } = await supabase
        .from('home_options')
        .insert([{ ...newOption, display_order: maxOrder + 1 }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-options'] });
      toast({
        title: "Success",
        description: "Home option created successfully.",
      });
      setIsCreating(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Error creating home option:', error);
      toast({
        title: "Error",
        description: "Failed to create home option.",
        variant: "destructive",
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HomeOptionForm> }) => {
      const { data, error } = await supabase
        .from('home_options')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-options'] });
      toast({
        title: "Success",
        description: "Home option updated successfully.",
      });
      setEditingId(null);
      resetForm();
    },
    onError: (error) => {
      console.error('Error updating home option:', error);
      toast({
        title: "Error",
        description: "Failed to update home option.",
        variant: "destructive",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('home_options')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-options'] });
      toast({
        title: "Success",
        description: "Home option deleted successfully.",
      });
    },
    onError: (error) => {
      console.error('Error deleting home option:', error);
      toast({
        title: "Error",
        description: "Failed to delete home option.",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      cost_price: 0,
      markup_percentage: 0,
      active: true,
      display_order: 0
    });
  };

  const startEditing = (option: HomeOption) => {
    setEditingId(option.id);
    setFormData({
      name: option.name,
      description: option.description || '',
      cost_price: option.cost_price,
      markup_percentage: option.markup_percentage,
      active: option.active,
      display_order: option.display_order
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      createMutation.mutate(formData);
    } else if (editingId) {
      updateMutation.mutate({ id: editingId, updates: formData });
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Home Options Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading home options...</span>
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
            <CardTitle>Home Options Management</CardTitle>
            <Button
              onClick={() => setIsCreating(true)}
              disabled={isCreating || editingId !== null}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Home Option
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Create Form */}
          {isCreating && (
            <Card className="mb-6 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Create New Home Option</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Option Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Extended Warranty"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="active">Active</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch
                          id="active"
                          checked={formData.active}
                          onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                        />
                        <span className="text-sm text-gray-600">
                          {formData.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description of the home option"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="cost_price">Cost Price *</Label>
                      <Input
                        id="cost_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="markup_percentage">Markup %</Label>
                      <Input
                        id="markup_percentage"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.markup_percentage}
                        onChange={(e) => setFormData({ ...formData, markup_percentage: parseFloat(e.target.value) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Calculated Price</Label>
                      <div className="mt-2 p-2 bg-gray-50 rounded border text-sm font-medium">
                        {formatPrice(formData.cost_price * (1 + formData.markup_percentage / 100))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={cancelEditing}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {createMutation.isPending ? 'Creating...' : 'Create Option'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Options List */}
          <div className="space-y-4">
            {homeOptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No home options found.</p>
                <p className="text-sm">Create your first home option to get started.</p>
              </div>
            ) : (
              homeOptions.map((option) => (
                <Card key={option.id} className={editingId === option.id ? 'border-blue-200' : ''}>
                  <CardContent className="pt-6">
                    {editingId === option.id ? (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-name">Option Name *</Label>
                            <Input
                              id="edit-name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-active">Active</Label>
                            <div className="flex items-center space-x-2 mt-2">
                              <Switch
                                id="edit-active"
                                checked={formData.active}
                                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                              />
                              <span className="text-sm text-gray-600">
                                {formData.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="edit-cost-price">Cost Price *</Label>
                            <Input
                              id="edit-cost-price"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.cost_price}
                              onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-markup">Markup %</Label>
                            <Input
                              id="edit-markup"
                              type="number"
                              step="0.01"
                              min="0"
                              value={formData.markup_percentage}
                              onChange={(e) => setFormData({ ...formData, markup_percentage: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                          <div>
                            <Label>Calculated Price</Label>
                            <div className="mt-2 p-2 bg-gray-50 rounded border text-sm font-medium">
                              {formatPrice(formData.cost_price * (1 + formData.markup_percentage / 100))}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button type="button" variant="outline" onClick={cancelEditing}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button type="submit" disabled={updateMutation.isPending}>
                            <Save className="h-4 w-4 mr-2" />
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{option.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              option.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {option.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          {option.description && (
                            <p className="text-gray-600 mb-3">{option.description}</p>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Cost Price:</span>
                              <div className="font-medium">{formatPrice(option.cost_price)}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Markup:</span>
                              <div className="font-medium">{option.markup_percentage}%</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Selling Price:</span>
                              <div className="font-medium text-green-600">{formatPrice(option.calculated_price)}</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditing(option)}
                            disabled={editingId !== null || isCreating}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={editingId !== null || isCreating}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Home Option</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{option.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(option.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
