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
      
      const { data, error } = await (supabase as any)
        .rpc('get_public_mobile_homes');
      
      if (error) {
        console.error('Error fetching mobile homes:', error);
        throw error;
      }
      
      const list = (data as any[]) || [];
      logger.log('Mobile homes fetched:', list.length);
      
      return list as MobileHome[];
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

  const renderHomeCard = (home: MobileHome, index: number) => {
    const homeImageList = getHomeImages(home.id);
    const isInCart = cartItems.some(item => item.mobileHome.id === home.id);
    const homeFeatures = getHomeFeatures(home.features);
    
    return (
      <Card key={home.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <CardTitle 
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => window.open(`/home/${home.id}`, '_blank')}
            >
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
          
          {/* Pricing Display Logic - Always show retail price for logged in users */}
          {user ? (
            // Logged in users always see retail price when available
            <div className="mt-2 space-y-1">
              {home.retail_price && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Retail Price</p>
                  <span className="text-lg text-gray-400 line-through">
                    {formatPrice(home.retail_price)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm text-green-600 font-medium">Your Price</p>
                 {!pricingLoading ? (
                   <>
                     <span className="text-2xl font-bold text-green-600">
                       {formatPrice(getHomePrice(home.id))}
                     </span>
                     {home.retail_price && (
                       <p className="text-sm text-green-600 font-medium mt-1">
                         You Save: {formatPrice(home.retail_price - getHomePrice(home.id))}
                       </p>
                     )}
                  </>
                ) : (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span className="text-sm text-gray-500 italic">Calculating...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Non-logged in users see retail price or login prompt
            home.retail_price ? (
              <div className="mt-2">
                <p className="text-sm text-blue-600 mb-1">Starting at:</p>
                <span className="text-2xl font-bold text-blue-600">{formatPrice(home.retail_price)}</span>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="text-blue-600 font-medium cursor-pointer hover:underline" onClick={() => navigate('/auth')}>Login to see your price</span>
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

          {/* Specifications Grid - Mobile Optimized */}
          <div className="space-y-3 sm:space-y-4">
            {/* Top row - Square footage and dimensions on mobile stack */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-1 text-gray-600 mb-2">
                  <Maximize className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Square Footage</span>
                </div>
                <span className="font-bold text-lg text-gray-900">{home.square_footage || 'N/A'} sq ft</span>
              </div>
              
              <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-1 text-gray-600 mb-2">
                  <Ruler className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Dimensions</span>
                </div>
                <span className="font-bold text-lg text-gray-900">
                  {home.length_feet && home.width_feet 
                    ? `${home.width_feet}' × ${home.length_feet}'` 
                    : 'N/A'}
                </span>
              </div>
            </div>
            
            {/* Bottom row - Bedrooms and bathrooms */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-center space-x-2 p-3 bg-blue-50 rounded-lg">
                <Bed className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <div className="text-center">
                  <span className="text-xs text-gray-600 block">Bedrooms</span>
                  <span className="font-bold text-gray-900">{home.bedrooms || 'N/A'}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-center space-x-2 p-3 bg-blue-50 rounded-lg">
                <Bath className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <div className="text-center">
                  <span className="text-xs text-gray-600 block">Bathrooms</span>
                  <span className="font-bold text-gray-900">{home.bathrooms || 'N/A'}</span>
                </div>
              </div>
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


          {/* Action Buttons */}
          <div className="space-y-2 relative z-20">
            {/* Wishlist Button - Always visible */}
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist(home);
              }}
              variant="outline"
              className={`w-full flex items-center gap-2 ${
                isInWishlist(home.id) 
                  ? 'text-red-500 border-red-200 hover:border-red-300' 
                  : 'hover:text-red-500'
              }`}
            >
              <Heart className={`h-4 w-4 ${isInWishlist(home.id) ? 'fill-current' : ''}`} />
              {isInWishlist(home.id) ? 'Saved to Wishlist' : 'Add to Wishlist'}
            </Button>

            {/* Compare Button - Always visible */}
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                addToComparison(home);
              }}
              variant="outline"
              className="w-full flex items-center gap-2"
              disabled={isInComparison(home.id)}
            >
              <Scale className="h-4 w-4" />
              {isInComparison(home.id) ? 'Added to Compare' : 'Compare'}
            </Button>

            {/* Quick View Button */}
            <MobileHomeQuickView
              home={home}
              images={homeImageList.map(img => ({
                ...img,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }))}
              userPrice={user && !pricingLoading ? getHomePrice(home.id) : undefined}
              onAddToCart={user ? handleAddToCart : undefined}
              onToggleWishlist={toggleWishlist}
              isInWishlist={isInWishlist(home.id)}
            >
              <Button
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Quick View
              </Button>
            </MobileHomeQuickView>

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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate('/auth');
                }}
                className="w-full"
                variant="outline"
                type="button"
              >
                Login to Add to Cart
              </Button>
            )}
          </div>
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
    <section className="py-20 bg-amber-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-16">
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
            Our Mobile Home Models
          </h3>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            Explore our premium collection of mobile homes featuring modern designs, 
            quality construction, and thoughtful amenities for comfortable living.
            {!user && (
              <span className="block mt-2 text-blue-600 font-medium text-sm sm:text-base">
                Login to view your personalized pricing and add items to your cart.
              </span>
            )}
          </p>
        </div>

        {/* Saved Searches - Only show when user has saved homes */}
        {wishlistCount > 0 && (
          <SavedSearches
            currentFilters={filters}
            currentSearchQuery={filters.searchQuery}
            onApplySearch={handleApplySearch}
            resultCount={filteredHomes.length}
          />
        )}

        {/* Enhanced Search & Filtering */}
        {isLoading ? (
          <FiltersSkeleton />
        ) : (
          <MobileHomeFilters
            homes={mobileHomes}
            filters={filters}
            onFiltersChange={setFilters}
            isCollapsed={isFiltersCollapsed}
            onToggleCollapse={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
            showSearch={true}
            searchResultCount={isSearchActive ? filteredHomes.length : undefined}
          />
        )}
        
        {/* Search Results Header - Only show when search is active */}
        {isSearchActive && !isLoading && (
          <SearchResultsHeader
            searchQuery={debouncedSearchQuery}
            resultCount={filteredHomes.length}
            totalCount={mobileHomes.length}
            onClearSearch={clearSearch}
            hasActiveFilters={hasActiveFilters}
            onToggleFilters={() => setIsFiltersCollapsed(!isFiltersCollapsed)}
          />
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-6">
            <TabsSkeleton />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8">
              <MobileHomeCardSkeleton count={6} />
            </div>
          </div>
        ) : (
          <>
            {/* No Results State */}
            {filteredHomes.length === 0 ? (
              isSearchActive ? (
                <NoResultsState
                  searchQuery={debouncedSearchQuery}
                  onClearSearch={clearSearch}
                  onClearFilters={hasActiveFilters ? clearAllFilters : undefined}
                  hasActiveFilters={hasActiveFilters}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-base sm:text-lg text-gray-600">No mobile homes available for the selected filters.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Try adjusting your filter settings above.
                  </p>
                </div>
              )
            ) : uniqueSeries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-base sm:text-lg text-gray-600">No mobile homes available for the selected series.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Try selecting a different series above.
                </p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="flex justify-center mb-6 sm:mb-8">
                  <div className="w-full max-w-4xl">
                    {/* Mobile: Horizontal scroll */}
                    <div className="flex sm:hidden overflow-x-auto pb-2 gap-2">
                      {uniqueSeries.map((series) => {
                        const seriesHomes = filteredHomes.filter(home => home.series === series);
                        return (
                          <button
                            key={series}
                            onClick={() => setActiveTab(series)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap touch-manipulation ${
                              activeTab === series
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 bg-white border border-gray-200'
                            }`}
                          >
                            {series} ({seriesHomes.length})
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Desktop: Centered buttons */}
                    <div className="hidden sm:inline-flex rounded-lg border border-gray-200 bg-white p-1 w-full justify-center">
                      {uniqueSeries.map((series) => {
                        const seriesHomes = filteredHomes.filter(home => home.series === series);
                        return (
                          <button
                            key={series}
                            onClick={() => setActiveTab(series)}
                            className={`px-4 lg:px-6 py-2 lg:py-3 rounded-md text-sm lg:text-base font-medium transition-colors touch-manipulation ${
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
                </div>

                {uniqueSeries.map((series) => {
                  const seriesHomes = filteredHomes.filter(home => home.series === series);
                  console.log(`Rendering ${series} series with ${seriesHomes.length} homes:`, seriesHomes);
                  
                  return (
                    <TabsContent key={series} value={series} className="mt-0">
                      <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {seriesHomes.length > 0 ? (
                          seriesHomes.map((home, index) => renderHomeCard(home, index))
                        ) : (
                          <div className="col-span-full text-center py-8">
                            <p className="text-gray-500 text-sm sm:text-base">No {series} series models available for the selected width category.</p>
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
