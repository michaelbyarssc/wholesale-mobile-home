
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';

interface TotalAndApprovalCardProps {
  totalAmount: number;
  approving: boolean;
  onApprove: () => void;
}

export const TotalAndApprovalCard = ({ totalAmount, approving, onApprove }: TotalAndApprovalCardProps) => {
  return (
    <Card className="mb-8 shadow-lg">
      <CardContent className="p-8">
        <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-300">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Total Investment</h3>
            <p className="text-gray-600 mt-1">All services and fees included</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-green-600">${totalAmount?.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">USD</p>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg mb-6">
          <h4 className="font-bold text-blue-900 mb-3">Terms & Conditions</h4>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• This estimate is valid for 30 days from the date issued</li>
            <li>• Final pricing may vary based on site conditions and delivery requirements</li>
            <li>• Upon approval, this estimate becomes a binding agreement</li>
            <li>• Payment terms: Due upon receipt of invoice</li>
            <li>• Delivery and setup are included in the quoted price</li>
          </ul>
        </div>

        <div className="text-center">
          <Button 
            onClick={onApprove}
            disabled={approving}
            className="bg-green-600 hover:bg-green-700 text-white px-12 py-4 text-lg font-semibold rounded-lg shadow-lg transform transition hover:scale-105"
            size="lg"
          >
            {approving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-3" />
                Processing Approval...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-3" />
                Approve Estimate & Create Invoice
              </>
            )}
          </Button>
          <p className="text-sm text-gray-600 mt-4">
            By clicking "Approve", you agree to the terms and conditions outlined above.
            An invoice will be generated and sent to your email address.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
