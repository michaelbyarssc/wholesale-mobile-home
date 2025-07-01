
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
        console.log('🔍 Making query to mobile_homes table...');
        const { data, error } = await supabase
          .from('mobile_homes')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });
        
        console.log('🔍 Query completed. Error:', error);
        console.log('🔍 Query completed. Data length:', data?.length || 0);
        console.log('🔍 Query completed. First row:', data?.[0]);
        
        if (error) {
          console.error('🔍 Detailed error from Supabase:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        console.log('🔍 Mobile homes fetched successfully:', data?.length || 0);
        return data as MobileHome[];
      } catch (err) {
        console.error('🔍 Catch block error:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    retryDelay: 1000,
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('🔍 Starting mobile home images fetch...');
      try {
        const { data, error } = await supabase
          .from('mobile_home_images')
          .select('*')
          .order('mobile_home_id')
          .order('image_type')
          .order('display_order');
        
        console.log('🔍 Images query completed. Error:', error);
        console.log('🔍 Images query completed. Data length:', data?.length || 0);
        
        if (error) {
          console.error('🔍 Detailed images error from Supabase:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        console.log('🔍 Mobile home images fetched:', data?.length || 0);
        return data as MobileHomeImage[];
      } catch (err) {
        console.error('🔍 Images catch block error:', err);
        throw err;
      }
    },
    retry: 3,
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
