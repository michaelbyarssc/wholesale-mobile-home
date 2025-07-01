
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Bed, Bath, Maximize, Ruler } from 'lucide-react';
import { MobileHomeImageCarousel } from '@/components/MobileHomeImageCarousel';
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

interface MobileHomeCardProps {
  home: MobileHome;
  homeImages: MobileHomeImage[];
  isInCart: boolean;
  user?: User | null;
  onAddToCart: (home: MobileHome) => void;
}

export const MobileHomeCard = ({ 
  home, 
  homeImages, 
  isInCart, 
  user, 
  onAddToCart 
}: MobileHomeCardProps) => {
  const { calculateMobileHomePrice, loading: pricingLoading } = useCustomerPricing(user);

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

  const homeFeatures = getHomeFeatures(home.features);
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold text-gray-900">
            {getHomeName(home)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {home.series} Series
            </Badge>
            {user && isInCart && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                In Cart
              </Badge>
            )}
          </div>
        </div>
        {home.description && (
          <p className="text-gray-600 text-sm mt-2">{home.description}</p>
        )}
        
        {/* Pricing Display Logic */}
        {user ? (
          !pricingLoading ? (
            <div className="mt-2">
              <span className="text-2xl font-bold text-green-600">
                {formatPrice(calculateMobileHomePrice(home))}
              </span>
              <p className="text-sm text-gray-500 mt-1">Your price</p>
            </div>
          ) : (
            <div className="mt-2">
              <span className="text-lg text-gray-500 italic">Loading your pricing...</span>
            </div>
          )
        ) : (
          home.retail_price ? (
            <div className="mt-2">
              <p className="text-sm text-blue-600 mb-1">Starting at:</p>
              <span className="text-2xl font-bold text-blue-600">{formatPrice(home.retail_price)}</span>
              <p className="text-sm text-gray-500 mt-1">
                <span className="text-blue-600 font-medium cursor-pointer hover:underline" onClick={() => window.location.href = '/auth'}>Login to see your price</span>
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <span className="text-lg text-gray-500 italic">Login to view pricing</span>
            </div>
          )
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <MobileHomeImageCarousel 
          images={homeImages} 
          homeModel={getHomeName(home)}
        />

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center text-center text-sm">
            <div className="flex items-center space-x-1 text-gray-600 mb-1">
              <Maximize className="h-4 w-4 text-blue-600" />
              <span>Square Footage:</span>
            </div>
            <span className="font-semibold text-lg">{home.square_footage || 'N/A'} sq ft</span>
          </div>
          
          <div className="flex flex-col items-center text-center text-sm">
            <div className="flex items-center space-x-1 text-gray-600 mb-1">
              <Ruler className="h-4 w-4 text-blue-600" />
              <span>Dimensions:</span>
            </div>
            <span className="font-semibold text-lg">
              {home.length_feet && home.width_feet 
                ? `${home.width_feet}' × ${home.length_feet}'` 
                : 'N/A'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Bed className="h-4 w-4 text-blue-600" />
            <span className="text-gray-600">Bedrooms:</span>
            <span className="font-semibold">{home.bedrooms || 'N/A'}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Bath className="h-4 w-4 text-blue-600" />
            <span className="text-gray-600">Bathrooms:</span>
            <span className="font-semibold">{home.bathrooms || 'N/A'}</span>
          </div>
        </div>

        {/* Features */}
        {homeFeatures.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
              <Home className="h-4 w-4 mr-2 text-blue-600" />
              Key Features
            </h4>
            <div className="grid grid-cols-1 gap-1">
              {homeFeatures.map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add to Cart Button */}
        {user ? (
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(home);
            }}
            className="w-full"
            variant={isInCart ? "outline" : "default"}
            type="button"
          >
            {isInCart ? 'Update in Cart' : 'Add to Cart'}
          </Button>
        ) : (
          <Button 
            onClick={() => window.location.href = '/auth'}
            className="w-full"
            variant="outline"
            type="button"
          >
            Login to Add to Cart
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
