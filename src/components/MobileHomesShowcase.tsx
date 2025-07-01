
import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { MobileHomeServicesDialog } from './MobileHomeServicesDialog';
import { ShoppingCart } from './ShoppingCart';
import { MobileHomesDebugPanel } from './mobile-homes/MobileHomesDebugPanel';
import { MobileHomesLoadingState } from './mobile-homes/MobileHomesLoadingState';
import { MobileHomesEmptyState } from './mobile-homes/MobileHomesEmptyState';
import { MobileHomeCard } from './mobile-homes/MobileHomeCard';
import { useMobileHomesData } from './mobile-homes/MobileHomesData';
import { CartItem } from '@/hooks/useShoppingCart';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

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

  const { mobileHomes, homeImages, isLoading, imagesLoading, error, refetch } = useMobileHomesData();

  console.log('🔍 MobileHomesShowcase render - cart items from props:', cartItems.length);
  console.log('🔍 Current user:', user?.email);
  console.log('🔍 Mobile homes data:', { count: mobileHomes.length, isLoading, error: error?.message });

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

  // Set the first series as the default active tab
  React.useEffect(() => {
    if (uniqueSeries.length > 0 && !activeTab) {
      const defaultTab = uniqueSeries[0];
      setActiveTab(defaultTab);
    }
  }, [uniqueSeries, activeTab]);

  const getHomeImages = (homeId: string) => {
    return homeImages.filter(image => image.mobile_home_id === homeId);
  };

  const handleAddToCart = useCallback((home: MobileHome) => {
    console.log('🔍 Add to cart button clicked for:', home.id, home.model);
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

  // Show error state
  if (error) {
    return (
      <MobileHomesDebugPanel
        user={user}
        debugInfo={[`Error: ${error.message}`]}
        error={error}
        onRefetch={refetch}
      />
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <MobileHomesLoadingState
        user={user}
        debugInfo={[`Loading mobile homes...`, `User: ${user?.email || 'Not logged in'}`]}
        onRefetch={refetch}
      />
    );
  }

  // Show empty state
  if (mobileHomes.length === 0) {
    return (
      <MobileHomesEmptyState
        user={user}
        onRefetch={refetch}
      />
    );
  }

  return (
    <section className="py-20 bg-amber-50" id="mobile-homes">
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
              
              return (
                <TabsContent key={series} value={series}>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {seriesHomes.length > 0 ? (
                      seriesHomes.map((home) => {
                        const homeImageList = getHomeImages(home.id);
                        const isInCart = cartItems.some(item => item.mobileHome.id === home.id);
                        
                        return (
                          <MobileHomeCard
                            key={home.id}
                            home={home}
                            homeImages={homeImageList}
                            isInCart={isInCart}
                            user={user}
                            onAddToCart={handleAddToCart}
                          />
                        );
                      })
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
