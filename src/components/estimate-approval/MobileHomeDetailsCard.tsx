
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';

interface MobileHomeDetailsCardProps {
  mobileHome: any;
  homeDisplayName: string;
  user?: any;
}

export const MobileHomeDetailsCard = ({ mobileHome, homeDisplayName, user }: MobileHomeDetailsCardProps) => {
  const { calculateMobileHomePrice } = useCustomerPricing(user);
  
  const displayPrice = user ? calculateMobileHomePrice(mobileHome) : mobileHome?.price;
  
  return (
    <Card className="mb-6 shadow-lg">
      <CardHeader className="bg-green-50 border-b">
        <CardTitle className="text-green-900">Mobile Home Specifications</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">{homeDisplayName}</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-medium text-gray-600">Manufacturer:</span>
                <span className="text-gray-900">{mobileHome?.manufacturer}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-medium text-gray-600">Series:</span>
                <span className="text-gray-900">{mobileHome?.series}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-medium text-gray-600">Model:</span>
                <span className="text-gray-900">{mobileHome?.model}</span>
              </div>
            </div>
          </div>
          <div>
            <div className="space-y-3">
              {mobileHome?.bedrooms && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-600">Bedrooms:</span>
                  <span className="text-gray-900">{mobileHome.bedrooms}</span>
                </div>
              )}
              {mobileHome?.bathrooms && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-600">Bathrooms:</span>
                  <span className="text-gray-900">{mobileHome.bathrooms}</span>
                </div>
              )}
              {mobileHome?.square_footage && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-600">Square Footage:</span>
                  <span className="text-gray-900">{mobileHome.square_footage} sq ft</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-medium text-gray-600">Base Price:</span>
                <span className="text-lg font-bold text-green-600">{formatPrice(displayPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
