
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
  // Query for mobile homes with better error handling
  const { data: mobileHomes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['mobile-homes-simple'],
    queryFn: async () => {
      console.log('📱 Fetching homes');
      
      try {
        const { data, error } = await supabase
          .from('mobile_homes')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('Error fetching mobile homes:', error);
          throw error;
        }
        
        console.log('📱 Got homes:', data?.length || 0, data);
        return (data || []) as MobileHome[];
      } catch (err) {
        console.error('Failed to fetch mobile homes:', err);
        throw err;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1, // Allow one retry
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Allow refetch on mount
    refetchOnReconnect: false,
  });

  const { data: homeImages = [], isLoading: imagesLoading } = useQuery({
    queryKey: ['mobile-home-images-simple'],
    queryFn: async () => {
      console.log('🖼️ Fetching images');
      
      try {
        const { data, error } = await supabase
          .from('mobile_home_images')
          .select('*')
          .order('mobile_home_id')
          .order('image_type')
          .order('display_order');
        
        if (error) {
          console.error('Error fetching mobile home images:', error);
          throw error;
        }
        
        console.log('🖼️ Got images:', data?.length || 0);
        return (data || []) as MobileHomeImage[];
      } catch (err) {
        console.error('Failed to fetch mobile home images:', err);
        throw err;
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  console.log('useMobileHomesData - homes:', mobileHomes?.length, 'loading:', isLoading, 'error:', error);

  return {
    mobileHomes,
    homeImages,
    isLoading,
    imagesLoading,
    error,
    refetch
  };
};
