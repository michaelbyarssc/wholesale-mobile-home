import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Receipt } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CartTotalProps {
  total: number;
  onClearCart: () => void;
  onConvertToEstimate: () => void;
  onCloseCart: () => void;
}

export const CartTotal = ({
  total,
  onClearCart,
  onConvertToEstimate,
  onCloseCart
}: CartTotalProps) => {
  const { toast } = useToast();

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
    try {
      // Get cart data from localStorage
      const cartData = localStorage.getItem('cart_items');
      if (!cartData) {
        toast({
          title: "Error",
          description: "No items in cart to send",
          variant: "destructive",
        });
        return;
      }

      const cartItems = JSON.parse(cartData);
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
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-4">
        <div className="text-2xl font-bold">
          Total: {formatPrice(total)}
        </div>
        <div className="space-x-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
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
          <Button 
            onClick={handleConvertToEstimate}
            className="bg-green-600 hover:bg-green-700"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Send Estimate to my sales representative
          </Button>
          <Button onClick={handleCloseCart}>
            Close Cart
          </Button>
        </div>
      </div>
    </div>
  );
};
