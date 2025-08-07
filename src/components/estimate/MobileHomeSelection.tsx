
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { usePricingContext } from '@/contexts/PricingContext';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface MobileHomeSelectionProps {
  mobileHomes: MobileHome[];
  selectedMobileHome: MobileHome | null;
  onMobileHomeSelect: (homeId: string) => void;
  user: any;
}

export const MobileHomeSelection: React.FC<MobileHomeSelectionProps> = ({
  mobileHomes,
  selectedMobileHome,
  onMobileHomeSelect,
  user
}) => {
  const { calculateMobileHomePrice } = usePricingContext();

  const getHomeName = (home: MobileHome) => {
    return home.display_name || `${home.series} ${home.model}`;
  };

  const formatSize = (home: MobileHome) => {
    if (home.length_feet && home.width_feet) {
      return `${home.width_feet}x${home.length_feet}`;
    }
    return 'N/A';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select Mobile Home</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select onValueChange={onMobileHomeSelect} value={selectedMobileHome?.id || ""}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a mobile home model" />
          </SelectTrigger>
          <SelectContent>
            {mobileHomes.map((home) => {
              const customerPrice = calculateMobileHomePrice(home);
              return (
                <SelectItem key={home.id} value={home.id}>
                  <div className="flex justify-between items-center w-full">
                    <span>{getHomeName(home)} - {formatSize(home)}</span>
                    <span className="font-medium text-green-600 ml-4">
                      {formatPrice(customerPrice)}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {selectedMobileHome && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{getHomeName(selectedMobileHome)}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Size:</span> {formatSize(selectedMobileHome)}
              </div>
              <div>
                <span className="text-gray-600">Price:</span> 
                <span className="font-medium text-green-600 ml-1">
                  {formatPrice(calculateMobileHomePrice(selectedMobileHome))}
                </span>
              </div>
              {selectedMobileHome.square_footage && (
                <div>
                  <span className="text-gray-600">Sq Ft:</span> {selectedMobileHome.square_footage}
                </div>
              )}
              {selectedMobileHome.bedrooms && selectedMobileHome.bathrooms && (
                <div>
                  <span className="text-gray-600">Bed/Bath:</span> {selectedMobileHome.bedrooms}/{selectedMobileHome.bathrooms}
                </div>
              )}
            </div>
            {selectedMobileHome.description && (
              <p className="text-gray-700 mt-2">{selectedMobileHome.description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
