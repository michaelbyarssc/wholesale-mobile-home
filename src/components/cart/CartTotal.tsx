
import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Receipt } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

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
                <AlertDialogAction onClick={onClearCart}>
                  Clear Cart
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button 
            onClick={onConvertToEstimate}
            className="bg-green-600 hover:bg-green-700"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Convert to Estimate
          </Button>
          <Button onClick={onCloseCart}>
            Close Cart
          </Button>
        </div>
      </div>
    </div>
  );
};
