import React, { useState, useMemo, useEffect } from 'react';
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
import { useShippingCost } from '@/hooks/useShippingCost';
import { Home, Settings, Package, Truck, Receipt, Save, X, MapPin, DollarSign } from 'lucide-react';

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

  // Fetch estimate data with mobile home and delivery address
  const { data: estimate } = useQuery({
    queryKey: ['estimate', estimateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          delivery_address,
          mobile_homes (
            id,
            width_feet,
            manufacturer,
            series,
            model
          )
        `)
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

  // Shipping cost calculation - Always call the hook
  const { getShippingCost, calculateShippingCost, clearCalculations } = useShippingCost();
  
  // Parse delivery address for shipping calculation
  const parsedAddress = useMemo(() => {
    if (!estimate?.delivery_address) return null;
    const parts = estimate.delivery_address.split(',').map(part => part.trim());
    const lastPart = parts[parts.length - 1] || '';
    const stateZip = lastPart.split(' ');
    
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: stateZip[0] || '',
      zipCode: stateZip[1] || ''
    };
  }, [estimate?.delivery_address]);

  // Create full mobile home object for shipping calculation
  const fullMobileHome = useMemo(() => {
    if (!estimate?.mobile_homes) return null;
    return {
      ...estimate.mobile_homes,
      active: true,
      bathrooms: 1,
      bedrooms: 1,
      company_id: '',
      cost: 0,
      created_at: '',
      description: '',
      display_name: '',
      display_order: 0,
      exterior_image_url: '',
      features: [],
      floor_plan_image_url: '',
      length_feet: 60,
      minimum_profit: 0,
      price: 0,
      retail_price: 0,
      square_footage: 1000,
      updated_at: ''
    };
  }, [estimate?.mobile_homes]);

  // Get shipping calculation and trigger fresh calculation like the cart
  const shippingCalculation = useMemo(() => {
    if (!fullMobileHome || !parsedAddress) return null;
    return getShippingCost(fullMobileHome, parsedAddress);
  }, [fullMobileHome, parsedAddress, getShippingCost]);

  // Trigger shipping calculation when dependencies change (like cart does)
  useEffect(() => {
    if (fullMobileHome && parsedAddress && !shippingCalculation?.breakdown && !shippingCalculation?.isCalculating) {
      // Clear cached calculations to ensure fresh calculation with 15% markup
      clearCalculations();
      calculateShippingCost(fullMobileHome, parsedAddress);
    }
  }, [fullMobileHome, parsedAddress, calculateShippingCost, clearCalculations, shippingCalculation]);

  // Calculate sales tax based on delivery state
  const calculateSalesTax = (state: string, subtotal: number, shipping: number): number => {
    const stateCode = state.toUpperCase();
    console.log('🔍 Sales tax calculation:', { state: stateCode, subtotal, shipping });
    
    switch (stateCode) {
      case 'GA':
        const taxableAmountGA = subtotal + shipping;
        const gaTax = taxableAmountGA * 0.08; // 8% of subtotal + shipping
        console.log('🏛️ GA tax calculation:', { taxableAmount: taxableAmountGA, tax: gaTax });
        return gaTax;
      case 'AL':
        const taxableAmountAL = subtotal + shipping;
        const alTax = taxableAmountAL * 0.02; // 2% of subtotal + shipping
        console.log('🏛️ AL tax calculation:', { taxableAmount: taxableAmountAL, tax: alTax });
        return alTax;
      case 'FL':
        const taxableAmountFL = subtotal + shipping;
        const flTax = taxableAmountFL * 0.03; // 3% of subtotal + shipping
        console.log('🏛️ FL tax calculation:', { taxableAmount: taxableAmountFL, tax: flTax });
        return flTax;
      default:
        console.log('🏛️ No tax for state:', stateCode);
        return 0;
    }
  };

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

  // Calculate expected shipping and tax if not in line items
  const expectedShippingCost = shippingCalculation ? shippingCalculation.totalCost : 0;
  const expectedTaxCost = parsedAddress ? calculateSalesTax(parsedAddress.state, subtotal, expectedShippingCost) : 0;
  
  // Calculate total including expected shipping and tax when not in line items
  const actualShippingCost = shippingCost > 0 ? shippingCost : expectedShippingCost;
  const actualTaxCost = taxCost > 0 ? taxCost : expectedTaxCost;
  const total = subtotal + actualShippingCost + actualTaxCost;

  return (
    <div className="space-y-4">
      {/* Line Items - similar to cart items */}
      {Object.entries(groupedItems).map(([category, items]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    {getItemIcon(item.item_type)}
                    <Badge variant="outline" className={getItemTypeColor(item.item_type)}>
                      {item.item_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex-1">
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
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                        {estimate?.delivery_address && item.item_type === 'shipping' && (
                          <p className="text-sm text-muted-foreground">
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
                <div className="flex items-center gap-3">
                  <div className="text-right">
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
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">
                              ${item.unit_price.toLocaleString()} × {item.quantity}
                            </p>
                            <p className="font-medium">${item.total_price.toLocaleString()}</p>
                          </div>
                        ) : (
                          <p className="font-medium">${item.total_price.toLocaleString()}</p>
                        )}
                      </>
                    )}
                  </div>
                  {isEditable && editingItemId !== item.id && (
                    <Button size="sm" variant="outline" onClick={() => handleEditClick(item)}>
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Totals - similar to cart total */}
      <div className="border-t pt-4 space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          
          {/* Shipping Information */}
          {(shippingCost > 0 || (shippingCalculation && parsedAddress)) && (
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                Shipping:
              </span>
              <span>${(shippingCost || expectedShippingCost).toLocaleString()}</span>
            </div>
          )}
          
          {/* Sales Tax Information */}
          {(actualTaxCost > 0 && parsedAddress && ['GA', 'AL', 'FL'].includes(parsedAddress.state.toUpperCase())) && (
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-1">
                <Receipt className="h-4 w-4" />
                {parsedAddress.state.toUpperCase()} Sales Tax:
              </span>
              <span>${actualTaxCost.toLocaleString()}</span>
            </div>
          )}
          
          <div className="flex justify-between text-xl font-bold border-t pt-2">
            <span>Total:</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};