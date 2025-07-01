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
  superAdminMarkup: number;
  adminMarkup: number;
}

export const useThreeTierPricing = (user: User | null) => {
  const [loading, setLoading] = useState(true);

  console.log('useThreeTierPricing: Hook called with user:', user?.id);

  // Fetch user role and pricing tiers
  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['three-tier-pricing', user?.id],
    queryFn: async () => {
      if (!user) {
        console.log('useThreeTierPricing: No user, returning default pricing');
        return {
          userRole: 'user' as const,
          superAdminMarkup: 1.0,
          adminMarkup: 30
        };
      }

      console.log('useThreeTierPricing: Fetching pricing data for user:', user.id);
      
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

      // Get super admin markup (global setting)
      const { data: superAdminMarkupData } = await supabase
        .from('super_admin_markups')
        .select('markup_percentage')
        .limit(1)
        .maybeSingle();

      const superAdminMarkup = superAdminMarkupData?.markup_percentage || 1.0;

      // Get user's admin markup if they're admin
      let adminMarkup = 30; // Default for users
      if (userRole === 'admin') {
        const { data: customerMarkupData } = await supabase
          .from('customer_markups')
          .select('markup_percentage')
          .eq('user_id', user.id)
          .maybeSingle();

        adminMarkup = customerMarkupData?.markup_percentage || 30;
      }

      console.log('useThreeTierPricing: Pricing data fetched:', { userRole, superAdminMarkup, adminMarkup });
      
      return {
        userRole: userRole as 'super_admin' | 'admin' | 'user',
        superAdminMarkup,
        adminMarkup
      };
    },
    enabled: true
  });

  useEffect(() => {
    if (!pricingLoading) {
      console.log('useThreeTierPricing: Setting loading to false');
      setLoading(false);
    }
  }, [pricingLoading]);

  const calculateTieredPrice = (baseCost: number): number => {
    if (!baseCost || !pricingData) return 0;

    const { userRole, superAdminMarkup, adminMarkup } = pricingData;

    let finalPrice = baseCost;

    // Apply super admin markup first (base tier)
    const superAdminPrice = baseCost * (1 + superAdminMarkup / 100);

    switch (userRole) {
      case 'super_admin':
        // Super admins see base cost + their markup
        finalPrice = superAdminPrice;
        break;
      case 'admin':
        // Admins see super admin price + their markup
        finalPrice = superAdminPrice * (1 + adminMarkup / 100);
        break;
      case 'user':
        // Users see admin price (super admin + admin markups)
        finalPrice = superAdminPrice * (1 + adminMarkup / 100);
        break;
    }

    console.log(`🔍 calculateTieredPrice: Base: ${baseCost}, Role: ${userRole}, Final: ${finalPrice}`);
    return finalPrice;
  };

  const calculateMobileHomePrice = (mobileHome: MobileHome | null): number => {
    console.log('useThreeTierPricing: calculateMobileHomePrice called with:', mobileHome?.id);
    
    if (!mobileHome || !pricingData) {
      console.log('useThreeTierPricing: mobileHome or pricingData is null, returning 0');
      return 0;
    }

    if (!mobileHome.price) {
      console.log('useThreeTierPricing: mobileHome.price is null, returning 0');
      return 0;
    }

    const { userRole, superAdminMarkup } = pricingData;
    
    // For super admins, use special pricing logic
    if (userRole === 'super_admin') {
      const internalCost = mobileHome.cost || mobileHome.price;
      
      // Pricing 1: Internal Cost + Markup %
      const pricing1 = internalCost * (1 + superAdminMarkup / 100);
      
      // Pricing 2: Internal cost + Min Profit
      const pricing2 = internalCost + (mobileHome.minimum_profit || 0);
      
      // Use the higher of the two prices
      const finalPrice = Math.max(pricing1, pricing2);
      
      console.log('useThreeTierPricing: Super Admin pricing - Internal Cost:', internalCost, 'Cost + Markup%:', pricing1, 'Cost + Min Profit:', pricing2, 'Final (higher):', finalPrice);
      return finalPrice;
    }

    // For non-super admins, use the regular tiered pricing
    const basePrice = mobileHome.price;
    const tieredPrice = calculateTieredPrice(basePrice);
    const minProfitPrice = basePrice + (mobileHome.minimum_profit || 0);
    const finalPrice = Math.max(tieredPrice, minProfitPrice);
    
    console.log('useThreeTierPricing: Regular pricing - Base:', basePrice, 'Tiered:', tieredPrice, 'Min Profit:', minProfitPrice, 'Final:', finalPrice);
    return finalPrice;
  };

  const calculateServicePrice = (service: Service, mobileHome?: MobileHome | null): number => {
    if (!service || !pricingData) return 0;
    
    let basePrice = service.cost || service.price || 0;
    
    // Use single wide or double wide pricing if available and mobile home width is known
    if (mobileHome?.width_feet) {
      if (mobileHome.width_feet < 16 && service.single_wide_price) {
        basePrice = service.cost || service.single_wide_price;
      } else if (mobileHome.width_feet >= 16 && service.double_wide_price) {
        basePrice = service.cost || service.double_wide_price;
      }
    }
    
    const finalPrice = calculateTieredPrice(basePrice);
    console.log('useThreeTierPricing: Service price calculation - Base:', basePrice, 'Final:', finalPrice);
    return finalPrice;
  };

  const calculateHomeOptionPrice = (option: HomeOption, squareFootage?: number): number => {
    if (!option || !pricingData) return 0;
    
    let basePrice = 0;

    if (option.pricing_type === 'per_sqft' && squareFootage && option.price_per_sqft) {
      basePrice = option.cost_price || (option.price_per_sqft * squareFootage);
    } else if (option.pricing_type === 'fixed' && option.cost_price) {
      basePrice = option.cost_price;
    }

    const finalPrice = calculateTieredPrice(basePrice);
    console.log(`🔍 useThreeTierPricing: Option ${option.name} - Base: ${basePrice}, Final: ${finalPrice}`);
    return finalPrice;
  };

  const calculateTotalPrice = (
    mobileHome: MobileHome | null,
    selectedServices: Service[] = [],
    selectedHomeOptions: { option: HomeOption; quantity: number }[] = []
  ): number => {
    console.log('useThreeTierPricing: calculateTotalPrice called');
    
    const homePrice = calculateMobileHomePrice(mobileHome);
    const servicesPrice = selectedServices.reduce((total, service) => {
      return total + calculateServicePrice(service, mobileHome);
    }, 0);
    
    const optionsPrice = selectedHomeOptions.reduce((total, { option, quantity }) => {
      const optionPrice = calculateHomeOptionPrice(option, mobileHome?.square_footage || undefined);
      return total + (optionPrice * quantity);
    }, 0);

    const totalPrice = homePrice + servicesPrice + optionsPrice;
    console.log('useThreeTierPricing: Total price calculated:', totalPrice);
    return totalPrice;
  };

  console.log('useThreeTierPricing: Returning hook values, loading:', loading);

  return {
    userRole: pricingData?.userRole || 'user',
    superAdminMarkup: pricingData?.superAdminMarkup || 1.0,
    adminMarkup: pricingData?.adminMarkup || 30,
    loading,
    calculateTieredPrice,
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateHomeOptionPrice,
    calculateTotalPrice,
  };
};
