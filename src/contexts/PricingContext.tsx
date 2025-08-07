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

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    calculateMobileHomePrice: pricing.calculateMobileHomePrice,
    calculateServicePrice: pricing.calculateServicePrice,
    calculateHomeOptionPrice: pricing.calculateHomeOptionPrice,
    calculateTotalPrice: pricing.calculateTotalPrice,
    calculatePrice: pricing.calculatePrice,
    customerMarkup: pricing.customerMarkup,
    markupPercentage: pricing.markupPercentage,
    tierLevel: pricing.tierLevel,
    parentMarkup: pricing.parentMarkup,
    loading: pricing.loading,
  }), [
    pricing.calculateMobileHomePrice,
    pricing.calculateServicePrice,
    pricing.calculateHomeOptionPrice,
    pricing.calculateTotalPrice,
    pricing.calculatePrice,
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