import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { useCustomerPricing } from '@/hooks/useCustomerPricing';
import type { Database } from '@/integrations/supabase/types';

type MobileHome = Database['public']['Tables']['mobile_homes']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type HomeOption = Database['public']['Tables']['home_options']['Row'];

interface PricingContextValue {
  calculateMobileHomePrice: (mobileHome: MobileHome | null) => number;
  calculateServicePrice: (service: Service, mobileHome?: MobileHome | null) => number;
  calculateHomeOptionPrice: (option: HomeOption, squareFootage?: number) => number;
  calculateTotalPrice: (
    mobileHome: MobileHome | null,
    selectedServices: Service[],
    selectedHomeOptions: { option: HomeOption; quantity: number }[]
  ) => number;
  calculatePrice: (basePrice: number) => number;
  customerMarkup: any;
  markupPercentage: number;
  tierLevel: string;
  parentMarkup: number;
  loading: boolean;
}

const PricingContext = createContext<PricingContextValue | null>(null);

interface PricingProviderProps {
  children: React.ReactNode;
  user: User | null;
}

export const PricingProvider: React.FC<PricingProviderProps> = ({ children, user }) => {
  const pricing = useCustomerPricing(user);

  // Create stable pricing functions that only change when pricing VALUES change, not function references
  const calculateMobileHomePrice = useCallback((mobileHome: MobileHome | null): number => {
    if (!mobileHome?.price) return 0;

    const baseCost = mobileHome.cost || mobileHome.price;
    const userMarkup = pricing.markupPercentage || 30;
    const parentMarkup = pricing.parentMarkup || 30;
    const tierLevel = pricing.tierLevel || 'user';

    let finalPrice = baseCost;

    switch (tierLevel) {
      case 'super_admin':
        finalPrice = baseCost * (1 + userMarkup / 100);
        break;
      case 'admin':
        const adminBasePrice = baseCost * (1 + parentMarkup / 100);
        finalPrice = adminBasePrice * (1 + userMarkup / 100);
        break;
      case 'user':
        const userBasePrice = baseCost * (1 + parentMarkup / 100);
        finalPrice = userBasePrice * (1 + userMarkup / 100);
        break;
    }

    const minProfitPrice = baseCost + (mobileHome.minimum_profit || 0);
    return Math.max(finalPrice, minProfitPrice);
  }, [pricing.markupPercentage, pricing.parentMarkup, pricing.tierLevel]);

  const calculateServicePrice = useCallback((service: Service, mobileHome?: MobileHome | null): number => {
    if (!service) return 0;
    
    const userMarkup = pricing.markupPercentage || 30;
    const parentMarkup = pricing.parentMarkup || 30;
    const tierLevel = pricing.tierLevel || 'user';
    
    let baseCost = service.cost || service.price || 0;
    
    if (mobileHome?.width_feet) {
      if (mobileHome.width_feet < 16 && service.single_wide_price) {
        baseCost = service.cost || service.single_wide_price;
      } else if (mobileHome.width_feet >= 16 && service.double_wide_price) {
        baseCost = service.cost || service.double_wide_price;
      }
    }
    
    let finalPrice = baseCost;

    switch (tierLevel) {
      case 'super_admin':
        finalPrice = baseCost * (1 + userMarkup / 100);
        break;
      case 'admin':
        const adminBasePrice = baseCost * (1 + parentMarkup / 100);
        finalPrice = adminBasePrice * (1 + userMarkup / 100);
        break;
      case 'user':
        const userBasePrice = baseCost * (1 + parentMarkup / 100);
        finalPrice = userBasePrice * (1 + userMarkup / 100);
        break;
    }

    return finalPrice;
  }, [pricing.markupPercentage, pricing.parentMarkup, pricing.tierLevel]);

  const calculateHomeOptionPrice = useCallback((option: HomeOption, squareFootage?: number): number => {
    if (!option) return 0;
    
    const userMarkup = pricing.markupPercentage || 30;
    const parentMarkup = pricing.parentMarkup || 30;
    const tierLevel = pricing.tierLevel || 'user';
    
    let baseCost = 0;

    if (option.pricing_type === 'per_sqft' && squareFootage && option.price_per_sqft) {
      baseCost = option.cost_price || (option.price_per_sqft * squareFootage);
    } else if (option.pricing_type === 'fixed' && option.cost_price) {
      baseCost = option.cost_price;
    }

    let finalPrice = baseCost;

    switch (tierLevel) {
      case 'super_admin':
        finalPrice = baseCost * (1 + userMarkup / 100);
        break;
      case 'admin':
        const adminBasePrice = baseCost * (1 + parentMarkup / 100);
        finalPrice = adminBasePrice * (1 + userMarkup / 100);
        break;
      case 'user':
        const userBasePrice = baseCost * (1 + parentMarkup / 100);
        finalPrice = userBasePrice * (1 + userMarkup / 100);
        break;
    }

    return finalPrice;
  }, [pricing.markupPercentage, pricing.parentMarkup, pricing.tierLevel]);

  const calculateTotalPrice = useCallback((
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

    return homePrice + servicesPrice + optionsPrice;
  }, [calculateMobileHomePrice, calculateServicePrice, calculateHomeOptionPrice]);

  const calculatePrice = useCallback((basePrice: number): number => {
    if (!basePrice) return 0;
    
    const userMarkup = pricing.markupPercentage || 30;
    const parentMarkup = pricing.parentMarkup || 30;
    const tierLevel = pricing.tierLevel || 'user';

    let finalPrice = basePrice;

    switch (tierLevel) {
      case 'super_admin':
        finalPrice = basePrice * (1 + userMarkup / 100);
        break;
      case 'admin':
        const adminBasePrice = basePrice * (1 + parentMarkup / 100);
        finalPrice = adminBasePrice * (1 + userMarkup / 100);
        break;
      case 'user':
        const userBasePrice = basePrice * (1 + parentMarkup / 100);
        finalPrice = userBasePrice * (1 + userMarkup / 100);
        break;
    }

    return finalPrice;
  }, [pricing.markupPercentage, pricing.parentMarkup, pricing.tierLevel]);

  // Memoize context value with stable dependencies - only the VALUES, not function references
  const contextValue = useMemo(() => ({
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateHomeOptionPrice,
    calculateTotalPrice,
    calculatePrice,
    customerMarkup: pricing.customerMarkup,
    markupPercentage: pricing.markupPercentage,
    tierLevel: pricing.tierLevel,
    parentMarkup: pricing.parentMarkup,
    loading: pricing.loading,
  }), [
    calculateMobileHomePrice,
    calculateServicePrice,
    calculateHomeOptionPrice,
    calculateTotalPrice,
    calculatePrice,
    pricing.customerMarkup,
    pricing.markupPercentage,
    pricing.tierLevel,
    pricing.parentMarkup,
    pricing.loading,
  ]);

  return (
    <PricingContext.Provider value={contextValue}>
      {children}
    </PricingContext.Provider>
  );
};

export const usePricingContext = (): PricingContextValue => {
  const context = useContext(PricingContext);
  if (!context) {
    throw new Error('usePricingContext must be used within a PricingProvider');
  }
  return context;
};