import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Bed, Bath, Maximize, Heart, Eye, Scale } from 'lucide-react';
import { MobileHomeImageCarousel } from './MobileHomeImageCarousel';
import { MobileHomeServicesDialog } from './MobileHomeServicesDialog';
import { ShoppingCart } from './ShoppingCart';
import { ComparisonBar } from './ComparisonBar';
import { HomeComparisonModal } from './HomeComparisonModal';
import { WishlistModal } from './WishlistModal';
import { MobileHomeFilters, FilterState } from './MobileHomeFilters';
import { useOptimizedMemoizedPricing } from '@/hooks/useOptimizedMemoizedPricing';
import { useSearchDebounce } from '@/hooks/useSearchDebounce';
import { useHomeComparison } from '@/hooks/useHomeComparison';
import { useSessionAwareWishlist } from '@/hooks/useSessionAwareWishlist';
import { LoadingSpinner } from './loading/LoadingSpinner';
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

interface EnhancedOptimizedMobileHomesShowcaseProps {
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

// Enhanced home card with comparison and wishlist features
const EnhancedMobileHomeCard = React.memo(({ 
  home, 
  images, 
  isInCart, 
  user, 
  price, 
  pricingLoading, 
  onAddToCart, 
  onViewDetails,
  onAddToComparison,
  onToggleWishlist,
  isInComparison,
  isInWishlist
}: {
  home: MobileHome;
  images: MobileHomeImage[];
  isInCart: boolean;
  user: User | null;
  price: number;
  pricingLoading: boolean;
  onAddToCart: (home: MobileHome) => void;
  onViewDetails: (homeId: string) => void;
  onAddToComparison: (home: MobileHome) => void;
  onToggleWishlist: (home: MobileHome) => void;
  isInComparison: boolean;
  isInWishlist: boolean;
}) => {
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

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group scroll-item">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle 
            className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => onViewDetails(home.id)}
          >
            {homeName}
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
        
        {/* Optimized Pricing Display */}
        {user ? (
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
                    {formatPrice(price)}
                  </span>
                  {home.retail_price && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      You Save: {formatPrice(home.retail_price - price)}
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
          home.retail_price ? (
            <div className="mt-2">
              <p className="text-sm text-blue-600 mb-1">Starting at:</p>
              <span className="text-2xl font-bold text-blue-600">{formatPrice(home.retail_price)}</span>
              <p className="text-sm text-gray-500 mt-1">
                <span className="text-blue-600 font-medium cursor-pointer hover:underline" 
                      onClick={() => navigate('/auth')}>
                  Login to see your price
                </span>
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
          images={images} 
          homeModel={homeName}
        />

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-1 text-gray-600 mb-2">
              <Maximize className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Size</span>
            </div>
            <span className="font-bold text-lg text-gray-900">
              {home.square_footage || 'N/A'} sq ft
            </span>
          </div>
          
          <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-1 text-gray-600 mb-2">
              <Home className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Dimensions</span>
            </div>
            <span className="font-bold text-lg text-gray-900">
              {home.width_feet && home.length_feet 
                ? `${home.width_feet}' × ${home.length_feet}'` 
                : 'N/A'}
            </span>
          </div>
          
          <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-1 text-gray-600 mb-2">
              <Bed className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Bedrooms</span>
            </div>
            <span className="font-bold text-lg text-gray-900">{home.bedrooms || 'N/A'}</span>
          </div>
          
          <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-1 text-gray-600 mb-2">
              <Bath className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Bathrooms</span>
            </div>
            <span className="font-bold text-lg text-gray-900">{home.bathrooms || 'N/A'}</span>
          </div>
        </div>

        {/* Features */}
        {homeFeatures.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Features</h4>
            <div className="flex flex-wrap gap-2">
              {homeFeatures.slice(0, 6).map((feature, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {homeFeatures.length > 6 && (
                <Badge variant="outline" className="text-xs">
                  +{homeFeatures.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Action Buttons with Wishlist and Compare */}
        <div className="space-y-2">
          {/* Top row: Wishlist and Compare */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleWishlist(home)}
              className={`flex items-center gap-1 ${isInWishlist ? 'text-red-500 border-red-200' : ''}`}
            >
              <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
              {isInWishlist ? 'Saved' : 'Save'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddToComparison(home)}
              disabled={isInComparison}
              className="flex items-center gap-1"
            >
              <Scale className="h-4 w-4" />
              {isInComparison ? 'Added' : 'Compare'}
            </Button>
          </div>

          {/* Bottom row: View Details and Add to Cart */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(home.id)}
              className="flex items-center gap-1"
            >
              <Eye className="h-4 w-4" />
              View Details
            </Button>
            
            {user ? (
              <Button
                size="sm"
                onClick={() => onAddToCart(home)}
                disabled={isInCart}
                className="flex items-center gap-1"
              >
                <Home className="h-4 w-4" />
                {isInCart ? 'In Cart' : 'Add to Cart'}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => navigate('/auth')}
                className="flex items-center gap-1"
              >
                <Home className="h-4 w-4" />
                Login to Add
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

EnhancedMobileHomeCard.displayName = 'EnhancedMobileHomeCard';

export const EnhancedOptimizedMobileHomesShowcase = React.memo(({ 
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
}: EnhancedOptimizedMobileHomesShowcaseProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('');
  const [selectedHomeForServices, setSelectedHomeForServices] = useState<MobileHome | null>(null);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    priceRange: [0, 200000] as [number, number],
    squareFootageRange: [400, 2000] as [number, number],
    bedrooms: [],
    bathrooms: [],
    manufacturers: [],
    features: [],
    widthType: 'all'
  });

  // Comparison and wishlist hooks
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

  const {
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    clearWishlist,
    isInWishlist,
    toggleWishlist,
    wishlistCount
  } = useSessionAwareWishlist();

  // Optimized data fetching with extended caching
  const { data: mobileHomes = [], isLoading } = useQuery({
    queryKey: ['optimized-mobile-homes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as MobileHome[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false
  });

  const { data: homeImages = [] } = useQuery({
    queryKey: ['optimized-home-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_home_images')
        .select('*')
        .order('mobile_home_id')
        .order('display_order');
      
      if (error) throw error;
      return data as MobileHomeImage[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    refetchOnWindowFocus: false
  });

  // Optimized pricing with aggressive caching
  const { getHomePrice, pricingLoading } = useOptimizedMemoizedPricing(user, mobileHomes);

  // Debounced search for better performance
  const debouncedSearchQuery = useSearchDebounce(filters.searchQuery, 500);

  // Memoized filtering logic
  const filteredHomes = useMemo(() => {
    return mobileHomes.filter(home => {
      if (debouncedSearchQuery.trim() !== '') {
        const searchTerm = debouncedSearchQuery.toLowerCase();
        const searchableText = `${home.display_name || ''} ${home.manufacturer} ${home.model} ${home.series} ${home.description || ''}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) return false;
      }
      
      if (filters.widthType === 'single' && (home.width_feet && home.width_feet > 18)) return false;
      if (filters.widthType === 'double' && (!home.width_feet || home.width_feet <= 18)) return false;
      if (home.price && (home.price < filters.priceRange[0] || home.price > filters.priceRange[1])) return false;
      if (home.square_footage && (home.square_footage < filters.squareFootageRange[0] || home.square_footage > filters.squareFootageRange[1])) return false;
      if (filters.bedrooms.length > 0 && (!home.bedrooms || !filters.bedrooms.includes(home.bedrooms.toString()))) return false;
      if (filters.bathrooms.length > 0 && (!home.bathrooms || !filters.bathrooms.includes(home.bathrooms.toString()))) return false;
      if (filters.manufacturers.length > 0 && !filters.manufacturers.includes(home.manufacturer)) return false;
      
      return true;
    });
  }, [mobileHomes, debouncedSearchQuery, filters]);

  // Series lists derived from all active homes (always show all series)
  const ALL_TAB = 'All';
  const normalizeSeries = useCallback((s?: string | null) => (s?.trim() || 'Uncategorized'), []);
  const allSeries = useMemo(() => {
    const set = new Set<string>(mobileHomes.map(h => normalizeSeries(h.series)));
    return Array.from(set).sort((a, b) => {
      if (a === 'Tru') return -1;
      if (b === 'Tru') return 1;
      return a.localeCompare(b);
    });
  }, [mobileHomes, normalizeSeries]);

  // Counts for filtered results per series
  const seriesCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredHomes.forEach(h => {
      const s = normalizeSeries(h.series);
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [filteredHomes, normalizeSeries]);

  // Set default tab to 'All' once
  React.useEffect(() => {
    if (!activeTab) {
      setActiveTab(ALL_TAB);
    }
  }, [activeTab]);

  // Memoized image lookup
  const getHomeImages = useCallback((homeId: string) => {
    return homeImages.filter(image => image.mobile_home_id === homeId);
  }, [homeImages]);

  // Event handlers
  const handleAddToCart = useCallback((home: MobileHome) => {
    setSelectedHomeForServices(home);
  }, []);

  const handleAddToCartWithServices = useCallback((home: MobileHome, selectedServices: string[], selectedHomeOptions: { option: HomeOption; quantity: number }[] = []) => {
    addToCart(home, selectedServices, selectedHomeOptions);
    setSelectedHomeForServices(null);
  }, [addToCart]);

  const handleViewDetails = useCallback((homeId: string) => {
    window.open(`/home/${homeId}`, '_blank');
  }, []);

  const handleAddToComparison = useCallback((home: MobileHome) => {
    addToComparison(home);
  }, [addToComparison]);

  const handleToggleWishlist = useCallback((home: MobileHome) => {
    toggleWishlist(home);
  }, [toggleWishlist]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading mobile homes..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileHomeFilters
        filters={filters}
        onFiltersChange={setFilters}
        homes={mobileHomes}
        isCollapsed={true}
        onToggleCollapse={() => {}}
      />

      {/* Quick Action Bar */}
      <div className="flex items-center justify-center">
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => setIsWishlistOpen(true)}
            className="flex items-center gap-2"
          >
            <Heart className="h-4 w-4" />
            Wishlist ({wishlistCount})
          </Button>
          
          {comparisonCount > 0 && (
            <Button
              variant="outline"
              onClick={openComparison}
              className="flex items-center gap-2"
            >
              <Scale className="h-4 w-4" />
              Compare ({comparisonCount})
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full flex-wrap gap-2 overflow-x-auto justify-center">
          <TabsTrigger key={ALL_TAB} value={ALL_TAB} className="text-sm">
            {ALL_TAB} ({filteredHomes.length})
          </TabsTrigger>
          {allSeries.map((series) => (
            <TabsTrigger key={series} value={series} className="text-sm">
              {series} ({seriesCounts[series] ?? 0})
            </TabsTrigger>
          ))}
        </TabsList>

        {[ALL_TAB, ...allSeries].map((series) => {
          const seriesHomes = series === ALL_TAB
            ? filteredHomes
            : filteredHomes.filter(home => normalizeSeries(home.series) === series);
          
          return (
            <TabsContent key={series} value={series}>
              {seriesHomes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-gray-600 mb-4">No homes match your filters in this series.</p>
                  <Button
                    variant="outline"
                    onClick={() => setFilters({
                      searchQuery: '',
                      priceRange: [0, 200000],
                      squareFootageRange: [400, 2000],
                      bedrooms: [],
                      bathrooms: [],
                      manufacturers: [],
                      features: [],
                      widthType: 'all'
                    })}
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {seriesHomes.map((home) => (
                    <EnhancedMobileHomeCard
                      key={home.id}
                      home={home}
                      images={getHomeImages(home.id)}
                      isInCart={cartItems.some(item => item.mobileHome.id === home.id)}
                      user={user}
                      price={getHomePrice(home.id)}
                      pricingLoading={pricingLoading}
                      onAddToCart={handleAddToCart}
                      onViewDetails={handleViewDetails}
                      onAddToComparison={handleAddToComparison}
                      onToggleWishlist={handleToggleWishlist}
                      isInComparison={isInComparison(home.id)}
                      isInWishlist={isInWishlist(home.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Comparison Bar */}
      {comparisonCount > 0 && (
        <ComparisonBar
          homes={comparedHomes}
          onRemoveHome={removeFromComparison}
          onViewComparison={openComparison}
          onClearAll={clearComparison}
        />
      )}

      {/* Modals */}
      {selectedHomeForServices && (
        <MobileHomeServicesDialog
          mobileHome={selectedHomeForServices}
          isOpen={!!selectedHomeForServices}
          onClose={() => setSelectedHomeForServices(null)}
          onAddToCart={handleAddToCartWithServices}
          user={user}
        />
      )}

      <HomeComparisonModal
        isOpen={isComparisonOpen}
        onClose={closeComparison}
        homes={comparedHomes}
        homeImages={homeImages}
        user={user}
        onRemoveHome={removeFromComparison}
        onClearAll={clearComparison}
      />

      <WishlistModal
        isOpen={isWishlistOpen}
        onClose={() => setIsWishlistOpen(false)}
        homes={wishlistItems}
        homeImages={homeImages}
        onRemoveHome={removeFromWishlist}
        onClearAll={clearWishlist}
        onAddToCart={handleAddToCart}
        onAddToComparison={handleAddToComparison}
        isInComparison={isInComparison}
      />

      <ShoppingCart
        cartItems={cartItems}
        deliveryAddress={deliveryAddress}
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onRemoveItem={removeFromCart}
        onUpdateServices={updateServices}
        onUpdateHomeOptions={updateHomeOptions}
        onUpdateDeliveryAddress={updateDeliveryAddress}
        onClearCart={clearCart}
        user={user}
      />
    </div>
  );
});

EnhancedOptimizedMobileHomesShowcase.displayName = 'EnhancedOptimizedMobileHomesShowcase';