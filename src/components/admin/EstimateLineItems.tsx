import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Home, Settings, Package, Truck, Receipt, Save, X } from 'lucide-react';

interface EstimateLineItem {
  id: string;
  item_type: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
  metadata: any;
}

interface EstimateLineItemsProps {
  estimateId: string;
  isEditable?: boolean;
}

export const EstimateLineItems = ({ estimateId, isEditable = false }: EstimateLineItemsProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<EstimateLineItem | null>(null);

  // Fetch estimate data to get delivery address
  const { data: estimate } = useQuery({
    queryKey: ['estimate', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select('delivery_address')
        .eq('id', estimateId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: lineItems = [], isLoading } = useQuery({
    queryKey: ['estimate-line-items', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimate_line_items')
        .select('*')
        .eq('estimate_id', estimateId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Update line item mutation
  const updateLineItemMutation = useMutation({
    mutationFn: async (item: EstimateLineItem) => {
      const { data, error } = await supabase
        .from('estimate_line_items')
        .update({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price
        })
        .eq('id', item.id);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate-line-items', estimateId] });
      setEditingItemId(null);
      setEditingItem(null);
      toast({
        title: "Item Updated",
        description: "Line item has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update line item. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleEditClick = (item: EstimateLineItem) => {
    setEditingItemId(item.id);
    setEditingItem({ ...item });
  };

  const handleSaveClick = () => {
    if (editingItem) {
      updateLineItemMutation.mutate(editingItem);
    }
  };

  const handleCancelClick = () => {
    setEditingItemId(null);
    setEditingItem(null);
  };

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'mobile_home':
        return <Home className="h-4 w-4" />;
      case 'service':
        return <Settings className="h-4 w-4" />;
      case 'option':
        return <Package className="h-4 w-4" />;
      case 'shipping':
        return <Truck className="h-4 w-4" />;
      case 'tax':
        return <Receipt className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getItemTypeColor = (itemType: string) => {
    switch (itemType) {
      case 'mobile_home':
        return 'bg-blue-100 text-blue-800';
      case 'service':
        return 'bg-green-100 text-green-800';
      case 'option':
        return 'bg-purple-100 text-purple-800';
      case 'shipping':
        return 'bg-orange-100 text-orange-800';
      case 'tax':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm">Loading line items...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (lineItems.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">No detailed line items available for this estimate.</p>
        </CardContent>
      </Card>
    );
  }

  // Group items by category
  const groupedItems = lineItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, EstimateLineItem[]>);

  // Calculate totals
  const subtotal = lineItems
    .filter(item => !['shipping', 'tax'].includes(item.item_type))
    .reduce((sum, item) => sum + item.total_price, 0);
  
  const shippingCost = lineItems
    .filter(item => item.item_type === 'shipping')
    .reduce((sum, item) => sum + item.total_price, 0);
  
  const taxCost = lineItems
    .filter(item => item.item_type === 'tax')
    .reduce((sum, item) => sum + item.total_price, 0);
  
  const total = lineItems.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Detailed Line Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedItems).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {category}
            </h4>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-start justify-between p-3 border rounded-lg gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getItemIcon(item.item_type)}
                      <Badge variant="outline" className={getItemTypeColor(item.item_type)}>
                        {item.item_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingItemId === item.id && editingItem ? (
                        <div className="space-y-2">
                          <Input
                            value={editingItem.name}
                            onChange={(e) => setEditingItem(prev => prev ? { ...prev, name: e.target.value } : null)}
                            placeholder="Item name"
                            className="font-medium"
                          />
                          <Textarea
                            value={editingItem.description}
                            onChange={(e) => setEditingItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                            placeholder="Item description"
                            className="text-sm resize-none"
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Label className="text-xs">Quantity</Label>
                              <Input
                                type="number"
                                value={editingItem.quantity}
                                onChange={(e) => setEditingItem(prev => prev ? { ...prev, quantity: parseFloat(e.target.value) || 1 } : null)}
                                min="1"
                                step="1"
                                className="text-xs"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs">Unit Price</Label>
                              <Input
                                type="number"
                                value={editingItem.unit_price}
                                onChange={(e) => setEditingItem(prev => prev ? { ...prev, unit_price: parseFloat(e.target.value) || 0 } : null)}
                                min="0"
                                step="0.01"
                                className="text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="min-w-0">
                          <p className="font-medium break-words">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground break-words whitespace-normal">{item.description}</p>
                          )}
                          {estimate?.delivery_address && item.item_type === 'shipping' && (
                            <p className="text-sm text-muted-foreground break-words whitespace-normal">
                              <strong>Delivery Address:</strong> {estimate.delivery_address}
                            </p>
                          )}
                          {item.quantity > 1 && (
                            <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    {editingItemId === item.id && editingItem ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={handleSaveClick} disabled={updateLineItemMutation.isPending}>
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelClick}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {item.quantity > 1 ? (
                          <div>
                            <p className="text-sm text-muted-foreground">
                              ${item.unit_price.toLocaleString()} × {item.quantity}
                            </p>
                            <p className="font-medium">${item.total_price.toLocaleString()}</p>
                          </div>
                        ) : (
                          <p className="font-medium">${item.total_price.toLocaleString()}</p>
                        )}
                        {isEditable && (
                          <Button size="sm" variant="outline" onClick={() => handleEditClick(item)}>
                            Edit
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <Separator />

        {/* Cost Summary */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-sm">Subtotal:</Label>
            <span className="font-medium">${subtotal.toLocaleString()}</span>
          </div>
          
          {shippingCost > 0 && (
            <div className="flex justify-between items-center">
              <Label className="text-sm">Shipping & Delivery:</Label>
              <span className="font-medium">${shippingCost.toLocaleString()}</span>
            </div>
          )}
          
          {taxCost > 0 && (
            <div className="flex justify-between items-center">
              <Label className="text-sm">Sales Tax:</Label>
              <span className="font-medium">${taxCost.toLocaleString()}</span>
            </div>
          )}
          
          <Separator />
          
          <div className="flex justify-between items-center">
            <Label className="font-medium">Total:</Label>
            <span className="font-bold text-lg text-green-600">${total.toLocaleString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};