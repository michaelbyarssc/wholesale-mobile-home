import React from 'react';
import { PricingProvider } from './PricingContext';
import { useAuth } from './AuthContext';

interface PricingWrapperProps {
  children: React.ReactNode;
}

export const PricingWrapper: React.FC<PricingWrapperProps> = ({ children }) => {
  const { user } = useAuth();
  
  return (
    <PricingProvider user={user}>
      {children}
    </PricingProvider>
  );
};