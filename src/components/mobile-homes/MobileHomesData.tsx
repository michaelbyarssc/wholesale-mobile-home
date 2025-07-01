
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
    queryKey: ['mobile-homes'],
    queryFn: async () => {
      console.log('🚀 Fetching mobile homes...');
      
      const { data, error } = await supabase
        .from('mobile_homes')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('❌ Mobile homes query error:', error);
        throw new Error(`Failed to fetch mobile homes: ${error.message}`);
      }
      
      console.log('✅ Mobile homes fetched successfully:', data?.length || 0);
      return (data || []) as MobileHome[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('🖼️ Fetching mobile home images...');
      
      const { data, error } = await supabase
        .from('mobile_home_images')
        .select('*')
        .order('mobile_home_id')
        .order('image_type')
        .order('display_order');
      
      if (error) {
        console.error('❌ Images query error:', error);
        throw new Error(`Failed to fetch images: ${error.message}`);
      }
      
      console.log('✅ Images fetched successfully:', data?.length || 0);
      return (data || []) as MobileHomeImage[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  console.log('🏁 Final state:', {
    mobileHomesCount: mobileHomes.length,
    homeImagesCount: homeImages.length,
    isLoading,
    imagesLoading,
    hasError: !!error
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
