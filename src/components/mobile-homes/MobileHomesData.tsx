
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
      console.log('🔍 Starting mobile homes fetch...');
      
      try {
        const { data, error } = await supabase
          .from('mobile_homes')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });
        
        console.log('🔍 Supabase response - Error:', error);
        console.log('🔍 Supabase response - Data count:', data?.length || 0);
        
        if (error) {
          console.error('🔍 Database error:', error);
          throw error;
        }
        
        console.log('🔍 Successfully fetched mobile homes:', data?.length || 0);
        return data as MobileHome[];
      } catch (err) {
        console.error('🔍 Fetch error:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('🔍 Starting images fetch...');
      try {
        const { data, error } = await supabase
          .from('mobile_home_images')
          .select('*')
          .order('mobile_home_id')
          .order('image_type')
          .order('display_order');
        
        if (error) {
          console.error('🔍 Images error:', error);
          throw error;
        }
        
        console.log('🔍 Images fetched:', data?.length || 0);
        return data as MobileHomeImage[];
      } catch (err) {
        console.error('🔍 Images fetch error:', err);
        throw err;
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  console.log('🔍 Hook state - isLoading:', isLoading, 'error:', error?.message, 'homes count:', mobileHomes.length);

  return {
    mobileHomes,
    homeImages,
    isLoading,
    imagesLoading,
    error,
    refetch
  };
};
