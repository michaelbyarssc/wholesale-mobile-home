import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileHomesShowcase } from '@/components/MobileHomesShowcase';
import { TestimonialsSection } from '@/components/reviews/TestimonialsSection';
import { FinancingCalculator } from '@/components/financing/FinancingCalculator';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/layout/HeroSection';
import { FeaturesSection } from '@/components/layout/FeaturesSection';
import { CTASection } from '@/components/layout/CTASection';
import { NewsletterCTASection } from '@/components/layout/NewsletterCTASection';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/loading/LoadingSpinner';
import { HeaderSkeleton } from '@/components/loading/HeaderSkeleton';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';

const Index = () => {
  console.log('Index component: Starting to render');
  
  const navigate = useNavigate();
  
  // State hooks first
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Shopping cart hook after user state is declared
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
  } = useShoppingCart(user);
  
  console.log('Index component: All hooks initialized', { user: user?.id, isLoading, cartItems: cartItems.length });

  useEffect(() => {
    console.log('Index component: Auth effect starting');
    let mounted = true;
    let initialCheckDone = false;

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('Index: Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
        
        // Only set loading to false if initial check is done
        if (initialCheckDone) {
          console.log('Index: Setting loading to false after auth state change');
          setIsLoading(false);
        }
      }
    );

    // Then check current session
    const checkAuth = async () => {
      try {
        console.log('Index component: Checking current session');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Index: Error getting session:', error);
        }
        
        if (!mounted) return;
        
        console.log('Index component: Initial session check complete', { hasSession: !!session, userId: session?.user?.id });
        setSession(session);
        setUser(session?.user ?? null);
        
        initialCheckDone = true;
        console.log('Index component: Setting loading to false after initial check');
        setIsLoading(false);
      } catch (error) {
        console.error('Index: Auth check error:', error);
        if (mounted) {
          setSession(null);
          setUser(null);
          initialCheckDone = true;
          console.log('Index component: Setting loading to false after error');
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      console.log('Index component: Cleaning up auth effect');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Index: Error fetching user profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Index: Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      console.log('Index: Attempting logout...');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Index: Logout error:', error);
      } else {
        console.log('Index: Logout successful');
      }
      
      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Index: Error during logout:', error);
      // Even if there's an error, clear local state and navigate
      setUser(null);
      setSession(null);
      setUserProfile(null);
      navigate('/');
    }
  };

  const handleProfileUpdated = async () => {
    // Refetch user profile after update
    if (user) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Index: Error fetching updated user profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Index: Error fetching updated user profile:', error);
      }
    }
  };

  console.log('Index component: About to render, isLoading:', isLoading, 'cartLoading:', cartLoading);

  // Now we can safely do conditional rendering since all hooks have been called
  if (isLoading || cartLoading) {
    console.log('Index component: Rendering loading spinner');
    return <LoadingSpinner />;
  }

  console.log('Index component: Rendering main content');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      {/* PWA Components */}
      <OfflineIndicator variant="alert" />
      
      <Header 
        user={user}
        userProfile={userProfile}
        cartItems={cartItems}
        isLoading={isLoading}
        onLogout={handleLogout}
        onToggleCart={toggleCart}
        onProfileUpdated={handleProfileUpdated}
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
          cartItems={cartItems}
          deliveryAddress={deliveryAddress}
          isCartOpen={isCartOpen}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
          updateServices={updateServices}
          updateHomeOptions={updateHomeOptions}
          updateDeliveryAddress={updateDeliveryAddress}
          clearCart={clearCart}
          setIsCartOpen={setIsCartOpen}
        />
      </div>

      <FeaturesSection />
      
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
      
      <TestimonialsSection />

      <NewsletterCTASection />

      <CTASection user={user} />

      {/* Bottom competitive pricing message */}
      <div className="bg-green-600 text-white py-4 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
          The absolute best deal is always ensured with our verified price match guarantee!
        </h2>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
