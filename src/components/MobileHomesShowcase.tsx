import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Bed, Bath, Maximize, Ruler, Scale, Heart, Eye } from 'lucide-react';
import { MobileHomeImageCarousel } from './MobileHomeImageCarousel';
import { OptimizedImage } from './OptimizedImage';
import { MobileHomeServicesDialog } from './MobileHomeServicesDialog';
import { ShoppingCart } from './ShoppingCart';
import { MobileHomeFilters, FilterState } from './MobileHomeFilters';
import { HomeComparisonModal } from './HomeComparisonModal';
import { ComparisonBar } from './ComparisonBar';
import { WishlistModal } from './WishlistModal';
import { SavedSearches } from './search/SavedSearches';
import { MobileHomeQuickView } from './MobileHomeQuickView';
import { SearchResultsHeader } from './search/SearchResultsHeader';
import { NoResultsState } from './search/NoResultsState';
import { useSearchDebounce } from '@/hooks/useSearchDebounce';
import { MobileHomeCardSkeleton } from './loading/MobileHomeCardSkeleton';
import { FiltersSkeleton } from './loading/FiltersSkeleton';
import { TabsSkeleton } from './loading/TabsSkeleton';
import { LoadingSpinner } from './loading/LoadingSpinner';
import { OptimizedMobileHomeCard } from './optimized/OptimizedMobileHomeCard';
import { VirtualizedMobileHomesGrid } from './optimized/VirtualizedMobileHomesGrid';
import { useMemoizedPricing } from '@/hooks/useMemoizedPricing';
import { useHomeComparison } from '@/hooks/useHomeComparison';
import { useWishlist } from '@/hooks/useWishlist';
import { CartItem, DeliveryAddress } from '@/hooks/useShoppingCart';
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
  deliveryAddress: DeliveryAddress | null;
  isCartOpen: boolean;
  addToCart: (home: MobileHome, selectedServices: string[], selectedHomeOptions: { option: HomeOption; quantity: number }[]) => void;
  removeFromCart: (itemId: string) => void;
  updateServices: (homeId: string, selectedServices: string[]) => void;
  updateHomeOptions: (homeId: string, selectedHomeOptions: { option: HomeOption; quantity: number }[]) => void;
  updateDeliveryAddress: (address: DeliveryAddress | null) => void;
  clearCart: () => void;
  setIsCartOpen: (open: boolean) => void;
}

export const MobileHomesShowcase = ({ 
  user = null, 
  cartItems,
  deliveryAddress,
  isCartOpen,
  addToCart,
  removeFromCart,
  updateServices,
  updateHomeOptions,
  updateDeliveryAddress,
  clearCart,
  setIsCartOpen
}: MobileHomesShowcaseProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('');
  const [selectedHomeForServices, setSelectedHomeForServices] = useState<MobileHome | null>(null);
  const [isFiltersCollapsed, setIsFiltersCollapsed] = useState(true);
  const { trackMobileHomeView, trackEvent } = useAnalytics();
  
  // Initialize home comparison functionality
  const {
    comparedHomes,
    isComparisonOpen,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    openComparison,
    closeComparison,
    comparisonCount
  } = useHomeComparison();

  // Initialize wishlist functionality
  const {
    wishlistItems,
    isLoading: wishlistLoading,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
    toggleWishlist,
    wishlistCount
  } = useWishlist(user);

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  
  logger.debug('MobileHomesShowcase render - cart items from props:', cartItems.length);
  logger.debug('MobileHomesShowcase - selectedHomeForServices:', selectedHomeForServices?.id);

  const { data: mobileHomes = [], isLoading } = useQuery({
    queryKey: ['public-mobile-homes'],
    queryFn: async () => {
      
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
      
      logger.log('Mobile homes fetched:', data?.length || 0);
      
      return data as MobileHome[];
    },
    staleTime: 3 * 60 * 1000, // Cache for 3 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
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
      return data as MobileHomeImage[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false
  });

  // Initialize memoized pricing for better performance
  const { getHomePrice, pricingLoading, calculateMobileHomePrice } = useMemoizedPricing(user, mobileHomes);

  // Initialize comprehensive filters
  const [filters, setFilters] = useState<FilterState>(() => {
    // Use safe default values initially
    return {
      searchQuery: '',
      priceRange: [0, 200000] as [number, number],
      squareFootageRange: [400, 2000] as [number, number],
      bedrooms: [],
      bathrooms: [],
      manufacturers: [],
      features: [],
      widthType: 'all'
    };
  });

  // Update filter ranges when home data changes
  React.useEffect(() => {
    if (mobileHomes && mobileHomes.length > 0) {
      const prices = mobileHomes.map(h => h.price).filter(Boolean);
      const sqft = mobileHomes.map(h => h.square_footage).filter(Boolean);
      
      setFilters(prev => ({
        ...prev,
        priceRange: prev.priceRange[0] === 0 && prev.priceRange[1] === 200000 
          ? (prices.length > 0 ? [Math.min(...prices), Math.max(...prices)] as [number, number] : [0, 200000] as [number, number])
          : prev.priceRange,
        squareFootageRange: prev.squareFootageRange[0] === 400 && prev.squareFootageRange[1] === 2000
          ? (sqft.length > 0 ? [Math.min(...sqft), Math.max(...sqft)] as [number, number] : [400, 2000] as [number, number])
          : prev.squareFootageRange
      }));
    }
  }, [mobileHomes]);

  // Helper functions - defined before use to avoid temporal dead zone
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

  // Debounced search query for performance
  const debouncedSearchQuery = useSearchDebounce(filters.searchQuery, 300);

  // Comprehensive filtering and search logic
  const getFilteredHomes = (homes: MobileHome[]) => {
    if (!homes || !Array.isArray(homes)) return [];
    return homes.filter(home => {
      // Search filter - check all text content
      if (debouncedSearchQuery.trim() !== '') {
        const searchTerm = debouncedSearchQuery.toLowerCase();
        const homeName = getHomeName(home).toLowerCase();
        const manufacturer = home.manufacturer.toLowerCase();
        const model = home.model.toLowerCase();
        const series = home.series.toLowerCase();
        const description = (home.description || '').toLowerCase();
        const features = getHomeFeatures(home.features).join(' ').toLowerCase();
        
        const searchableText = `${homeName} ${manufacturer} ${model} ${series} ${description} ${features}`;
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      
      // Width filter
      if (filters.widthType === 'single' && (home.width_feet && home.width_feet > 18)) return false;
      if (filters.widthType === 'double' && (!home.width_feet || home.width_feet <= 18)) return false;
      
      // Price range filter
      if (home.price && (home.price < filters.priceRange[0] || home.price > filters.priceRange[1])) return false;
      
      // Square footage filter
      if (home.square_footage && (home.square_footage < filters.squareFootageRange[0] || home.square_footage > filters.squareFootageRange[1])) return false;
      
      // Bedrooms filter
      if (filters.bedrooms.length > 0 && (!home.bedrooms || !filters.bedrooms.includes(home.bedrooms.toString()))) return false;
      
      // Bathrooms filter
      if (filters.bathrooms.length > 0 && (!home.bathrooms || !filters.bathrooms.includes(home.bathrooms.toString()))) return false;
      
      // Manufacturer filter
      if (filters.manufacturers.length > 0 && !filters.manufacturers.includes(home.manufacturer)) return false;
      
      // Features filter
      if (filters.features.length > 0) {
        const homeFeatures = getHomeFeatures(home.features);
        const hasRequiredFeatures = filters.features.every(feature => homeFeatures.includes(feature));
        if (!hasRequiredFeatures) return false;
      }
      
      return true;
    });
  };

  const filteredHomes = getFilteredHomes(mobileHomes);

  // Check if search is active
  const isSearchActive = debouncedSearchQuery.trim() !== '';
  
  // Check if any filters are active (excluding search)
  const hasActiveFilters = 
    filters.priceRange[0] !== 0 || filters.priceRange[1] !== 200000 ||
    filters.squareFootageRange[0] !== 400 || filters.squareFootageRange[1] !== 2000 ||
    filters.bedrooms.length > 0 ||
    filters.bathrooms.length > 0 ||
    filters.manufacturers.length > 0 ||
    filters.features.length > 0 ||
    filters.widthType !== 'all';

  // Clear search function
  const clearSearch = () => {
    setFilters(prev => ({ ...prev, searchQuery: '' }));
  };

  // Clear all filters function
  const clearAllFilters = () => {
    const prices = mobileHomes.map(h => h.price).filter(Boolean);
    const sqft = mobileHomes.map(h => h.square_footage).filter(Boolean);
    
    setFilters({
      searchQuery: '',
      priceRange: prices.length > 0 ? [Math.min(...prices), Math.max(...prices)] as [number, number] : [0, 200000] as [number, number],
      squareFootageRange: sqft.length > 0 ? [Math.min(...sqft), Math.max(...sqft)] as [number, number] : [400, 2000] as [number, number],
      bedrooms: [],
      bathrooms: [],
      manufacturers: [],
      features: [],
      widthType: 'all'
    });
  };

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

  const handleApplySearch = useCallback((searchQuery: string, newFilters: FilterState) => {
    setFilters({ ...newFilters, searchQuery });
  }, []);

  // Optimize rendering with OptimizedMobileHomeCard or virtualization
  const renderOptimizedHomeCard = useCallback((home: MobileHome, index: number) => {
    const homeImageList = getHomeImages(home.id);
    const isInCart = cartItems.some(item => item.mobileHome.id === home.id);
    
    return (
      <OptimizedMobileHomeCard
        key={home.id}
        home={home}
        images={homeImageList}
        user={user}
        homePrice={user && !pricingLoading ? getHomePrice(home.id) : 0}
        isInCart={isInCart}
        isInComparison={isInComparison(home.id)}
        isInWishlist={isInWishlist(home.id)}
        onAddToCart={user ? handleAddToCart : () => {}}
        onViewDetails={(homeId) => window.open(`/home/${homeId}`, '_blank')}
        onQuickView={() => {}}
        onAddToComparison={() => addToComparison(home)}
        onRemoveFromComparison={() => removeFromComparison(home.id)}
        onAddToWishlist={() => addToWishlist(home)}
        onRemoveFromWishlist={() => removeFromWishlist(home.id)}
        pricingLoading={pricingLoading}
      />
    );
  }, [
    homeImages, cartItems, user, pricingLoading, getHomePrice, 
    isInComparison, isInWishlist, handleAddToCart, addToComparison, removeFromComparison,
    addToWishlist, removeFromWishlist
  ]);

  console.log('Render state:', { 
    isLoading, 
    imagesLoading, 
    pricingLoading,
    homeCount: mobileHomes.length, 
    imageCount: homeImages.length,
    uniqueSeries,
    activeTab,
    cartItemsCount: cartItems.length,
    filtersActive: filters.widthType !== 'all' || filters.bedrooms.length > 0 || filters.manufacturers.length > 0,
    filteredHomesCount: filteredHomes.length
  });

  // Track home clicks
  const handleHomeClick = (home: any) => {
    trackMobileHomeView({
      mobileHomeId: home.id,
      viewType: 'list',
    });
    
    trackEvent({
      eventType: 'interaction',
      eventName: 'mobile_home_click',
      elementId: `mobile-home-${home.id}`,
      properties: { manufacturer: home.manufacturer, model: home.model },
    });
  };

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
    <section className="py-fluid-lg sm:py-fluid-xl bg-amber-50 mobile-optimized">
      <div className="container mx-auto mobile-container">
        {/* Mobile-optimized header */}
        <div className="text-center mb-fluid-md sm:mb-fluid-lg">
          <h3 className="text-fluid-2xl sm:text-fluid-3xl font-bold text-gray-900 mb-fluid-sm leading-tight">
            Our Mobile Home Models
          </h3>
          <p className="text-fluid-sm sm:text-fluid-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Explore our premium collection of mobile homes featuring modern designs, 
            quality construction, and thoughtful amenities for comfortable living.
            {!user && (
              <span className="block mt-fluid-xs text-blue-600 font-medium">
                Login to view your personalized pricing and add items to your cart.
              </span>
            )}
          </p>
        </div>

        {/* Saved Searches - Mobile optimized */}
        {wishlistCount > 0 && (
          <div className="mb-fluid-md">
            <SavedSearches
              currentFilters={filters}
              currentSearchQuery={filters.searchQuery}
              onApplySearch={handleApplySearch}
              resultCount={filteredHomes.length}
            />
          </div>
        )}

        {/* Enhanced Mobile-First Search & Filtering */}
        {isLoading ? (
          <FiltersSkeleton />
        ) : (
          <div className="mb-fluid-md">
            <MobileHomeFilters
              homes={mobileHomes}
              filters={filters}
              onFiltersChange={setFilters}
              isCollapsed={isFiltersCollapsed}
              onToggleCollapse={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
              showSearch={true}
              searchResultCount={isSearchActive ? filteredHomes.length : undefined}
            />
          </div>
        )}
        
        {/* Search Results Header - Mobile optimized */}
        {isSearchActive && !isLoading && (
          <div className="mb-fluid-sm">
            <SearchResultsHeader
              searchQuery={debouncedSearchQuery}
              resultCount={filteredHomes.length}
              totalCount={mobileHomes.length}
              onClearSearch={clearSearch}
              hasActiveFilters={hasActiveFilters}
              onToggleFilters={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
            />
          </div>
        )}

        {/* Loading State - Mobile optimized */}
        {isLoading ? (
          <div className="space-y-fluid-md">
            <TabsSkeleton />
            <div className="mobile-grid-1 sm:mobile-grid-2 lg:mobile-grid-3 xl:mobile-grid-4 gap-fluid-sm sm:gap-fluid-md">
              <MobileHomeCardSkeleton count={6} />
            </div>
          </div>
        ) : (
          <>
            {/* No Results State - Mobile friendly */}
            {filteredHomes.length === 0 ? (
              isSearchActive ? (
                <NoResultsState
                  searchQuery={debouncedSearchQuery}
                  onClearSearch={clearSearch}
                  onClearFilters={hasActiveFilters ? clearAllFilters : undefined}
                  hasActiveFilters={hasActiveFilters}
                />
              ) : (
                <div className="text-center py-fluid-lg">
                  <p className="text-fluid-base text-gray-600">No mobile homes available for the selected filters.</p>
                  <p className="text-fluid-sm text-gray-500 mt-fluid-xs">
                    Try adjusting your filter settings above.
                  </p>
                </div>
              )
            ) : uniqueSeries.length === 0 ? (
              <div className="text-center py-fluid-lg">
                <p className="text-fluid-base text-gray-600">No mobile homes available for the selected series.</p>
                <p className="text-fluid-sm text-gray-500 mt-fluid-xs">
                  Try selecting a different series above.
                </p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-center mb-fluid-sm sm:mb-fluid-md">
                  <div className="w-full max-w-4xl">
                    {/* Mobile: Enhanced horizontal scroll with better spacing */}
                    <div className="flex sm:hidden overflow-x-auto pb-fluid-xs space-fluid-xs mobile-scroll">
                      {uniqueSeries.map((series) => {
                        const seriesHomes = filteredHomes.filter(home => home.series === series);
                        return (
                          <button
                            key={series}
                            onClick={() => setActiveTab(series)}
                            className={`mobile-button text-fluid-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                              activeTab === series
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 bg-white border border-gray-200 shadow-sm'
                            }`}
                          >
                            {series} ({seriesHomes.length})
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Desktop: Enhanced centered buttons */}
                    <div className="hidden sm:inline-flex rounded-xl border border-gray-200 bg-white p-1 w-full justify-center shadow-sm">
                      {uniqueSeries.map((series) => {
                        const seriesHomes = filteredHomes.filter(home => home.series === series);
                        return (
                          <button
                            key={series}
                            onClick={() => setActiveTab(series)}
                            className={`px-fluid-sm lg:px-fluid-md py-fluid-xs lg:py-fluid-sm rounded-lg text-fluid-sm lg:text-fluid-base font-medium transition-all duration-200 touch-manipulation ${
                              activeTab === series
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                            }`}
                          >
                            {series} Series ({seriesHomes.length})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {uniqueSeries.map((series) => {
                  const seriesHomes = filteredHomes.filter(home => home.series === series);
                  console.log(`Rendering ${series} series with ${seriesHomes.length} homes:`, seriesHomes);
                  
                  return (
                    <TabsContent key={series} value={series} className="mt-0">
                      {/* Mobile-optimized grid with better spacing */}
                      <div className="mobile-grid-1 sm:mobile-grid-2 lg:mobile-grid-3 xl:mobile-grid-4 gap-fluid-sm sm:gap-fluid-md lg:gap-fluid-lg">
                         {seriesHomes.length > 0 ? (
                            seriesHomes.length > 50 ? (
                             <VirtualizedMobileHomesGrid
                               homes={seriesHomes}
                               homeImages={homeImages}
                               user={user}
                               cartItems={cartItems}
                               pricingLoading={pricingLoading}
                               getHomePrice={getHomePrice}
                               isInComparison={isInComparison}
                               isInWishlist={isInWishlist}
                               onAddToCart={user ? handleAddToCart : () => {}}
                               onViewDetails={(homeId) => window.open(`/home/${homeId}`, '_blank')}
                               onQuickView={() => {}}
                               onAddToComparison={addToComparison}
                               onRemoveFromComparison={removeFromComparison}
                               onAddToWishlist={addToWishlist}
                               onRemoveFromWishlist={removeFromWishlist}
                             />
                           ) : (
                             seriesHomes.map((home, index) => renderOptimizedHomeCard(home, index))
                           )
                         ) : (
                          <div className="col-span-full text-center py-fluid-lg">
                            <p className="text-gray-500 text-fluid-sm sm:text-fluid-base">No {series} series models available for the selected width category.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </>
        )}

        {/* Shopping Cart - Only show for logged in users */}
        {user && (
          <>
            <ShoppingCart
              isOpen={isCartOpen}
              onClose={() => setIsCartOpen(false)}
              cartItems={cartItems}
              deliveryAddress={deliveryAddress}
              onRemoveItem={removeFromCart}
              onUpdateServices={updateServices}
              onUpdateHomeOptions={updateHomeOptions}
              onUpdateDeliveryAddress={updateDeliveryAddress}
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
        {/* Home Comparison Components */}
        <ComparisonBar
          homes={comparedHomes}
          onRemoveHome={removeFromComparison}
          onViewComparison={openComparison}
          onClearAll={clearComparison}
        />

        <HomeComparisonModal
          isOpen={isComparisonOpen}
          onClose={closeComparison}
          homes={comparedHomes}
          onRemoveHome={removeFromComparison}
          onClearAll={clearComparison}
          homeImages={homeImages}
          user={user}
        />

        {/* Wishlist Components */}
        <WishlistModal
          isOpen={isWishlistOpen}
          onClose={() => setIsWishlistOpen(false)}
          homes={wishlistItems}
          onRemoveHome={removeFromWishlist}
          onClearAll={clearWishlist}
          homeImages={homeImages}
          onAddToCart={handleAddToCart}
          onAddToComparison={addToComparison}
          isInComparison={isInComparison}
        />

        {/* Floating Wishlist Button */}
        {wishlistCount > 0 && (
          <Button
            onClick={() => setIsWishlistOpen(true)}
            className="fixed bottom-20 sm:bottom-4 right-4 z-40 rounded-full shadow-lg bg-red-500 hover:bg-red-600 text-white touch-manipulation"
            size="lg"
          >
            <Heart className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 fill-current" />
            <span className="text-xs sm:text-sm">Wishlist ({wishlistCount})</span>
          </Button>
        )}
      </div>
    </section>
  );
}
