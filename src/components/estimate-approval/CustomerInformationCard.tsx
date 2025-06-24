
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CustomerInformationCardProps {
  estimate: any;
}

export const CustomerInformationCard = ({ estimate }: CustomerInformationCardProps) => {
  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader className="bg-blue-50 border-b">
        <CardTitle className="text-blue-900">Customer Information</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Customer Name</label>
              <p className="text-lg font-medium text-gray-900">{estimate.customer_name}</p>
            </div>
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Email</label>
              <p className="text-gray-900">{estimate.customer_email}</p>
            </div>
          </div>
          <div>
            <div className="mb-4">
              <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Phone</label>
              <p className="text-gray-900">{estimate.customer_phone}</p>
            </div>
            {estimate.delivery_address && (
              <div className="mb-4">
                <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Delivery Address</label>
                <p className="text-gray-900">{estimate.delivery_address}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
