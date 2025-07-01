
import React from 'react';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/layout/HeroSection';
import { FeaturesSection } from '@/components/layout/FeaturesSection';
import { MobileHomesShowcase } from '@/components/MobileHomesShowcase';
import { CTASection } from '@/components/layout/CTASection';
import { Footer } from '@/components/layout/Footer';
import { PhoneNumberDialog } from '@/components/auth/PhoneNumberDialog';
import { usePhoneNumberCheck } from '@/hooks/usePhoneNumberCheck';

const Index = () => {
  const {
    showPhoneDialog,
    handlePhoneAdded,
    handleCloseDialog,
  } = usePhoneNumberCheck();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HeroSection />
      <MobileHomesShowcase />
      <FeaturesSection />
      <CTASection />
      <Footer />
      
      <PhoneNumberDialog
        isOpen={showPhoneDialog}
        onClose={handleCloseDialog}
        onPhoneAdded={handlePhoneAdded}
      />
    </div>
  );
};

export default Index;
