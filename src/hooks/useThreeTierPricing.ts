
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface PricingTier {
  userRole: 'super_admin' | 'admin' | 'user';
  userMarkup: number;
  parentMarkup: number;
  tierLevel: string;
}

export const useThreeTierPricing = (user: User | null) => {
  const [loading, setLoading] = useState(true);

  // Fetch user role and tiered pricing structure
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['three-tier-pricing', user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          userRole: 'user' as const,
          userMarkup: 30,
          parentMarkup: 30,
          tierLevel: 'user'
        };
      }
      
      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleError) {
        console.error('useThreeTierPricing: Error fetching role:', roleError);
      }

      const userRole = roleData?.role || 'user';

      // Get user's markup and tier info
      const { data: markupData } = await supabase
        .from('customer_markups')
        .select('markup_percentage, tier_level, super_admin_markup_percentage')
        .eq('user_id', user.id)
        .maybeSingle();

      const userMarkup = markupData?.markup_percentage || 30;
      const tierLevel = markupData?.tier_level || 'user';
      const parentMarkup = markupData?.super_admin_markup_percentage || 30;
      
      return {
        userRole: userRole as 'super_admin' | 'admin' | 'user',
        userMarkup,
        parentMarkup,
        tierLevel
      };
    },
    enabled: true
  });

  useEffect(() => {
    if (!pricingLoading) {
      setLoading(false);
    }
  }, [pricingLoading]);

  const calculateTieredPrice = (baseCost: number): number => {
    if (!baseCost || !pricingData) return 0;

    const { userRole, userMarkup, parentMarkup, tierLevel } = pricingData;

    let finalPrice = baseCost;

    switch (tierLevel) {
      case 'super_admin':
        // Super admins see base cost + their markup only
        finalPrice = baseCost * (1 + userMarkup / 100);
        break;
      case 'admin':
        // Admins see base cost + parent (super admin) markup + their markup
        const adminBasePrice = baseCost * (1 + parentMarkup / 100);
        finalPrice = adminBasePrice * (1 + userMarkup / 100);
        break;
      case 'user':
        // Users see admin price + their markup (full tiered pricing)
        const userBasePrice = baseCost * (1 + parentMarkup / 100);
        finalPrice = userBasePrice * (1 + userMarkup / 100);
        break;
    }

    return finalPrice;
  };

  const calculateMobileHomePrice = (mobileHome: MobileHome | null): number => {
    if (!mobileHome || !pricingData) {
      return 0;
    }

    if (!mobileHome.price) {
      return 0;
    }

    // For mobile homes, use cost as base if available, otherwise use price
    const baseCost = mobileHome.cost || mobileHome.price;
    const tieredPrice = calculateTieredPrice(baseCost);
    const minProfitPrice = baseCost + (mobileHome.minimum_profit || 0);
    const finalPrice = Math.max(tieredPrice, minProfitPrice);
    
    return finalPrice;
  };

  const calculateServicePrice = (service: Service, mobileHome?: MobileHome | null): number => {
    if (!service || !pricingData) return 0;
    
    // Use cost as base if available, otherwise use price
    let baseCost = service.cost || service.price || 0;
    
    // Use single wide or double wide pricing if available and mobile home width is known
    if (mobileHome?.width_feet) {
      if (mobileHome.width_feet < 16 && service.single_wide_price) {
        baseCost = service.cost || service.single_wide_price;
      } else if (mobileHome.width_feet >= 16 && service.double_wide_price) {
        baseCost = service.cost || service.double_wide_price;
      }
    }
    
    const finalPrice = calculateTieredPrice(baseCost);
    return finalPrice;
  };

  const calculateHomeOptionPrice = (option: HomeOption, squareFootage?: number): number => {
    if (!option || !pricingData) return 0;
    
    let baseCost = 0;

    if (option.pricing_type === 'per_sqft' && squareFootage && option.price_per_sqft) {
      baseCost = option.cost_price || (option.price_per_sqft * squareFootage);
    } else if (option.pricing_type === 'fixed' && option.cost_price) {
      baseCost = option.cost_price;
    }

    const finalPrice = calculateTieredPrice(baseCost);
    return finalPrice;
  };

  const calculateTotalPrice = (
    mobileHome: MobileHome | null,
    selectedServices: Service[] = [],
    selectedHomeOptions: { option: HomeOption; quantity: number }[] = []
  ): number => {
    const homePrice = calculateMobileHomePrice(mobileHome);
    const servicesPrice = selectedServices.reduce((total, service) => {
      return total + calculateServicePrice(service, mobileHome);
    }, 0);
    
    const optionsPrice = selectedHomeOptions.reduce((total, { option, quantity }) => {
      const optionPrice = calculateHomeOptionPrice(option, mobileHome?.square_footage || undefined);
      return total + (optionPrice * quantity);
    }, 0);

    const totalPrice = homePrice + servicesPrice + optionsPrice;
    return totalPrice;
  };

  return {
    userRole: pricingData?.userRole || 'user',
    userMarkup: pricingData?.userMarkup || 30,
    parentMarkup: pricingData?.parentMarkup || 30,
    tierLevel: pricingData?.tierLevel || 'user',
    loading,
    calculateTieredPrice,
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateHomeOptionPrice,
    calculateTotalPrice,
  };
};
