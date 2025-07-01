
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
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      
      if (error) {
        console.error('🔍 Mobile homes error:', error.message);
        throw error;
      }
      
      console.log('🔍 Mobile homes fetched:', data?.length || 0);
      return data as MobileHome[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('🔍 Fetching images...');
      
      const { data, error } = await supabase
        .from('mobile_home_images')
        .select('*')
        .order('mobile_home_id')
        .order('image_type')
        .order('display_order');
      
      if (error) {
        console.error('🔍 Images error:', error.message);
        throw error;
      }
      
      console.log('🔍 Images fetched:', data?.length || 0);
      return data as MobileHomeImage[];
    },
    retry: 1,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
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
