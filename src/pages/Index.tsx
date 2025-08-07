import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileHomesShowcase } from '@/components/MobileHomesShowcase';
import { TestimonialsSection } from '@/components/reviews/TestimonialsSection';
import { FinancingCalculator } from '@/components/financing/FinancingCalculator';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useSessionAwareShoppingCart } from '@/hooks/useSessionAwareShoppingCart';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedPerformanceMonitor } from '@/hooks/useOptimizedPerformanceMonitor';
import { useViewportSize } from '@/hooks/useViewportSize';
import { MultiUserHeader } from '@/components/auth/MultiUserHeader';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { HeroSection } from '@/components/layout/HeroSection';
import { FeaturesSection } from '@/components/layout/FeaturesSection';
import { CTASection } from '@/components/layout/CTASection';
import { NewsletterCTASection } from '@/components/layout/NewsletterCTASection';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';
import { HeaderSkeleton } from '@/components/loading/HeaderSkeleton';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';


import { TestimonialForm } from '@/components/reviews/TestimonialForm';
import { Button } from '@/components/ui/button';
import { FaqHomeSection } from '@/components/FaqHomeSection';
import { SEO } from '@/components/SEO';
import { SocialProofBanner } from '@/components/SocialProofBanner';
import { useUserRoles } from '@/hooks/useUserRoles';
import { MultiUserDebugPanel } from '@/components/debug/MultiUserDebugPanel';

const Index = () => {
  console.log('Index component: Starting to render');
  
  const navigate = useNavigate();
  
  // Performance and viewport hooks
  const { markFeature, measureFeature } = useOptimizedPerformanceMonitor();
  const { isMobile, isTablet } = useViewportSize();
  
  // Multi-user authentication
  const { user, userProfile, isLoading } = useAuth();
  const { isAdmin } = useUserRoles();
  
  const [showTestimonialForm, setShowTestimonialForm] = useState(false);
  
  // Session-aware shopping cart
  const {
    cartItems,
    deliveryAddress,
    isCartOpen,
    addToCart,
    removeFromCart,
    updateServices,
    updateHomeOptions,
    updateDeliveryAddress,
    clearCart,
    toggleCart,
    closeCart,
    setIsCartOpen,
    isLoading: cartLoading,
  } = useSessionAwareShoppingCart();
  
  console.log('Index component: All hooks initialized', { user: user?.id, isLoading, cartItems: cartItems.length });

  // Authentication is now handled by useAuth hook

  console.log('Index component: About to render, isLoading:', isLoading, 'cartLoading:', cartLoading);

  // Memoize structured data to prevent recreation on every render
  const homepageStructuredData = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "WholesaleMobileHome.com",
    "alternateName": "Wholesale Mobile Home",
    "url": "https://wholesalemobilehome.com",
    "description": "Browse quality mobile homes at wholesale prices. Get instant quotes, view detailed specs, and save thousands.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://wholesalemobilehome.com/?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    },
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": "15000",
      "highPrice": "150000",
      "offerCount": "50+"
    }
  }), []);

  // Memoize cart props to prevent unnecessary re-renders
  const cartProps = useMemo(() => ({
    cartItems,
    deliveryAddress,
    isCartOpen,
    addToCart,
    removeFromCart,
    updateServices,
    updateHomeOptions,
    updateDeliveryAddress,
    clearCart,
    setIsCartOpen,
  }), [cartItems, deliveryAddress, isCartOpen, addToCart, removeFromCart, updateServices, updateHomeOptions, updateDeliveryAddress, clearCart, setIsCartOpen]);

  // Now we can safely do conditional rendering since all hooks have been called
  if (isLoading || cartLoading) {
    console.log('Index component: Rendering loading spinner');
    return <LoadingSpinner />;
  }

  console.log('Index component: Rendering main content');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      <SEO 
        title="Wholesale Mobile Homes for Sale | Quality Homes at Best Prices"
        description="Browse quality mobile homes at wholesale prices. Get instant quotes, view detailed specs, and save thousands. Clayton, Champion, and Fleetwood homes available with financing options."
        keywords="mobile homes for sale, wholesale mobile homes, manufactured homes, modular homes, clayton homes, champion homes, fleetwood homes, mobile home financing, affordable housing, single wide, double wide"
        structuredData={homepageStructuredData}
      />
      {/* PWA Components */}
      <OfflineIndicator variant="alert" />
      
      <MultiUserHeader
        cartItems={cartItems}
        isLoading={isLoading}
        onToggleCart={toggleCart}
      />



      {/* Top competitive pricing message */}
      <div className="bg-green-600 text-white py-4 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
          The absolute best deal is always ensured with our verified price match guarantee!
        </h2>
      </div>

      <HeroSection user={user} />

      {/* PWA Install Prompt */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <InstallPrompt variant="inline" />
      </div>

      <div id="mobile-homes">
        <MobileHomesShowcase 
          user={user}
          {...cartProps}
        />
      </div>

      <FeaturesSection />

      {/* Social Proof Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join the growing community of satisfied customers who have found their perfect home with us
            </p>
          </div>
          
          <SocialProofBanner variant="embedded" />
        </div>
      </section>
      
      {/* Financing Calculator Section */}
      <section className="py-16 bg-gradient-to-r from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Calculate Your Monthly Payments
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Get an instant estimate of your financing options for your dream mobile home
            </p>
          </div>
          <FinancingCalculator />
        </div>
      </section>
      
          {/* Enhanced Testimonials Section */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Real stories from real customers who found their perfect mobile home with us
            </p>
          </div>
          
          {/* Share Your Experience Button/Form - Always visible */}
          <div className="mt-12">
            {!showTestimonialForm ? (
              <div className="text-center">
                <Button
                  onClick={() => setShowTestimonialForm(true)}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl"
                >
                  Share Your Experience
                </Button>
                <p className="mt-3 text-sm text-gray-600">
                  Have a great experience with us? Let others know!
                </p>
              </div>
            ) : (
              <TestimonialForm
                onSuccess={() => setShowTestimonialForm(false)}
                onCancel={() => setShowTestimonialForm(false)}
              />
            )}
          </div>
        </div>
      </section>

      <FaqHomeSection />

      <NewsletterCTASection />

      <CTASection user={user} />

      {/* Bottom competitive pricing message */}
      <div className="bg-green-600 text-white py-4 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
          The absolute best deal is always ensured with our verified price match guarantee!
        </h2>
      </div>


      {/* Chat Widget */}
      <ChatWidget userId={user?.id} />

      {/* Development debugging panels */}
      {/* <MultiUserDebugPanel /> */}

      <Footer />
    </div>
  );
};

export default Index;
