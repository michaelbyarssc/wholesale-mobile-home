import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Home, Settings, Package, Truck, Receipt } from 'lucide-react';

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
}

export const EstimateLineItems = ({ estimateId }: EstimateLineItemsProps) => {
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
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      {getItemIcon(item.item_type)}
                      <Badge variant="outline" className={getItemTypeColor(item.item_type)}>
                        {item.item_type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground">Quantity: {item.quantity}</p>
                      )}
                      {/* Show internal price if available in metadata */}
                      {item.metadata?.internal_price && item.metadata.internal_price !== item.unit_price && (
                        <p className="text-xs text-muted-foreground">
                          Internal Price: ${item.metadata.internal_price.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
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