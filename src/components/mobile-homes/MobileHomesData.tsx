
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
      console.log('🚀 MOBILE HOMES FETCH START - Time:', new Date().toISOString());
      
      try {
        console.log('⏱️ Step 1: Testing basic query execution...');
        const startTime = performance.now();
        
        // Test the most basic query first
        const { data: testData, error: testError, count: testCount } = await supabase
          .from('mobile_homes')
          .select('id, model, series, active', { count: 'exact' })
          .limit(1);
        
        const testTime = performance.now() - startTime;
        console.log('⏱️ Basic query completed in:', testTime + 'ms');
        console.log('📊 Basic query result:', { 
          success: !testError, 
          count: testCount,
          dataLength: testData?.length || 0,
          firstRecord: testData?.[0],
          error: testError?.message 
        });

        if (testError) {
          console.error('❌ Basic query failed:', testError);
          throw new Error(`Basic query failed: ${testError.message}`);
        }

        if (testCount === 0) {
          console.warn('⚠️ No mobile homes found in database');
          return [];
        }

        console.log('⏱️ Step 2: Full query with all fields...');
        const fullStartTime = performance.now();
        
        const { data: fullData, error: fullError, count: fullCount } = await supabase
          .from('mobile_homes')
          .select('*', { count: 'exact' })
          .eq('active', true)
          .order('display_order', { ascending: true });
        
        const fullTime = performance.now() - fullStartTime;
        console.log('⏱️ Full query completed in:', fullTime + 'ms');
        console.log('📊 Full query result:', {
          success: !fullError,
          totalCount: fullCount,
          activeCount: fullData?.length || 0,
          error: fullError?.message,
          sampleRecord: fullData?.[0] ? {
            id: fullData[0].id,
            model: fullData[0].model,
            series: fullData[0].series,
            active: fullData[0].active,
            price: fullData[0].price
          } : null
        });

        if (fullError) {
          console.error('❌ Full query failed:', fullError);
          throw new Error(`Full query failed: ${fullError.message}`);
        }

        console.log('✅ Mobile homes fetch successful:', {
          count: fullData?.length || 0,
          series: [...new Set((fullData || []).map(h => h.series))],
          totalTime: fullTime + testTime
        });

        return (fullData || []) as MobileHome[];
        
      } catch (err) {
        console.error('💥 CRITICAL ERROR in mobile homes fetch:', err);
        console.error('🔍 Error stack:', err instanceof Error ? err.stack : 'No stack trace');
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      console.log(`🔄 Retry attempt ${failureCount} for error:`, error.message);
      return failureCount < 2; // Reduce retries
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('🖼️ IMAGES FETCH START - Time:', new Date().toISOString());
      
      try {
        const startTime = performance.now();
        const { data, error, count } = await supabase
          .from('mobile_home_images')
          .select('*', { count: 'exact' })
          .order('mobile_home_id')
          .order('image_type')
          .order('display_order');
        
        const queryTime = performance.now() - startTime;
        
        console.log('🖼️ Images query result:', {
          executionTime: queryTime + 'ms',
          totalCount: count,
          dataReceived: data?.length || 0,
          hasError: !!error,
          errorMessage: error?.message
        });
        
        if (error) {
          console.error('❌ Images query failed:', error);
          throw new Error(`Failed to fetch images: ${error.message}`);
        }
        
        return (data || []) as MobileHomeImage[];
        
      } catch (err) {
        console.error('💥 Images fetch error:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  // Log final state
  console.log('🏁 useMobileHomesData final state:', {
    mobileHomesCount: mobileHomes.length,
    homeImagesCount: homeImages.length,
    mobileHomesLoading: isLoading,
    imagesLoading,
    hasError: !!error,
    errorMessage: error?.message,
    timestamp: new Date().toISOString()
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
