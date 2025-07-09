import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Heart, 
  Scale, 
  ShoppingCart, 
  Share2,
  Home,
  Bed,
  Bath,
  Maximize,
  Ruler,
  Calendar,
  DollarSign,
  Info,
  Image as ImageIcon,
  Map
} from 'lucide-react';
import { MobileHomeImageCarousel } from '@/components/MobileHomeImageCarousel';
import { MobileHomeServicesDialog } from '@/components/MobileHomeServicesDialog';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import { MobileHomeReviews } from '@/components/reviews/MobileHomeReviews';
import { useWishlist } from '@/hooks/useWishlist';
import { useHomeComparison } from '@/hooks/useHomeComparison';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { formatPrice } from '@/lib/utils';
import { User, Session } from '@supabase/supabase-js';
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

export const MobileHomeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedHomeForServices, setSelectedHomeForServices] = useState<MobileHome | null>(null);
  
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Set up authentication listener
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setIsAuthLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);
  
  const { calculateMobileHomePrice, loading: pricingLoading } = useCustomerPricing(user);
  const { isInWishlist, toggleWishlist } = useWishlist(user);
  const { addToComparison, isInComparison } = useHomeComparison();
  const { cartItems, addToCart } = useShoppingCart(user);

  // Fetch mobile home details
  const { data: mobileHome, isLoading } = useQuery({
    queryKey: ['mobile-home-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Home ID is required');
      
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single();
      
      if (error) throw error;
      return data as MobileHome;
    },
    enabled: !!id
  });

  // Fetch home images
  const { data: homeImages = [] } = useQuery({
    queryKey: ['mobile-home-images', id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from('mobile_home_images')
        .select('*')
        .eq('mobile_home_id', id)
        .order('image_type')
        .order('display_order');
      
      if (error) throw error;
      return data as MobileHomeImage[];
    },
    enabled: !!id
  });

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

  const handleAddToCart = () => {
    if (mobileHome) {
      setSelectedHomeForServices(mobileHome);
    }
  };

  const handleAddToCartWithServices = (home: MobileHome, selectedServices: string[], selectedHomeOptions: { option: HomeOption; quantity: number }[] = []) => {
    addToCart(home, selectedServices, selectedHomeOptions);
    setSelectedHomeForServices(null);
  };

  const handleShare = async () => {
    if (navigator.share && mobileHome) {
      try {
        await navigator.share({
          title: getHomeName(mobileHome),
          text: `Check out this ${mobileHome.series} series mobile home!`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // You might want to show a toast notification here
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!mobileHome) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Home Not Found</h1>
          <p className="text-gray-600 mb-6">The mobile home you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Browse
          </Button>
        </div>
      </div>
    );
  }

  const isInCart = cartItems.some(item => item.mobileHome.id === mobileHome.id);
  const homeFeatures = getHomeFeatures(mobileHome.features);
  const exteriorImages = homeImages.filter(img => img.image_type === 'exterior');
  const interiorImages = homeImages.filter(img => img.image_type === 'interior');
  const floorPlanImages = homeImages.filter(img => img.image_type === 'floor_plan');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Browse
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleShare}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-6">
            {/* Main Image Carousel */}
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <MobileHomeImageCarousel 
                  images={homeImages} 
                  homeModel={getHomeName(mobileHome)}
                />
              </CardContent>
            </Card>

            {/* Image Categories Tabs */}
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({homeImages.length})</TabsTrigger>
                <TabsTrigger value="exterior">Exterior ({exteriorImages.length})</TabsTrigger>
                <TabsTrigger value="interior">Interior ({interiorImages.length})</TabsTrigger>
                <TabsTrigger value="floorplan">Floor Plan ({floorPlanImages.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {homeImages.map((image, index) => (
                    <OptimizedImage
                      key={image.id}
                      src={image.image_url}
                      alt={image.alt_text || `${getHomeName(mobileHome)} view ${index + 1}`}
                      aspectRatio="video"
                      className="rounded-lg hover:scale-105 transition-transform cursor-pointer"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="exterior" className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {exteriorImages.map((image, index) => (
                    <OptimizedImage
                      key={image.id}
                      src={image.image_url}
                      alt={image.alt_text || `${getHomeName(mobileHome)} exterior ${index + 1}`}
                      aspectRatio="video"
                      className="rounded-lg hover:scale-105 transition-transform cursor-pointer"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="interior" className="mt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {interiorImages.map((image, index) => (
                    <OptimizedImage
                      key={image.id}
                      src={image.image_url}
                      alt={image.alt_text || `${getHomeName(mobileHome)} interior ${index + 1}`}
                      aspectRatio="video"
                      className="rounded-lg hover:scale-105 transition-transform cursor-pointer"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="floorplan" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {floorPlanImages.map((image, index) => (
                    <OptimizedImage
                      key={image.id}
                      src={image.image_url}
                      alt={image.alt_text || `${getHomeName(mobileHome)} floor plan ${index + 1}`}
                      aspectRatio="video"
                      className="rounded-lg hover:scale-105 transition-transform cursor-pointer"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold mb-2">
                      {getHomeName(mobileHome)}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      {mobileHome.series} Series
                    </Badge>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWishlist(mobileHome)}
                      className={isInWishlist(mobileHome.id) ? 'text-red-500 border-red-200' : ''}
                    >
                      <Heart className={`h-4 w-4 ${isInWishlist(mobileHome.id) ? 'fill-current' : ''}`} />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addToComparison(mobileHome)}
                      disabled={isInComparison(mobileHome.id)}
                    >
                      <Scale className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mt-4">
                  {user ? (
                    !pricingLoading ? (
                      <div>
                        <span className="text-3xl font-bold text-green-600">
                          {formatPrice(calculateMobileHomePrice(mobileHome))}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Your price</p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-lg text-gray-500 italic">Loading your pricing...</span>
                      </div>
                    )
                  ) : (
                    mobileHome.retail_price ? (
                      <div>
                        <p className="text-sm text-blue-600 mb-1">Starting at:</p>
                        <span className="text-3xl font-bold text-blue-600">
                          {formatPrice(mobileHome.retail_price)}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          <span 
                            className="text-blue-600 font-medium cursor-pointer hover:underline" 
                            onClick={() => navigate('/auth')}
                          >
                            Login to see your price
                          </span>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-lg text-gray-500 italic">Login to view pricing</span>
                      </div>
                    )
                  )}
                </div>

                {mobileHome.description && (
                  <p className="text-gray-600 mt-4">{mobileHome.description}</p>
                )}
              </CardHeader>
              
              <CardContent>
                {/* Add to Cart Button */}
                {user ? (
                  <Button 
                    onClick={handleAddToCart}
                    className="w-full mb-4"
                    variant={isInCart ? "outline" : "default"}
                    size="lg"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    {isInCart ? 'Update in Cart' : 'Add to Cart'}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="w-full mb-4"
                    variant="outline"
                    size="lg"
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Login to Add to Cart
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                    <Maximize className="h-6 w-6 text-blue-600 mb-2" />
                    <span className="text-sm text-gray-600">Square Footage</span>
                    <span className="font-semibold text-lg">
                      {mobileHome.square_footage ? `${mobileHome.square_footage.toLocaleString()} sq ft` : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                    <Ruler className="h-6 w-6 text-blue-600 mb-2" />
                    <span className="text-sm text-gray-600">Dimensions</span>
                    <span className="font-semibold text-lg">
                      {mobileHome.length_feet && mobileHome.width_feet 
                        ? `${mobileHome.width_feet}' × ${mobileHome.length_feet}'` 
                        : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                    <Bed className="h-6 w-6 text-blue-600 mb-2" />
                    <span className="text-sm text-gray-600">Bedrooms</span>
                    <span className="font-semibold text-lg">{mobileHome.bedrooms || 'N/A'}</span>
                  </div>
                  
                  <div className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-lg">
                    <Bath className="h-6 w-6 text-blue-600 mb-2" />
                    <span className="text-sm text-gray-600">Bathrooms</span>
                    <span className="font-semibold text-lg">{mobileHome.bathrooms || 'N/A'}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Manufacturer:</span>
                    <span className="font-medium">{mobileHome.manufacturer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium">{mobileHome.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Series:</span>
                    <span className="font-medium">{mobileHome.series}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            {homeFeatures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Key Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2">
                    {homeFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <span className="w-2 h-2 bg-blue-600 rounded-full mr-3 flex-shrink-0"></span>
                        {feature}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        {/* Reviews Section */}
        <div className="mt-12">
          <MobileHomeReviews 
            mobileHomeId={mobileHome.id} 
            currentUserId={user?.id}
          />
        </div>
      </div>

      {/* Services Dialog */}
      {user && (
        <MobileHomeServicesDialog
          isOpen={!!selectedHomeForServices}
          onClose={() => setSelectedHomeForServices(null)}
          mobileHome={selectedHomeForServices}
          onAddToCart={handleAddToCartWithServices}
          user={user}
        />
      )}
    </div>
  );
};