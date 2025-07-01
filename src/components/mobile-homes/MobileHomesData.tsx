
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
      console.log('📱 Starting mobile homes fetch...');
      
      try {
        // First check if we can connect to Supabase
        const { data: connectionTest, error: connectionError } = await supabase
          .from('mobile_homes')
          .select('count(*)')
          .limit(1);
          
        console.log('📱 Connection test result:', { connectionTest, connectionError });
        
        if (connectionError) {
          console.error('📱 Connection error:', connectionError);
          throw new Error(`Database connection failed: ${connectionError.message}`);
        }
        
        // Now fetch the actual data
        const { data, error, count } = await supabase
          .from('mobile_homes')
          .select('*', { count: 'exact' })
          .eq('active', true)
          .order('display_order', { ascending: true });
        
        console.log('📱 Query executed:', {
          dataCount: data?.length || 0,
          totalCount: count,
          error: error?.message,
          firstItem: data?.[0]
        });
        
        if (error) {
          console.error('📱 Query error:', error);
          throw new Error(`Failed to fetch mobile homes: ${error.message}`);
        }
        
        if (!data) {
          console.warn('📱 No data returned from query');
          return [];
        }
        
        console.log('📱 Successfully fetched mobile homes:', data.length);
        return data as MobileHome[];
        
      } catch (err) {
        console.error('📱 Fetch error:', err);
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      console.log(`📱 Retry attempt ${failureCount} for error:`, error);
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('🖼️ Starting images fetch...');
      
      try {
        const { data, error, count } = await supabase
          .from('mobile_home_images')
          .select('*', { count: 'exact' })
          .order('mobile_home_id')
          .order('image_type')
          .order('display_order');
        
        console.log('🖼️ Images query result:', {
          dataCount: data?.length || 0,
          totalCount: count,
          error: error?.message,
          sampleImage: data?.[0]
        });
        
        if (error) {
          console.error('🖼️ Images error:', error);
          throw new Error(`Failed to fetch images: ${error.message}`);
        }
        
        return (data || []) as MobileHomeImage[];
        
      } catch (err) {
        console.error('🖼️ Images fetch error:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  // Log the final state
  console.log('📱 useMobileHomesData final state:', {
    mobileHomesCount: mobileHomes.length,
    homeImagesCount: homeImages.length,
    isLoading,
    imagesLoading,
    hasError: !!error,
    errorMessage: error?.message
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
