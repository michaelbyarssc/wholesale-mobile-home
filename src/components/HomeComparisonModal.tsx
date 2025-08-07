import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, Home, Bed, Bath, Maximize, Ruler, DollarSign } from 'lucide-react';
import { MobileHomeImageCarousel } from './MobileHomeImageCarousel';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { formatPrice } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface MobileHomeImage {
  id: string;
  mobile_home_id: string;
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text: string | null;
}

interface HomeComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  homes: MobileHome[];
  onRemoveHome: (homeId: string) => void;
  onClearAll: () => void;
  homeImages: MobileHomeImage[];
  user?: User | null;
}

export const HomeComparisonModal: React.FC<HomeComparisonModalProps> = ({
  isOpen,
  onClose,
  homes,
  onRemoveHome,
  onClearAll,
  homeImages,
  user
}) => {
  const { calculateMobileHomePrice, loading: pricingLoading } = useCustomerPricing(user);

  const getHomeImages = (homeId: string) => {
    return homeImages.filter(image => image.mobile_home_id === homeId);
  };

  const getHomeName = (home: MobileHome) => {
    return home.display_name || `${home.manufacturer} ${home.model}`;
  };

  const getHomeFeatures = (features: any): string[] => {
    if (!features) return [];
    if (Array.isArray(features)) {
      return features.filter(feature => typeof feature === 'string');
    }
    return [];
  };

  const comparisonRows = [
    {
      label: 'Price',
      icon: DollarSign,
      getValue: (home: MobileHome) => {
        if (user && !pricingLoading) {
          return formatPrice(calculateMobileHomePrice(home));
        }
        return home.retail_price ? formatPrice(home.retail_price) : 'Contact for pricing';
      }
    },
    {
      label: 'Square Footage',
      icon: Maximize,
      getValue: (home: MobileHome) => home.square_footage ? `${home.square_footage.toLocaleString()} sq ft` : 'N/A'
    },
    {
      label: 'Dimensions',
      icon: Ruler,
      getValue: (home: MobileHome) => 
        home.length_feet && home.width_feet 
          ? `${home.width_feet}' × ${home.length_feet}'` 
          : 'N/A'
    },
    {
      label: 'Bedrooms',
      icon: Bed,
      getValue: (home: MobileHome) => home.bedrooms ? `${home.bedrooms}` : 'N/A'
    },
    {
      label: 'Bathrooms',
      icon: Bath,
      getValue: (home: MobileHome) => home.bathrooms ? `${home.bathrooms}` : 'N/A'
    },
    {
      label: 'Manufacturer',
      icon: Home,
      getValue: (home: MobileHome) => home.manufacturer
    },
    {
      label: 'Series',
      icon: Home,
      getValue: (home: MobileHome) => home.series
    }
  ];

  if (homes.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Compare Mobile Homes ({homes.length})
            </DialogTitle>
            <div className="flex gap-2">
              <Button onClick={onClearAll} variant="outline" size="sm">
                Clear All
              </Button>
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Home Cards with Images */}
          <div className={`grid gap-4 ${homes.length === 1 ? 'grid-cols-1' : homes.length === 2 ? 'grid-cols-2' : homes.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {homes.map((home) => (
              <Card key={home.id} className="relative">
                <Button
                  onClick={() => onRemoveHome(home.id)}
                  className="absolute top-2 right-2 z-10"
                  variant="destructive"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
                <CardHeader className="pb-2">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg leading-tight">
                      {getHomeName(home)}
                    </h3>
                    <Badge variant="secondary" className="w-fit">
                      {home.series} Series
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <MobileHomeImageCarousel 
                    images={getHomeImages(home.id)} 
                    homeModel={getHomeName(home)}
                  />
                  {home.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {home.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Comparison Table */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Specifications Comparison</h3>
            
            {comparisonRows.map((row, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 p-3 font-medium flex items-center gap-2">
                  <row.icon className="h-4 w-4 text-blue-600" />
                  {row.label}
                </div>
                <div className={`grid ${homes.length === 1 ? 'grid-cols-1' : homes.length === 2 ? 'grid-cols-2' : homes.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'} divide-x`}>
                  {homes.map((home) => (
                    <div key={home.id} className="p-3 text-center">
                      <span className="font-medium">
                        {row.getValue(home)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Features Comparison */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 font-medium flex items-center gap-2">
                <Home className="h-4 w-4 text-blue-600" />
                Key Features
              </div>
              <div className={`grid ${homes.length === 1 ? 'grid-cols-1' : homes.length === 2 ? 'grid-cols-2' : homes.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'} divide-x`}>
                {homes.map((home) => {
                  const features = getHomeFeatures(home.features);
                  return (
                    <div key={home.id} className="p-3">
                      {features.length > 0 ? (
                        <ul className="space-y-1 text-sm">
                          {features.slice(0, 5).map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                              {feature}
                            </li>
                          ))}
                          {features.length > 5 && (
                            <li className="text-gray-500 text-xs">
                              +{features.length - 5} more features
                            </li>
                          )}
                        </ul>
                      ) : (
                        <span className="text-gray-400 text-sm">No features listed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};