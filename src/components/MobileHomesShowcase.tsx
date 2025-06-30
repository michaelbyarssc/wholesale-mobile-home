import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Bed, Bath, Maximize, Ruler } from 'lucide-react';
import { MobileHomeImageCarousel } from './MobileHomeImageCarousel';
import { MobileHomeServicesDialog } from './MobileHomeServicesDialog';
import { ShoppingCart } from './ShoppingCart';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { CartItem } from '@/hooks/useShoppingCart';
import { User } from '@supabase/supabase-js';
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

interface MobileHomesShowcaseProps {
  user?: User | null;
  cartItems: CartItem[];
  isCartOpen: boolean;
  addToCart: (home: MobileHome, selectedServices: string[], selectedHomeOptions: { option: HomeOption; quantity: number }[]) => void;
  removeFromCart: (itemId: string) => void;
  updateServices: (homeId: string, selectedServices: string[]) => void;
  updateHomeOptions: (homeId: string, selectedHomeOptions: { option: HomeOption; quantity: number }[]) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;
}

export const MobileHomesShowcase = ({ 
  user = null, 
  cartItems,
  isCartOpen,
  addToCart,
  removeFromCart,
  updateServices,
  updateHomeOptions,
  clearCart,
  setIsCartOpen
}: MobileHomesShowcaseProps) => {
  const [activeTab, setActiveTab] = useState('');
  const [widthFilter, setWidthFilter] = useState<'all' | 'single' | 'double'>('all');
  const [selectedHomeForServices, setSelectedHomeForServices] = useState<MobileHome | null>(null);
  const { calculateMobileHomePrice, loading: pricingLoading } = useCustomerPricing(user);
  
  console.log('MobileHomesShowcase render - cart items from props:', cartItems.length);

  const { data: mobileHomes = [], isLoading } = useQuery({
    queryKey: ['public-mobile-homes'],
    queryFn: async () => {
      console.log('Fetching mobile homes...');
      
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching mobile homes:', error);
        throw error;
      }
      
      console.log('Mobile homes fetched:', data?.length || 0);
      console.log('Active homes data:', data);
      
      return data as MobileHome[];
    }
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('Fetching mobile home images...');
      const { data, error } = await supabase
        .from('mobile_home_images')
        .select('*')
        .order('mobile_home_id')
        .order('image_type')
        .order('display_order');
      
      if (error) {
        console.error('Error fetching mobile home images:', error);
        throw error;
      }
      console.log('Mobile home images fetched:', data?.length || 0);
      return data as MobileHomeImage[];
    }
  });

  // Filter homes based on width
  const getFilteredHomes = (homes: MobileHome[]) => {
    if (widthFilter === 'single') {
      return homes.filter(home => !home.width_feet || home.width_feet < 16);
    }
    if (widthFilter === 'double') {
      return homes.filter(home => home.width_feet && home.width_feet >= 16);
    }
    return homes;
  };

  const filteredHomes = getFilteredHomes(mobileHomes);

  // Get unique series from the filtered mobile homes data and sort with Tru first
  const uniqueSeries = [...new Set(filteredHomes.map(home => home.series))].sort((a, b) => {
    if (a === 'Tru') return -1;
    if (b === 'Tru') return 1;
    return a.localeCompare(b);
  });

  console.log('Unique series found:', uniqueSeries);
  
  // Set the first series as the default active tab
  React.useEffect(() => {
    if (uniqueSeries.length > 0 && !activeTab) {
      const defaultTab = uniqueSeries[0];
      console.log('Setting default tab to:', defaultTab);
      setActiveTab(defaultTab);
    }
  }, [uniqueSeries, activeTab]);

  const getHomeImages = (homeId: string) => {
    const images = homeImages.filter(image => image.mobile_home_id === homeId);
    return images;
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

  const handleAddToCart = useCallback((home: MobileHome) => {
    console.log('Add to cart button clicked for:', home.id, home.model);
    setSelectedHomeForServices(home);
  }, []);

  const handleAddToCartWithServices = useCallback((home: MobileHome, selectedServices: string[], selectedHomeOptions: { option: HomeOption; quantity: number }[] = []) => {
    console.log('Adding to cart with services and options:', home.id, selectedServices, selectedHomeOptions);
    addToCart(home, selectedServices, selectedHomeOptions);
    setSelectedHomeForServices(null);
  }, [addToCart]);

  const renderHomeCard = (home: MobileHome, index: number) => {
    const homeImageList = getHomeImages(home.id);
    const isInCart = cartItems.some(item => item.mobileHome.id === home.id);
    const homeFeatures = getHomeFeatures(home.features);
    
    return (
      <Card key={home.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
            // Logged in users see their calculated pricing
            !pricingLoading ? (
              <div className="mt-2">
                <span className="text-2xl font-bold text-green-600">{formatPrice(calculateMobileHomePrice(home))}</span>
                <p className="text-sm text-gray-500 mt-1">Your price</p>
              </div>
            ) : (
              <div className="mt-2">
                <span className="text-lg text-gray-500 italic">Loading your pricing...</span>
              </div>
            )
          ) : (
            // Non-logged in users see retail price or login prompt
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
          {/* Home Image Carousel */}
          <MobileHomeImageCarousel 
            images={homeImageList} 
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

          {/* Add to Cart Button - Only show for logged in users */}
          {user ? (
            <Button 
              onClick={() => handleAddToCart(home)}
              className="w-full"
              variant={isInCart ? "outline" : "default"}
            >
              {isInCart ? 'Update in Cart' : 'Add to Cart'}
            </Button>
          ) : (
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="w-full"
              variant="outline"
            >
              Login to Add to Cart
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  console.log('Render state:', { 
    isLoading, 
    imagesLoading, 
    pricingLoading,
    homeCount: mobileHomes.length, 
    imageCount: homeImages.length,
    uniqueSeries,
    activeTab,
    cartItemsCount: cartItems.length,
    widthFilter,
    filteredHomesCount: filteredHomes.length
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Our Mobile Home Models
            </h3>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading models...</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (mobileHomes.length === 0) {
    return (
      <section className="py-20 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Our Mobile Home Models
            </h3>
            <p className="text-lg text-gray-600">No mobile homes available at this time.</p>
            <p className="text-sm text-gray-500 mt-2">
              Please check back later or contact us for more information.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Our Mobile Home Models
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our premium collection of mobile homes featuring modern designs, 
            quality construction, and thoughtful amenities for comfortable living.
            {!user && (
              <span className="block mt-2 text-blue-600 font-medium">
                Login to view your personalized pricing and add items to your cart.
              </span>
            )}
          </p>
        </div>

        {/* Width Filter Tabs */}
        <div className="mb-8">
          <div className="flex justify-center">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setWidthFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  widthFilter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                All Homes ({mobileHomes.length})
              </button>
              <button
                onClick={() => setWidthFilter('single')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  widthFilter === 'single'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                Single Wide ({mobileHomes.filter(h => !h.width_feet || h.width_feet < 16).length})
              </button>
              <button
                onClick={() => setWidthFilter('double')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  widthFilter === 'double'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                }`}
              >
                Double Wide ({mobileHomes.filter(h => h.width_feet && h.width_feet >= 16).length})
              </button>
            </div>
          </div>
        </div>

        {uniqueSeries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600">No mobile homes available for the selected filter.</p>
            <p className="text-sm text-gray-500 mt-2">
              Try selecting a different width category above.
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full mb-8 ${uniqueSeries.length <= 2 ? 'grid-cols-2' : uniqueSeries.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
              {uniqueSeries.map((series) => {
                const seriesHomes = filteredHomes.filter(home => home.series === series);
                return (
                  <TabsTrigger key={series} value={series} className="text-lg py-3">
                    {series} Series ({seriesHomes.length})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {uniqueSeries.map((series) => {
              const seriesHomes = filteredHomes.filter(home => home.series === series);
              console.log(`Rendering ${series} series with ${seriesHomes.length} homes:`, seriesHomes);
              
              return (
                <TabsContent key={series} value={series}>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {seriesHomes.length > 0 ? (
                      seriesHomes.map((home, index) => renderHomeCard(home, index))
                    ) : (
                      <div className="col-span-full text-center py-8">
                        <p className="text-gray-500">No {series} series models available for the selected width category.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}

        {/* Shopping Cart - Only show for logged in users */}
        {user && (
          <>
            <ShoppingCart
              isOpen={isCartOpen}
              onClose={() => setIsCartOpen(false)}
              cartItems={cartItems}
              onRemoveItem={removeFromCart}
              onUpdateServices={updateServices}
              onUpdateHomeOptions={updateHomeOptions}
              onClearCart={clearCart}
              user={user}
            />
            
            <MobileHomeServicesDialog
              isOpen={!!selectedHomeForServices}
              onClose={() => setSelectedHomeForServices(null)}
              mobileHome={selectedHomeForServices!}
              onAddToCart={handleAddToCartWithServices}
              user={user}
            />
          </>
        )}
      </div>
    </section>
  );
};
