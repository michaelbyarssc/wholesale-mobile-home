
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
      console.log('🚀 Starting mobile homes query...');
      console.log('🔍 Supabase client URL:', supabase.supabaseUrl);
      console.log('🔍 Supabase client key (first 20 chars):', supabase.supabaseKey.substring(0, 20));
      
      try {
        const startTime = Date.now();
        console.log('📡 Making Supabase request to mobile_homes table...');
        
        // First, let's try a simple count query to test basic connectivity
        const { count, error: countError } = await supabase
          .from('mobile_homes')
          .select('*', { count: 'exact', head: true });
        
        if (countError) {
          console.error('❌ Count query failed:', countError);
          throw new Error(`Count query failed: ${countError.message}`);
        }
        
        console.log('✅ Count query successful. Total rows:', count);
        
        // Now try the actual query
        const { data, error } = await supabase
          .from('mobile_homes')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });
        
        const endTime = Date.now();
        console.log(`⏱️ Main query completed in ${endTime - startTime}ms`);
        
        if (error) {
          console.error('❌ Mobile homes query error:', error);
          console.error('❌ Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw new Error(`Failed to fetch mobile homes: ${error.message}`);
        }
        
        console.log('✅ Mobile homes query successful:', {
          rowCount: data?.length || 0,
          firstRow: data?.[0] || null,
          allRows: data
        });
        
        return (data || []) as MobileHome[];
      } catch (error) {
        console.error('❌ Exception in mobile homes query:', error);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      console.log(`🔄 Retry attempt ${failureCount} for mobile homes query`);
      console.log('🔄 Error that triggered retry:', error);
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images'],
    queryFn: async () => {
      console.log('🖼️ Starting mobile home images query...');
      
      try {
        const startTime = Date.now();
        
        const { data, error } = await supabase
          .from('mobile_home_images')
          .select('*')
          .order('mobile_home_id')
          .order('image_type')
          .order('display_order');
        
        const endTime = Date.now();
        console.log(`⏱️ Images query completed in ${endTime - startTime}ms`);
        
        if (error) {
          console.error('❌ Images query error:', error);
          throw new Error(`Failed to fetch images: ${error.message}`);
        }
        
        console.log('✅ Images query successful:', {
          rowCount: data?.length || 0
        });
        
        return (data || []) as MobileHomeImage[];
      } catch (error) {
        console.error('❌ Exception in images query:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      console.log(`🔄 Retry attempt ${failureCount} for images query`);
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  console.log('🏁 useMobileHomesData state:', {
    mobileHomesCount: mobileHomes.length,
    homeImagesCount: homeImages.length,
    isLoading,
    imagesLoading,
    hasError: !!error,
    errorMessage: error?.message,
    supabaseConnected: !!supabase,
    queryEnabled: true
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
