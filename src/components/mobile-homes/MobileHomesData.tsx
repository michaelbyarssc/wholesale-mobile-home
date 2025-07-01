
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
      console.log('🔍 STARTING DETAILED MOBILE HOMES FETCH DEBUG');
      console.log('📊 Supabase client configured:', !!supabase);
      console.log('🔑 Supabase URL:', supabase.supabaseUrl);
      console.log('🔑 Supabase Key (first 20 chars):', supabase.supabaseKey?.substring(0, 20) + '...');
      
      try {
        // Step 1: Test basic connection
        console.log('🧪 Step 1: Testing basic connection...');
        const { data: testData, error: testError } = await supabase
          .from('mobile_homes')
          .select('count(*)')
          .limit(1);
          
        console.log('✅ Connection test result:', { 
          success: !testError, 
          data: testData, 
          error: testError?.message 
        });
        
        if (testError) {
          console.error('❌ Connection test failed:', testError);
          throw new Error(`Database connection failed: ${testError.message}`);
        }
        
        // Step 2: Check table permissions  
        console.log('🧪 Step 2: Testing table permissions...');
        const { data: permissionTest, error: permissionError } = await supabase
          .from('mobile_homes')
          .select('id')
          .limit(1);
          
        console.log('🔐 Permission test result:', { 
          success: !permissionError, 
          recordsFound: permissionTest?.length || 0,
          error: permissionError?.message 
        });
        
        if (permissionError) {
          console.error('❌ Permission test failed:', permissionError);
          throw new Error(`Permission denied: ${permissionError.message}`);
        }
        
        // Step 3: Full query with detailed logging
        console.log('🧪 Step 3: Executing full query...');
        const startTime = Date.now();
        
        const { data, error, count } = await supabase
          .from('mobile_homes')
          .select('*', { count: 'exact' })
          .eq('active', true)
          .order('display_order', { ascending: true });
        
        const queryTime = Date.now() - startTime;
        
        console.log('📈 Query execution details:', {
          executionTime: `${queryTime}ms`,
          totalCount: count,
          dataReceived: data?.length || 0,
          hasError: !!error,
          errorMessage: error?.message,
          firstRecord: data?.[0] ? {
            id: data[0].id,
            model: data[0].model,
            series: data[0].series,
            active: data[0].active
          } : null
        });
        
        if (error) {
          console.error('❌ Query failed:', error);
          throw new Error(`Failed to fetch mobile homes: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
          console.warn('⚠️ No mobile homes found in database');
          console.log('💡 This might be because:');
          console.log('   1. No mobile homes exist in the database');
          console.log('   2. All mobile homes are set to active=false');
          console.log('   3. RLS policies are still blocking access');
          return [];
        }
        
        console.log('✅ Successfully fetched mobile homes:', {
          count: data.length,
          series: [...new Set(data.map(h => h.series))],
          models: data.map(h => h.model).slice(0, 3)
        });
        
        return data as MobileHome[];
        
      } catch (err) {
        console.error('💥 CRITICAL ERROR in mobile homes fetch:', err);
        console.error('🔍 Error details:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });
        throw err;
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      console.log(`🔄 Retry attempt ${failureCount} for error:`, error);
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('🖼️ STARTING IMAGES FETCH DEBUG');
      
      try {
        const startTime = Date.now();
        const { data, error, count } = await supabase
          .from('mobile_home_images')
          .select('*', { count: 'exact' })
          .order('mobile_home_id')
          .order('image_type')
          .order('display_order');
        
        const queryTime = Date.now() - startTime;
        
        console.log('🖼️ Images query result:', {
          executionTime: `${queryTime}ms`,
          totalCount: count,
          dataReceived: data?.length || 0,
          hasError: !!error,
          errorMessage: error?.message,
          sampleImage: data?.[0] ? {
            mobile_home_id: data[0].mobile_home_id,
            image_type: data[0].image_type,
            image_url: data[0].image_url?.substring(0, 50) + '...'
          } : null
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
    retry: 2,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  // Final state logging
  console.log('🏁 useMobileHomesData final state:', {
    mobileHomesCount: mobileHomes.length,
    homeImagesCount: homeImages.length,
    isLoading,
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
