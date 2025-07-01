
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];

interface MobileHomeImage {
  id: string;
  mobile_home_id: string;
  image_url: string;
  image_type: string;
  display_order: number;
  alt_text: string | null;
}

export const useMobileHomesData = () => {
  const { data: mobileHomes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['public-mobile-homes'],
    queryFn: async () => {
      console.log('🔍 Fetching mobile homes...');
      
      const { data, error } = await supabase
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
      
      if (error) {
        console.error('🔍 Error fetching mobile homes:', error);
        throw error;
      }
      
      console.log('🔍 Mobile homes fetched successfully:', data?.length || 0);
      return data as MobileHome[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
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

  return {
    mobileHomes,
    homeImages,
    isLoading,
    imagesLoading,
    error,
    refetch
  };
};
