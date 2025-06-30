
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { CartItem } from '@/components/ShoppingCart';
import type { Database } from '@/integrations/supabase/types';

type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface CartHomeOptionsListProps {
  item: CartItem;
  homeOptions: any[];
  onUpdateHomeOptions: (homeId: string, selectedHomeOptions: { option: HomeOption; quantity: number }[]) => void;
  calculateHomeOptionPrice: (homeOption: HomeOption, homeSquareFootage?: number) => number;
  calculatePrice: (cost: number) => number;
}

export const CartHomeOptionsList = ({
  item,
  homeOptions,
  onUpdateHomeOptions,
  calculateHomeOptionPrice,
  calculatePrice
}: CartHomeOptionsListProps) => {
  const handleHomeOptionToggle = (homeOption: HomeOption) => {
    const currentOptions = item.selectedHomeOptions || [];
    const existingIndex = currentOptions.findIndex(item => item.option.id === homeOption.id);
    
    if (existingIndex >= 0) {
      // Remove the option
      const newOptions = currentOptions.filter(item => item.option.id !== homeOption.id);
      onUpdateHomeOptions(item.mobileHome.id, newOptions);
    } else {
      // Add the option with quantity 1
      const newOptions = [...currentOptions, { option: homeOption, quantity: 1 }];
      onUpdateHomeOptions(item.mobileHome.id, newOptions);
    }
  };

  return (
    <div>
      <h4 className="font-medium mb-3">Home Options:</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {homeOptions.map((homeOption) => {
          const selectedOption = (item.selectedHomeOptions || []).find(item => item.option.id === homeOption.id);
          const isSelected = !!selectedOption;
          const optionPrice = calculateHomeOptionPrice(homeOption, item.mobileHome.square_footage || undefined);
          
          return (
            <div key={homeOption.id} className="flex items-start space-x-3 p-2 border rounded">
              <Checkbox
                id={`${item.mobileHome.id}-${homeOption.id}`}
                checked={isSelected}
                onCheckedChange={() => handleHomeOptionToggle(homeOption)}
              />
              <div className="flex-1">
                <Label 
                  htmlFor={`${item.mobileHome.id}-${homeOption.id}`}
                  className="font-medium cursor-pointer text-sm"
                >
                  {homeOption.name}
                </Label>
                {homeOption.description && (
                  <p className="text-xs text-gray-500 mt-1">{homeOption.description}</p>
                )}
                <p className="text-sm text-gray-600 mt-1">
                  {homeOption.pricing_type === 'per_sqft' ? (
                    <>
                      {formatPrice(optionPrice)}
                      <span className="text-xs text-gray-400 ml-1">
                        (${calculatePrice(homeOption.price_per_sqft || 0).toFixed(2)}/sq ft)
                      </span>
                    </>
                  ) : (
                    formatPrice(optionPrice)
                  )}
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {homeOption.pricing_type === 'per_sqft' ? 'Per Sq Ft' : 'Fixed Price'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
