import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Bed, Bath, Maximize, Ruler, ShoppingCart as CartIcon } from 'lucide-react';
import { MobileHomeImageCarousel } from './MobileHomeImageCarousel';
import { ShoppingCart } from './ShoppingCart';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { User } from '@supabase/supabase-js';

interface MobileHome {
  id: string;
  manufacturer: string;
  series: string;
  model: string;
  display_name: string | null;
  square_footage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  length_feet: number | null;
  width_feet: number | null;
  features: string[] | null;
  description: string | null;
  floor_plan_image_url: string | null;
  exterior_image_url: string | null;
  active: boolean;
  price: number | null;
}

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
}

export const MobileHomesShowcase = ({ user = null }: MobileHomesShowcaseProps) => {
  const [activeTab, setActiveTab] = useState('');
  const { formatCalculatedPrice } = useCustomerPricing(user);
  
  const {
    cartItems,
    isCartOpen,
    addToCart,
    removeFromCart,
    updateServices,
    clearCart,
    toggleCart,
    setIsCartOpen
  } = useShoppingCart();

  const { data: mobileHomes = [], isLoading } = useQuery({
    queryKey: ['public-mobile-homes'],
    queryFn: async () => {
      console.log('Fetching mobile homes...');
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('active', true)
        .order('series', { ascending: true })
        .order('square_footage', { ascending: true });
      
      if (error) {
        console.error('Error fetching mobile homes:', error);
        throw error;
      }
      console.log('Mobile homes fetched:', data?.length || 0);
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
      console.log('Sample images:', data?.slice(0, 3));
      return data as MobileHomeImage[];
    }
  });

  // Get unique series from the mobile homes data and sort with Tru first
  const uniqueSeries = [...new Set(mobileHomes.map(home => home.series))].sort((a, b) => {
    if (a === 'Tru') return -1;
    if (b === 'Tru') return 1;
    return a.localeCompare(b);
  });
  
  // Set Tru as the default active tab, or the first series if Tru doesn't exist
  React.useEffect(() => {
    if (uniqueSeries.length > 0 && !activeTab) {
      const defaultTab = uniqueSeries.includes('Tru') ? 'Tru' : uniqueSeries[0];
      setActiveTab(defaultTab);
    }
  }, [uniqueSeries, activeTab]);

  const getHomeImages = (homeId: string) => {
    const images = homeImages.filter(image => image.mobile_home_id === homeId);
    console.log(`Images for home ${homeId}:`, images.length);
    return images;
  };

  const getHomeName = (home: MobileHome) => {
    return home.display_name || `${home.manufacturer} ${home.model}`;
  };

  const renderHomeCard = (home: MobileHome, index: number) => {
    const homeImageList = getHomeImages(home.id);
    console.log(`Rendering card for ${home.model} with ${homeImageList.length} images`);
    
    const isInCart = cartItems.some(item => item.mobileHome.id === home.id);
    
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
              {isInCart && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  In Cart
                </Badge>
              )}
            </div>
          </div>
          {home.description && (
            <p className="text-gray-600 text-sm mt-2">{home.description}</p>
          )}
          {user && home.price && (
            <div className="mt-2">
              <span className="text-2xl font-bold text-green-600">{formatCalculatedPrice(home.price)}</span>
            </div>
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
            <div className="flex items-center space-x-2 text-sm">
              <Maximize className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">Square Footage:</span>
              <span className="font-semibold">{home.square_footage || 'N/A'} sq ft</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <Ruler className="h-4 w-4 text-blue-600" />
              <span className="text-gray-600">Dimensions:</span>
              <span className="font-semibold">
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
          {home.features && home.features.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Home className="h-4 w-4 mr-2 text-blue-600" />
                Key Features
              </h4>
              <div className="grid grid-cols-1 gap-1">
                {home.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add to Cart Button */}
          <Button 
            onClick={() => addToCart(home)}
            className="w-full"
            variant={isInCart ? "outline" : "default"}
          >
            {isInCart ? 'Update in Cart' : 'Add to Cart'}
          </Button>
        </CardContent>
      </Card>
    );
  };

  console.log('Render state:', { 
    isLoading, 
    imagesLoading, 
    homeCount: mobileHomes.length, 
    imageCount: homeImages.length,
    uniqueSeries,
    activeTab
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-gray-50">
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

  if (uniqueSeries.length === 0) {
    return (
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Our Mobile Home Models
            </h3>
            <p className="text-lg text-gray-600">No mobile homes available at this time.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-3xl font-bold text-gray-900">
              Our Mobile Home Models
            </h3>
            <Button
              onClick={toggleCart}
              variant="outline"
              className="relative"
            >
              <CartIcon className="h-5 w-5 mr-2" />
              Cart ({cartItems.length})
              {cartItems.length > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {cartItems.length}
                </Badge>
              )}
            </Button>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our premium collection of mobile homes featuring modern designs, 
            quality construction, and thoughtful amenities for comfortable living.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full mb-8 ${uniqueSeries.length <= 2 ? 'grid-cols-2' : uniqueSeries.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
            {uniqueSeries.map((series) => {
              const seriesHomes = mobileHomes.filter(home => home.series === series);
              return (
                <TabsTrigger key={series} value={series} className="text-lg py-3">
                  {series} Series ({seriesHomes.length})
                </TabsTrigger>
              );
            })}
          </TabsList>

          {uniqueSeries.map((series) => {
            const seriesHomes = mobileHomes.filter(home => home.series === series);
            return (
              <TabsContent key={series} value={series}>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {seriesHomes.length > 0 ? (
                    seriesHomes.map((home, index) => renderHomeCard(home, index))
                  ) : (
                    <div className="col-span-full text-center py-8">
                      <p className="text-gray-500">No {series} series models available.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <ShoppingCart
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cartItems={cartItems}
          onRemoveItem={removeFromCart}
          onUpdateServices={updateServices}
          onClearCart={clearCart}
          user={user}
        />
      </div>
    </section>
  );
};
