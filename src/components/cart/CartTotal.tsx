import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Receipt, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DeliveryAddress } from '@/hooks/useShoppingCart';
import { ShippingCostDisplay } from './ShippingCostDisplay';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface CartTotalProps {
  subtotal: number;
  deliveryAddress: DeliveryAddress | null;
  cartItems: Array<{ mobileHome: MobileHome; [key: string]: any }>;
  totalShippingCost: number;
  onClearCart: () => void;
  onConvertToEstimate: () => void;
  onCloseCart: () => void;
}

export const CartTotal = ({
  subtotal,
  deliveryAddress,
  cartItems,
  totalShippingCost,
  onClearCart,
  onConvertToEstimate,
  onCloseCart
}: CartTotalProps) => {
  const { toast } = useToast();

  console.log('🚛 CartTotal - Using passed shipping cost:', totalShippingCost);
  
  // Calculate SC sales tax
  const salesTax = deliveryAddress?.state.toLowerCase() === 'sc' ? 500 : 0;
  
  // Calculate total
  const total = subtotal + totalShippingCost + salesTax;

  const handleClearCart = () => {
    console.log('🔍 CartTotal: Clear cart clicked');
    try {
      onClearCart();
      console.log('🔍 CartTotal: Clear cart completed');
    } catch (error) {
      console.error('🔍 CartTotal: Error clearing cart:', error);
    }
  };

  const handleConvertToEstimate = async () => {
    console.log('🔍 CartTotal: Send to sales rep clicked');
    
    // Check if delivery address is required and missing
    if (!deliveryAddress) {
      toast({
        title: "Delivery Address Required",
        description: "Please enter a delivery address before sending your estimate.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Get cart data from localStorage
      const cartData = localStorage.getItem('cart_data');
      if (!cartData) {
        toast({
          title: "Error",
          description: "No items in cart to send",
          variant: "destructive",
        });
        return;
      }

      const cartDataParsed = JSON.parse(cartData);
      const cartItems = cartDataParsed.items;
      if (!cartItems || cartItems.length === 0) {
        toast({
          title: "Error", 
          description: "No items in cart to send",
          variant: "destructive",
        });
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      console.log('🔍 CartTotal: Sending cart items to sales rep:', cartItems);

      // Send estimate to sales representative
      const { data, error } = await supabase.functions.invoke('send-estimate-to-sales-rep', {
        body: {
          cart_items: cartItems,
          total_amount: total,
          sales_rep_email: 'michaelbyarssc@gmail.com',
          user_id: userId
        }
      });

      console.log('🔍 CartTotal: Function response:', { data, error });

      if (error) {
        console.error('🔍 CartTotal: Supabase function error:', error);
        toast({
          title: "Error",
          description: `Failed to send estimate: ${error.message || 'Unknown error'}. Please try again.`,
          variant: "destructive",
        });
        return;
      }

      // Check if the function returned an error in the data
      if (data && !data.success) {
        console.error('🔍 CartTotal: Function returned error:', data.error);
        toast({
          title: "Error",
          description: `Failed to send estimate: ${data.error || 'Unknown error'}. Please try again.`,
          variant: "destructive",
        });
        return;
      }

      // Clear the cart after successful submission
      onClearCart();
      
      // Close the cart
      onCloseCart();
      
      // Show success message
      toast({
        title: "Estimate Sent!",
        description: "Your estimate has been sent to your sales representative. They will be in contact with you as soon as possible to discuss the details.",
      });

      console.log('🔍 CartTotal: Estimate sent to sales rep successfully');
    } catch (error) {
      console.error('🔍 CartTotal: Error sending to sales rep:', error);
      toast({
        title: "Error",
        description: `Failed to send estimate: ${error.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const handleCloseCart = () => {
    console.log('🔍 CartTotal: Close cart clicked');
    try {
      onCloseCart();
      console.log('🔍 CartTotal: Close cart completed');
    } catch (error) {
      console.error('🔍 CartTotal: Error closing cart:', error);
    }
  };

  return (
    <div className="border-t pt-4 space-y-4">
      {/* Cost Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal:</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        
        {deliveryAddress && (
          <>
            <div className="flex justify-between text-gray-600">
              <span className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                Shipping:
              </span>
              <span>{formatPrice(totalShippingCost)}</span>
            </div>
            
            {salesTax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>SC Sales Tax:</span>
                <span>{formatPrice(salesTax)}</span>
              </div>
            )}
          </>
        )}
        
        {!deliveryAddress && (
          <div className="flex justify-between text-gray-500 italic">
            <span>Enter delivery address for shipping cost</span>
            <span>—</span>
          </div>
        )}
        
        <div className="flex justify-between text-xl font-bold border-t pt-2">
          <span>Total:</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              Clear Cart
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove all items from your cart. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearCart}>
                Clear Cart
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleConvertToEstimate}
            className="bg-green-600 hover:bg-green-700"
            disabled={!deliveryAddress}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Send Estimate to Sales Rep
          </Button>
          <Button onClick={handleCloseCart} variant="outline">
            Close Cart
          </Button>
        </div>
      </div>
    </div>
  );
};
