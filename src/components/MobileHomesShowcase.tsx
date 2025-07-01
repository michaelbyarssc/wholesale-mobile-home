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
  
  console.log('🔍 MobileHomesShowcase render - cart items from props:', cartItems.length);
  console.log('🔍 MobileHomesShowcase - selectedHomeForServices:', selectedHomeForServices?.id);
  console.log('🔍 Current user:', user?.email);
  console.log('🔍 Supabase URL:', supabase.supabaseUrl);
  console.log('🔍 Supabase Key (first 20 chars):', supabase.supabaseKey?.substring(0, 20));

  const { data: mobileHomes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['public-mobile-homes'],
    queryFn: async () => {
      console.log('🔍 Starting mobile homes fetch...');
      console.log('🔍 Supabase client status:', {
        hasClient: !!supabase,
        url: supabase.supabaseUrl,
        authStatus: await supabase.auth.getSession()
      });
      
      try {
        // First test basic database connection
        console.log('🔍 Testing basic database connection...');
        const { data: testData, error: testError } = await supabase
          .from('mobile_homes')
          .select('count')
          .limit(1);
        
        console.log('🔍 Connection test result:', { 
          success: !testError,
          data: testData, 
          error: testError 
        });
        
        if (testError) {
          console.error('🔍 Connection test failed:', {
            message: testError.message,
            details: testError.details,
            hint: testError.hint,
            code: testError.code
          });
          throw new Error(`Database connection failed: ${testError.message}`);
        }

        // Test if table exists and get basic info
        console.log('🔍 Testing table structure...');
        const { data: tableInfo, error: tableError } = await supabase
          .from('mobile_homes')
          .select('id, model, active')
          .limit(1);
        
        console.log('🔍 Table structure test:', { 
          success: !tableError,
          data: tableInfo,
          error: tableError 
        });

        if (tableError) {
          console.error('🔍 Table structure error:', tableError);
          throw new Error(`Table access failed: ${tableError.message}`);
        }

        // Now fetch the actual data with detailed logging
        console.log('🔍 Fetching mobile homes data...');
        const { data, error, status, statusText } = await supabase
          .from('mobile_homes')
          .select(`
            id,
            model,
            manufacturer,
            series,
            price,
            retail_price,
            cost,
            minimum_profit,
            display_name,
            description,
            bedrooms,
            bathrooms,
            square_footage,
            width_feet,
            length_feet,
            features,
            exterior_image_url,
            floor_plan_image_url,
            active,
            display_order,
            created_at,
            updated_at
          `)
          .eq('active', true)
          .order('display_order', { ascending: true });
        
        console.log('🔍 Query response details:', { 
          status,
          statusText,
          hasData: !!data,
          dataLength: data?.length || 0,
          hasError: !!error,
          error: error
        });
        
        if (error) {
          console.error('🔍 Query error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw new Error(`Failed to fetch mobile homes: ${error.message}`);
        }
        
        if (!data) {
          console.warn('🔍 No data returned from query');
          return [];
        }
        
        console.log('🔍 Successfully fetched mobile homes:', {
          count: data.length,
          firstItem: data[0],
          allItems: data
        });
        
        return data as MobileHome[];
      } catch (err: any) {
        console.error('🔍 Mobile homes fetch failed:', {
          error: err,
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        throw err;
      }
    },
    retry: (failureCount, error) => {
      console.log('🔍 Query retry attempt:', failureCount, error?.message);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('🔍 Fetching mobile home images...');
      const { data, error } = await supabase
        .from('mobile_home_images')
        .select('*')
        .order('mobile_home_id')
        .order('image_type')
        .order('display_order');
      
      if (error) {
        console.error('🔍 Error fetching mobile home images:', error);
        throw error;
      }
      console.log('🔍 Mobile home images fetched:', data?.length || 0);
      return data as MobileHomeImage[];
    }
  });

  // Enhanced error display with more debugging info
  if (error) {
    console.error('🔍 Mobile homes query error:', error);
    return (
      <section className="py-20 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Our Mobile Home Models
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-4xl mx-auto">
              <p className="text-red-600 font-medium mb-2">Unable to load mobile homes</p>
              <p className="text-red-500 text-sm mb-4">
                We're experiencing technical difficulties. Please check the details below and try refreshing the page.
              </p>
              <div className="space-y-2 mb-4">
                <p className="text-sm"><strong>User:</strong> {user?.email || 'Not logged in'}</p>
                <p className="text-sm"><strong>Database URL:</strong> {supabase.supabaseUrl}</p>
                <p className="text-sm"><strong>Error:</strong> {error.message}</p>
              </div>
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                className="mr-2"
              >
                Try Again
              </Button>
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                  Technical Details (Click to expand)
                </summary>
                <pre className="text-xs text-gray-500 mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      </section>
    );
  }

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

  console.log('🔍 Unique series found:', uniqueSeries);
  
  // Set the first series as the default active tab
  React.useEffect(() => {
    if (uniqueSeries.length > 0 && !activeTab) {
      const defaultTab = uniqueSeries[0];
      console.log('🔍 Setting default tab to:', defaultTab);
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
    console.log('🔍 Add to cart button clicked for:', home.id, home.model);
    console.log('🔍 Setting selectedHomeForServices to:', home);
    setSelectedHomeForServices(home);
  }, []);

  const handleAddToCartWithServices = useCallback((home: MobileHome, selectedServices: string[], selectedHomeOptions: { option: HomeOption; quantity: number }[] = []) => {
    console.log('🔍 Adding to cart with services and options:', {
      homeId: home.id,
      selectedServices,
      selectedHomeOptions
    });
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
          
          {/* Pricing Display Logic - Always use calculated pricing for logged in users */}
          {user ? (
            // Logged in users (including admins) see their calculated pricing
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔍 Button clicked for home:', home.id);
                handleAddToCart(home);
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

  console.log('🔍 Render state:', { 
    isLoading, 
    imagesLoading, 
    pricingLoading,
    homeCount: mobileHomes.length, 
    imageCount: homeImages.length,
    uniqueSeries,
    activeTab,
    cartItemsCount: cartItems.length,
    widthFilter,
    filteredHomesCount: filteredHomes.length,
    hasError: !!error
  });

  if (isLoading) {
    return (
      <section className="py-20 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Our Mobile Home Models
            </h3>
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg">Loading our amazing mobile home models...</span>
            </div>
            <p className="text-gray-600 mt-2">This should only take a moment</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>User: {user?.email || 'Not logged in'}</p>
              <p>Database: {supabase.supabaseUrl}</p>
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
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-yellow-800 font-medium mb-2">No mobile homes available</p>
              <p className="text-yellow-700 text-sm mb-4">
                We're currently updating our inventory. Please check back soon or contact us for availability.
              </p>
              <div className="space-y-2 mb-4 text-sm text-gray-600">
                <p><strong>User:</strong> {user?.email || 'Not logged in'}</p>
                <p><strong>Query executed successfully:</strong> Yes</p>
                <p><strong>Database connection:</strong> Working</p>
                <p><strong>Records returned:</strong> 0</p>
              </div>
              <Button onClick={() => refetch()} variant="outline">
                Refresh
              </Button>
            </div>
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
            <div className="flex justify-center mb-8">
              <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                {uniqueSeries.map((series) => {
                  const seriesHomes = filteredHomes.filter(home => home.series === series);
                  return (
                    <button
                      key={series}
                      onClick={() => setActiveTab(series)}
                      className={`px-6 py-3 rounded-md text-base font-medium transition-colors ${
                        activeTab === series
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                    >
                      {series} Series ({seriesHomes.length})
                    </button>
                  );
                })}
              </div>
            </div>

            {uniqueSeries.map((series) => {
              const seriesHomes = filteredHomes.filter(home => home.series === series);
              console.log(`🔍 Rendering ${series} series with ${seriesHomes.length} homes:`, seriesHomes);
              
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
              onClose={() => {
                console.log('🔍 Closing MobileHomeServicesDialog');
                setSelectedHomeForServices(null);
              }}
              mobileHome={selectedHomeForServices}
              onAddToCart={handleAddToCartWithServices}
              user={user}
            />
          </>
        )}
      </div>
    </section>
  );
};
