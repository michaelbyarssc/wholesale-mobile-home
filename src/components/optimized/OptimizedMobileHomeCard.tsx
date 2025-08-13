import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Bed, Bath, Maximize, Ruler, Scale, Heart, Eye } from 'lucide-react';
import { OptimizedImageCarousel } from './OptimizedImageCarousel';
import { formatPrice } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import { LoadingSpinner } from '../loading/LoadingSpinner';

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

interface OptimizedMobileHomeCardProps {
  home: MobileHome;
  images: MobileHomeImage[];
  user?: User | null;
  isInCart: boolean;
  pricingLoading: boolean;
  homePrice: number;
  isInComparison: boolean;
  isInWishlist: boolean;
  onAddToCart: (home: MobileHome) => void;
  onViewDetails: (homeId: string) => void;
  onQuickView: (home: MobileHome) => void;
  onAddToComparison: (home: MobileHome) => void;
  onRemoveFromComparison: (homeId: string) => void;
  onAddToWishlist: (home: MobileHome) => void;
  onRemoveFromWishlist: (homeId: string) => void;
}

const MemoizedSpecCard = React.memo(({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: string; 
}) => (
  <div className="flex flex-col items-center text-center p-3 bg-muted/50 rounded-lg">
    <div className="flex items-center space-x-1 text-muted-foreground mb-2">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">{label}</span>
    </div>
    <span className="font-bold text-lg">{value}</span>
  </div>
));

MemoizedSpecCard.displayName = 'MemoizedSpecCard';

const MemoizedActionButton = React.memo(({ 
  variant, 
  onClick, 
  children, 
  disabled = false 
}: { 
  variant: "default" | "outline" | "secondary";
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <Button 
    variant={variant}
    size="sm" 
    className="w-full" 
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </Button>
));

MemoizedActionButton.displayName = 'MemoizedActionButton';

export const OptimizedMobileHomeCard = React.memo(({
  home,
  images,
  user,
  isInCart,
  pricingLoading,
  homePrice,
  isInComparison,
  isInWishlist,
  onAddToCart,
  onViewDetails,
  onQuickView,
  onAddToComparison,
  onRemoveFromComparison,
  onAddToWishlist,
  onRemoveFromWishlist
}: OptimizedMobileHomeCardProps) => {
  const navigate = useNavigate();

  const homeName = useMemo(() => 
    home.display_name || `${home.manufacturer} ${home.model}`, 
    [home.display_name, home.manufacturer, home.model]
  );

  const homeFeatures = useMemo(() => {
    if (!home.features) return [];
    if (Array.isArray(home.features)) {
      return home.features.filter(feature => typeof feature === 'string');
    }
    return [];
  }, [home.features]);

  const handleTitleClick = useCallback(() => {
    window.open(`/home/${home.id}`, '_blank');
  }, [home.id]);

  const handleAddToCart = useCallback(() => {
    onAddToCart(home);
  }, [onAddToCart, home]);

  const handleViewDetails = useCallback(() => {
    onViewDetails(home.id);
  }, [onViewDetails, home.id]);

  const handleQuickView = useCallback(() => {
    onQuickView(home);
  }, [onQuickView, home]);

  const handleToggleComparison = useCallback(() => {
    if (isInComparison) {
      onRemoveFromComparison(home.id);
    } else {
      onAddToComparison(home);
    }
  }, [isInComparison, onRemoveFromComparison, onAddToComparison, home]);

  const handleToggleWishlist = useCallback(() => {
    if (isInWishlist) {
      onRemoveFromWishlist(home.id);
    } else {
      onAddToWishlist(home);
    }
  }, [isInWishlist, onRemoveFromWishlist, onAddToWishlist, home]);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group will-change-transform contain-layout-style-paint">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle 
            className="text-xl font-bold cursor-pointer hover:text-primary transition-colors"
            onClick={handleTitleClick}
          >
            {homeName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
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
          <p className="text-muted-foreground text-sm mt-2">{home.description}</p>
        )}
        
        {/* Pricing Display */}
        {user ? (
          <div className="mt-2 space-y-1">
            {home.retail_price && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Retail Price</p>
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(home.retail_price)}
                </span>
              </div>
            )}
            <div>
              <p className="text-sm text-green-600 font-medium">Your Price</p>
              {!pricingLoading ? (
                <>
                  <span className="text-2xl font-bold text-green-600">
                    {formatPrice(homePrice)}
                  </span>
                  {home.retail_price && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      You Save: {formatPrice(home.retail_price - homePrice)}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex items-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span className="text-sm text-muted-foreground italic">Calculating...</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          home.retail_price ? (
            <div className="mt-2">
              <p className="text-sm text-primary mb-1">Starting at:</p>
              <span className="text-2xl font-bold text-primary">{formatPrice(home.retail_price)}</span>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="text-primary font-medium cursor-pointer hover:underline" onClick={() => navigate('/auth')}>
                  Login to see your price
                </span>
              </p>
            </div>
          ) : (
            <div className="mt-2">
              <span className="text-lg text-muted-foreground italic">Login to view pricing</span>
            </div>
          )
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        <OptimizedImageCarousel 
          images={images} 
          homeModel={homeName}
        />

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MemoizedSpecCard
            icon={Maximize}
            label="Square Footage"
            value={`${home.square_footage || 'N/A'} sq ft`}
          />
          
          <MemoizedSpecCard
            icon={Ruler}
            label="Dimensions"
            value={home.width_feet && home.length_feet 
              ? `${home.width_feet}' × ${home.length_feet}'`
              : 'N/A'
            }
          />

          <MemoizedSpecCard
            icon={Bed}
            label="Bedrooms"
            value={home.bedrooms?.toString() || 'N/A'}
          />

          <MemoizedSpecCard
            icon={Bath}
            label="Bathrooms"
            value={home.bathrooms?.toString() || 'N/A'}
          />
        </div>

        {/* Features - Only show if present */}
        {homeFeatures.length > 0 && (
          <div>
            <div className="flex items-center mb-2">
              <Home className="h-4 w-4 mr-2 text-primary" />
              <span className="font-medium text-sm">Features</span>
            </div>
            <div className="space-y-1">
              {homeFeatures.slice(0, 3).map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full mr-2" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
              {homeFeatures.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{homeFeatures.length - 3} more features
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {user && (
            <MemoizedActionButton
              variant="default"
              onClick={handleAddToCart}
            >
              {isInCart ? 'Update Cart' : 'Add to Cart'}
            </MemoizedActionButton>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <MemoizedActionButton
              variant="outline"
              onClick={handleViewDetails}
            >
              <Eye className="w-4 h-4 mr-1" />
              Details
            </MemoizedActionButton>
            
            <MemoizedActionButton
              variant="outline"
              onClick={handleQuickView}
            >
              Quick View
            </MemoizedActionButton>
          </div>

          {user && (
            <div className="grid grid-cols-2 gap-2">
              <MemoizedActionButton
                variant="outline"
                onClick={handleToggleComparison}
              >
                {isInComparison ? 'Remove from Compare' : 'Compare'}
              </MemoizedActionButton>
              
              <MemoizedActionButton
                variant="outline"
                onClick={handleToggleWishlist}
              >
                <Heart className={`w-4 h-4 mr-1 ${isInWishlist ? 'fill-current text-red-500' : ''}`} />
                {isInWishlist ? 'Saved' : 'Save'}
              </MemoizedActionButton>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedMobileHomeCard.displayName = 'OptimizedMobileHomeCard';