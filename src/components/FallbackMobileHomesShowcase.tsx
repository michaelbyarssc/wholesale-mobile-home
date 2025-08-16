import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { MobileHomeCardSkeleton } from './loading/MobileHomeCardSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Bed, Bath, Maximize, Ruler } from 'lucide-react';

import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface FallbackMobileHomesShowcaseProps {
  onRetry?: () => void;
}

export const FallbackMobileHomesShowcase = ({ onRetry }: FallbackMobileHomesShowcaseProps) => {
  const [homes, setHomes] = useState<MobileHome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHomesDirectly = async () => {
      try {
        console.log('🚨 FALLBACK: Attempting direct fetch of mobile homes...');
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('mobile_homes')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true });

        if (fetchError) {
          console.error('🚨 FALLBACK ERROR:', fetchError);
          setError(fetchError.message);
          return;
        }

        console.log('🚨 FALLBACK SUCCESS: Fetched', data?.length || 0, 'homes');
        setHomes(data || []);
        
      } catch (err: any) {
        console.error('🚨 FALLBACK CATCH:', err);
        setError(err.message || 'Failed to fetch mobile homes');
      } finally {
        setLoading(false);
      }
    };

    fetchHomesDirectly();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Our Mobile Home Models
            </h3>
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Loading models (fallback mode)...</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <MobileHomeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-20 bg-amber-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Our Mobile Home Models
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-800 mb-4">Failed to load mobile homes: {error}</p>
              <Button onClick={onRetry} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (homes.length === 0) {
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
          </p>
          <div className="mt-4 text-sm text-blue-600">
            Showing {homes.length} homes (fallback mode)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {homes.map((home) => (
            <Card key={home.id} className="group hover:shadow-lg transition-all duration-300 border-amber-200 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="aspect-video bg-gray-200 rounded-lg mb-4 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200">
                    <Home className="h-12 w-12 text-amber-400" />
                  </div>
                </div>
                <CardTitle className="text-lg group-hover:text-amber-600 transition-colors">
                  {home.display_name || `${home.manufacturer} ${home.model}`}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {home.manufacturer}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {home.series}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Bed className="h-4 w-4" />
                    <span>{home.bedrooms || 'N/A'} bed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="h-4 w-4" />
                    <span>{home.bathrooms || 'N/A'} bath</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Maximize className="h-4 w-4" />
                    <span>{home.square_footage || 'N/A'} sqft</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    <span>{home.width_feet || 'N/A'}' wide</span>
                  </div>
                </div>
                
                {home.price && (
                  <div className="text-2xl font-bold text-amber-600 mb-4">
                    ${home.price.toLocaleString()}
                  </div>
                )}
                
                <Button 
                  className="w-full" 
                  onClick={() => window.open(`/home/${home.id}`, '_blank')}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};