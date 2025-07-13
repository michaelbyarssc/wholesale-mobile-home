import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save } from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export const InvoiceCreationForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [mobileHomeId, setMobileHomeId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 }
  ]);
  const [notes, setNotes] = useState('');

  // Fetch mobile homes for selection
  const { data: mobileHomes = [] } = useQuery({
    queryKey: ['mobile-homes-for-invoice'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('id, manufacturer, model, series, price')
        .eq('active', true)
        .order('manufacturer');
      
      if (error) throw error;
      return data || [];
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (invoiceData: any) => {
      // Generate invoice number
      const { data: invoiceNumberData, error: numberError } = await supabase.rpc('generate_invoice_number');
      if (numberError) throw numberError;

      const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);

      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumberData,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
          total_amount: totalAmount,
          status: 'draft',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

        // Note: Line items are for display only in this form
        // The total_amount includes all items

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices-basic'] });
      toast({
        title: "Invoice Created",
        description: "New invoice has been created successfully.",
      });
      // Reset form
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setDeliveryAddress('');
      setMobileHomeId('');
      setLineItems([{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
      setNotes('');
    },
    onError: (error) => {
      console.error('Invoice creation error:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate total for this line item
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unitPrice = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      updatedItems[index].total = quantity * unitPrice;
    }
    
    setLineItems(updatedItems);
  };

  const totalAmount = lineItems.reduce((sum, item) => sum + item.total, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !customerEmail || lineItems.every(item => !item.description)) {
      toast({
        title: "Validation Error",
        description: "Please fill in customer details and at least one line item.",
        variant: "destructive",
      });
      return;
    }

    createInvoiceMutation.mutate({});
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Create New Invoice</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input
                id="customerPhone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mobileHome">Mobile Home (Optional)</Label>
              <Select value={mobileHomeId} onValueChange={setMobileHomeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mobile home" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No mobile home</SelectItem>
                  {mobileHomes.map((home) => (
                    <SelectItem key={home.id} value={home.id}>
                      {home.manufacturer} {home.series} {home.model} - ${home.price?.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Delivery Address</Label>
            <Textarea
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter delivery address"
              rows={3}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Line Items</Label>
              <Button type="button" onClick={addLineItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                  <div className="col-span-12 md:col-span-5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="col-span-3 md:col-span-2">
                    <Label className="text-xs">Total</Label>
                    <Input
                      value={`$${item.total.toFixed(2)}`}
                      readOnly
                      className="mt-1 bg-muted"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-right">
              <div className="text-lg font-semibold">
                Total: ${totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes or special instructions"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={createInvoiceMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}</span>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};