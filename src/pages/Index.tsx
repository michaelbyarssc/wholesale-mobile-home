
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileHomesShowcase } from '@/components/MobileHomesShowcase';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/layout/HeroSection';
import { FeaturesSection } from '@/components/layout/FeaturesSection';
import { CTASection } from '@/components/layout/CTASection';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/layout/LoadingSpinner';

const Index = () => {
  console.log('Index component: Starting to render');
  
  const navigate = useNavigate();
  
  // ALL hooks must be called at the top level before any conditional logic
  const {
    cartItems,
    isCartOpen,
    addToCart,
    removeFromCart,
    updateServices,
    updateHomeOptions,
    clearCart,
    toggleCart,
    closeCart,
    setIsCartOpen,
    isLoading: cartLoading,
  } = useShoppingCart();

  // State hooks after shopping cart hook
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
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

  console.log('Index component: About to render, isLoading:', isLoading, 'cartLoading:', cartLoading);

  // Conditional rendering only after all hooks have been called
  if (isLoading || cartLoading) {
    console.log('Index component: Rendering loading spinner');
    return <LoadingSpinner />;
  }

  console.log('Index component: Rendering main content');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      <Header 
        user={user}
        userProfile={userProfile}
        cartItems={cartItems}
        isLoading={isLoading}
        onLogout={handleLogout}
        onToggleCart={toggleCart}
      />

      {/* Top competitive pricing message */}
      <div className="bg-green-600 text-white py-4 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
          The absolute best deal is always ensured with our verified price match guarantee!
        </h2>
      </div>

      <HeroSection user={user} />

      <div id="mobile-homes">
        <MobileHomesShowcase 
          user={user}
          cartItems={cartItems}
          isCartOpen={isCartOpen}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
          updateServices={updateServices}
          updateHomeOptions={updateHomeOptions}
          clearCart={clearCart}
          setIsCartOpen={setIsCartOpen}
        />
      </div>

      <FeaturesSection />

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
