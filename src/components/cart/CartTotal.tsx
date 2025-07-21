import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Receipt, Truck } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DeliveryAddress } from '@/hooks/useShoppingCart';
import { ShippingCostDisplay } from './ShippingCostDisplay';
import { CustomerInfoModal } from './CustomerInfoModal';
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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  console.log('🚛 CartTotal - Received props:', {
    totalShippingCost,
    deliveryAddress: !!deliveryAddress,
    cartItemsLength: cartItems.length,
    totalShippingCostType: typeof totalShippingCost,
    formattedShippingCost: formatPrice(totalShippingCost)
  });
  
  console.log('🚛 CartTotal - Line 183 will display shipping cost as:', formatPrice(totalShippingCost), '- Raw value:', totalShippingCost);
  
  // Calculate sales tax by state
  const calculateSalesTax = (state: string, subtotal: number, shipping: number): number => {
    const stateCode = state.toLowerCase();
    
    console.log('🔍 Sales tax calculation:', { state: stateCode, subtotal, shipping });
    
    switch (stateCode) {
      case 'sc':
        return 500; // Fixed $5 for SC
      case 'ga':
        const taxableAmountGA = subtotal + shipping;
        const gaTax = taxableAmountGA * 0.08; // 8% of subtotal + shipping
        console.log('🔍 GA tax calculation:', { taxableAmount: taxableAmountGA, percentage: 0.08, result: gaTax });
        return gaTax;
      case 'al':
        const taxableAmountAL = subtotal + shipping;
        const alTax = taxableAmountAL * 0.02; // 2% of subtotal + shipping
        console.log('🔍 AL tax calculation:', { taxableAmount: taxableAmountAL, percentage: 0.02, result: alTax });
        return alTax;
      case 'fl':
        const taxableAmountFL = subtotal + shipping;
        const flTax = taxableAmountFL * 0.03; // 3% of subtotal + shipping
        console.log('🔍 FL tax calculation:', { taxableAmount: taxableAmountFL, percentage: 0.03, result: flTax });
        return flTax;
      default:
        console.log('🔍 No tax for state:', stateCode);
        return 0; // No tax for other states
    }
  };
  
  const salesTax = deliveryAddress ? calculateSalesTax(deliveryAddress.state, subtotal, totalShippingCost) : 0;
  console.log('🔍 Final sales tax:', { state: deliveryAddress?.state, salesTax });
  
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

  const handleConvertToEstimate = () => {
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
    
    // Check if cart has items
    if (!cartItems || cartItems.length === 0) {
      toast({
        title: "Error", 
        description: "No items in cart to send",
        variant: "destructive",
      });
      return;
    }
    
    // Show customer info modal
    setShowCustomerModal(true);
  };

  const handleSubmitWithCustomerInfo = async (customerInfo: { name: string; email: string; phone: string }) => {
    setIsSubmitting(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;

      console.log('🔍 CartTotal: Sending cart items to sales rep with customer info:', { cartItems, customerInfo });

      // Send estimate to sales representative with customer info
      const { data, error } = await supabase.functions.invoke('send-estimate-to-sales-rep', {
        body: {
          cart_items: cartItems,
          delivery_address: deliveryAddress,
          total_amount: total,
          shipping_cost: totalShippingCost,
          sales_tax: salesTax,
          sales_rep_email: 'michaelbyarssc@gmail.com',
          user_id: userId,
          customer_info: customerInfo
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

      // Close the modal
      setShowCustomerModal(false);
      
      // Clear the cart after successful submission
      onClearCart();
      
      // Close the cart
      onCloseCart();
      
      // Show success message
      toast({
        title: "Estimate Submitted!",
        description: "Your estimate has been created and sent to your account manager for review. You will be contacted shortly to finalize the details.",
      });

      console.log('🔍 CartTotal: Estimate sent to sales rep successfully');
    } catch (error) {
      console.error('🔍 CartTotal: Error sending to sales rep:', error);
      toast({
        title: "Error",
        description: `Failed to send estimate: ${error.message || 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
                <span>{deliveryAddress.state.toUpperCase()} Sales Tax:</span>
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
            Submit Estimate for Review
          </Button>
          <Button onClick={handleCloseCart} variant="outline">
            Close Cart
          </Button>
        </div>
      </div>

      {/* Customer Info Modal */}
      <CustomerInfoModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSubmit={handleSubmitWithCustomerInfo}
        isLoading={isSubmitting}
      />
    </div>
  );
};
