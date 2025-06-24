
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BusinessInfo {
  business_phone?: string;
  business_email?: string;
  business_name?: string;
}

export const useBusinessInfo = () => {
  return useQuery({
    queryKey: ['business-info'],
    queryFn: async (): Promise<BusinessInfo> => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['business_phone', 'business_email', 'business_name']);
      
      if (error) throw error;
      
      const businessInfo: BusinessInfo = {};
      data?.forEach((setting) => {
        businessInfo[setting.setting_key as keyof BusinessInfo] = setting.setting_value;
      });
      
      return businessInfo;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
