import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { X, Heart, ShoppingCart, Scale, Bed, Bath, Maximize, Ruler } from 'lucide-react';
import { MobileHomeImageCarousel } from './MobileHomeImageCarousel';
import { usePricingContext } from '@/contexts/PricingContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface MobileHomeImage {
  id: string;
  mobile_home_id: string;
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text: string | null;
}

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  homes: MobileHome[];
  onRemoveHome: (homeId: string) => void;
  onClearAll: () => void;
  homeImages: MobileHomeImage[];
  onAddToCart?: (home: MobileHome) => void;
  onAddToComparison?: (home: MobileHome) => void;
  isInComparison?: (homeId: string) => boolean;
}

export const WishlistModal: React.FC<WishlistModalProps> = ({
  isOpen,
  onClose,
  homes,
  onRemoveHome,
  onClearAll,
  homeImages,
  onAddToCart,
  onAddToComparison,
  isInComparison
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { calculateMobileHomePrice, loading: pricingLoading } = usePricingContext();

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Heart className="h-6 w-6 text-red-500 fill-current" />
              My Wishlist ({homes.length})
            </DialogTitle>
            <div className="flex gap-2">
              {homes.length > 0 && (
                <Button onClick={onClearAll} variant="outline" size="sm">
                  Clear All
                </Button>
              )}
              <Button onClick={onClose} variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {homes.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-gray-500">
              Save your favorite mobile homes by clicking the heart icon on any home card.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {homes.map((home) => {
              const homeImageList = getHomeImages(home.id);
              const homeFeatures = getHomeFeatures(home.features);
              
              return (
                <Card key={home.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-bold text-gray-900 flex-1 pr-2">
                        {getHomeName(home)}
                      </CardTitle>
                      <Button
                        onClick={() => onRemoveHome(home.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {home.series} Series
                      </Badge>
                    </div>
                    
                    {/* Pricing Display */}
                    {user ? (
                      !pricingLoading ? (
                        <div className="mt-2">
                          <span className="text-xl font-bold text-green-600">
                            {formatPrice(calculateMobileHomePrice(home))}
                          </span>
                          <p className="text-xs text-gray-500">Your price</p>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <span className="text-sm text-gray-500 italic">Loading...</span>
                        </div>
                      )
                    ) : (
                      home.retail_price ? (
                        <div className="mt-2">
                          <span className="text-xl font-bold text-blue-600">
                            {formatPrice(home.retail_price)}
                          </span>
                          <p className="text-xs text-gray-500">Starting at</p>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <span className="text-sm text-gray-500 italic">Contact for pricing</span>
                        </div>
                      )
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {/* Home Images */}
                    <MobileHomeImageCarousel 
                      images={homeImageList} 
                      homeModel={getHomeName(home)}
                    />

                    {/* Quick Specs */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1">
                        <Maximize className="h-3 w-3 text-blue-600" />
                        <span>{home.square_footage || 'N/A'} sq ft</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Ruler className="h-3 w-3 text-blue-600" />
                        <span>
                          {home.length_feet && home.width_feet 
                            ? `${home.width_feet}' × ${home.length_feet}'` 
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bed className="h-3 w-3 text-blue-600" />
                        <span>{home.bedrooms || 'N/A'} bed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Bath className="h-3 w-3 text-blue-600" />
                        <span>{home.bathrooms || 'N/A'} bath</span>
                      </div>
                    </div>

                    {/* Key Features */}
                    {homeFeatures.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-1">Key Features:</h5>
                        <div className="text-xs text-gray-600 space-y-1">
                          {homeFeatures.slice(0, 3).map((feature, index) => (
                            <div key={index} className="flex items-start gap-1">
                              <span className="w-1 h-1 bg-blue-600 rounded-full mt-1.5 flex-shrink-0"></span>
                              {feature}
                            </div>
                          ))}
                          {homeFeatures.length > 3 && (
                            <div className="text-gray-500">
                              +{homeFeatures.length - 3} more features
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {/* Compare Button */}
                      {onAddToComparison && (
                        <Button
                          onClick={() => onAddToComparison(home)}
                          variant="outline"
                          className="w-full flex items-center gap-2"
                          disabled={isInComparison?.(home.id)}
                        >
                          <Scale className="h-4 w-4" />
                          {isInComparison?.(home.id) ? 'Added to Compare' : 'Compare'}
                        </Button>
                      )}

                      {/* Add to Cart Button */}
                      {user && onAddToCart ? (
                        <Button 
                          onClick={() => onAddToCart(home)}
                          className="w-full flex items-center gap-2"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add to Cart
                        </Button>
                      ) : !user ? (
                        <Button 
                          onClick={() => navigate('/auth')}
                          className="w-full flex items-center gap-2"
                          variant="outline"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Login to Add to Cart
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};