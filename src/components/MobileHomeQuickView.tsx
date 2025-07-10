import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, MapPin, Ruler, Bed, Bath, Home, Calendar, ShoppingCart, Heart } from 'lucide-react';
import { MobileHomeImageCarousel } from '@/components/MobileHomeImageCarousel';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type MobileHomeImage = Database['public']['Tables']['mobile_home_images']['Row'];

interface MobileHomeQuickViewProps {
  home: MobileHome;
  images: MobileHomeImage[];
  userPrice?: number;
  onAddToCart?: (home: MobileHome) => void;
  onToggleWishlist?: (home: MobileHome) => void;
  isInWishlist?: boolean;
  children: React.ReactNode;
}

export const MobileHomeQuickView: React.FC<MobileHomeQuickViewProps> = ({
  home,
  images,
  userPrice,
  onAddToCart,
  onToggleWishlist,
  isInWishlist,
  children
}) => {
  const navigate = useNavigate();

  const displayPrice = userPrice || home.price;
  const homeName = home.display_name || `${home.manufacturer} ${home.model}`;
  const homeFeatures = (home.features as string[]) || [];

  const specs = [
    { icon: Ruler, label: 'Square Feet', value: home.square_footage ? `${home.square_footage} sq ft` : 'N/A' },
    { icon: Bed, label: 'Bedrooms', value: home.bedrooms || 'N/A' },
    { icon: Bath, label: 'Bathrooms', value: home.bathrooms || 'N/A' },
    { icon: Home, label: 'Series', value: home.series },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{homeName}</h2>
              <p className="text-lg text-primary font-semibold">${displayPrice.toLocaleString()}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Carousel */}
          <div className="space-y-4">
            <MobileHomeImageCarousel 
              images={images}
              homeModel={homeName}
            />
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              {onAddToCart && (
                <Button 
                  onClick={() => onAddToCart(home)}
                  className="flex-1 flex items-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                </Button>
              )}
              {onToggleWishlist && (
                <Button
                  variant="outline"
                  onClick={() => onToggleWishlist(home)}
                  className={`flex items-center gap-2 ${isInWishlist ? 'text-red-600 border-red-600' : ''}`}
                >
                  <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current' : ''}`} />
                  {isInWishlist ? 'Saved' : 'Save'}
                </Button>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Specifications */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-4">Specifications</h3>
                <div className="grid grid-cols-2 gap-4">
                  {specs.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-medium">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Manufacturer Info */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Manufacturer</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{home.manufacturer}</Badge>
                  <span className="text-sm text-muted-foreground">Series: {home.series}</span>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            {homeFeatures.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-3">Features</h3>
                  <div className="flex flex-wrap gap-2">
                    {homeFeatures.slice(0, 8).map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {homeFeatures.length > 8 && (
                      <Badge variant="secondary" className="text-xs">
                        +{homeFeatures.length - 8} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {home.description && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {home.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Dimensions */}
            {(home.length_feet || home.width_feet) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">Dimensions</h3>
                  <div className="text-sm">
                    {home.length_feet && home.width_feet ? (
                      <p>{home.length_feet}' × {home.width_feet}' ({home.width_feet > 20 ? 'Double' : 'Single'} Wide)</p>
                    ) : (
                      <>
                        {home.length_feet && <p>Length: {home.length_feet} feet</p>}
                        {home.width_feet && <p>Width: {home.width_feet} feet</p>}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};