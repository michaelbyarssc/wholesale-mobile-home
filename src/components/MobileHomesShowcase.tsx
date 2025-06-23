
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Home, Bed, Bath, Maximize, Ruler } from 'lucide-react';

interface MobileHome {
  id: string;
  manufacturer: string;
  series: 'Tru' | 'Epic';
  model: string;
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
}

export const MobileHomesShowcase = () => {
  const [activeTab, setActiveTab] = useState('Tru');

  const { data: mobileHomes = [], isLoading } = useQuery({
    queryKey: ['public-mobile-homes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('active', true)
        .order('series', { ascending: true })
        .order('square_footage', { ascending: true });
      
      if (error) throw error;
      return data as MobileHome[];
    }
  });

  const truHomes = mobileHomes.filter(home => home.series === 'Tru');
  const epicHomes = mobileHomes.filter(home => home.series === 'Epic');

  const renderHomeCard = (home: MobileHome) => (
    <Card key={home.id} className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold text-gray-900">
            {home.manufacturer} {home.model}
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {home.series} Series
          </Badge>
        </div>
        {home.description && (
          <p className="text-gray-600 text-sm mt-2">{home.description}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
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

        {/* Placeholder for images */}
        <div className="grid grid-cols-1 gap-2">
          <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Home className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Floor Plan Coming Soon</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

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

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Our Mobile Home Models
          </h3>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore our premium collection of mobile homes featuring modern designs, 
            quality construction, and thoughtful amenities for comfortable living.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="Tru" className="text-lg py-3">
              Tru Series ({truHomes.length} Models)
            </TabsTrigger>
            <TabsTrigger value="Epic" className="text-lg py-3">
              Epic Series ({epicHomes.length} Models)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Tru">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {truHomes.length > 0 ? (
                truHomes.map(renderHomeCard)
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-500">No Tru series models available.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="Epic">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {epicHomes.length > 0 ? (
                epicHomes.map(renderHomeCard)
              ) : (
                <div className="col-span-full text-center py-8">
                  <p className="text-gray-500">No Epic series models available.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
};
