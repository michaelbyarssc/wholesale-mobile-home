
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
      console.log('🔍 Starting mobile homes query...');
      
      try {
        // First, let's test basic connectivity
        console.log('🔍 Testing Supabase connection...');
        const { data: testData, error: testError } = await supabase
          .from('mobile_homes')
          .select('count(*)', { count: 'exact', head: true });
        
        if (testError) {
          console.error('🔍 Connection test failed:', testError);
          throw testError;
        }
        
        console.log('🔍 Connection test successful, count result:', testData);
        
        // Now fetch the actual data
        console.log('🔍 Fetching mobile homes data...');
        const { data, error } = await supabase
          .from('mobile_homes')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('🔍 Error fetching mobile homes:', error);
          throw error;
        }
        
        console.log('🔍 Mobile homes fetched successfully:', data?.length || 0);
        console.log('🔍 Sample data:', data?.[0] || 'No data');
        return data as MobileHome[];
      } catch (err) {
        console.error('🔍 Query function error:', err);
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
    },
    retry: 3,
    retryDelay: 1000,
  });

  // Add some debugging for the query states
  console.log('🔍 Query states:', { 
    isLoading, 
    homeCount: mobileHomes.length, 
    error: error?.message,
    imagesLoading,
    imagesCount: homeImages.length 
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
