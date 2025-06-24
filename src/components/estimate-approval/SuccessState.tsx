
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export const SuccessState = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-green-50 border-b border-green-200">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            Estimate Approved Successfully
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-gray-700 mb-4">
            Thank you for approving your estimate. It has been converted to an invoice and you should receive an email confirmation shortly.
          </p>
          <p className="text-sm text-gray-500">
            We will contact you soon to arrange payment and delivery.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
