import React, { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/layout/HeroSection';
import { FeaturesSection } from '@/components/layout/FeaturesSection';
import { MobileHomesShowcase } from '@/components/MobileHomesShowcase';
import { CTASection } from '@/components/layout/CTASection';
import { Footer } from '@/components/layout/Footer';
import { PhoneNumberDialog } from '@/components/auth/PhoneNumberDialog';
import { PriceMatchAlert } from '@/components/PriceMatchAlert';
import { usePhoneNumberCheck } from '@/hooks/usePhoneNumberCheck';
import { useShoppingCart } from '@/hooks/useShoppingCart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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
  } = useShoppingCart();

  const {
    showPhoneDialog,
    handlePhoneAdded,
    handleCloseDialog,
  } = usePhoneNumberCheck();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
        clearCart();
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Logout failed",
        description: error.message || "Failed to log out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header 
        user={user}
        userProfile={userProfile}
        cartItems={cartItems}
        isLoading={isLoading}
        onLogout={handleLogout}
        onToggleCart={toggleCart}
      />
      <PriceMatchAlert />
      <HeroSection user={user} />
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
      <FeaturesSection />
      <CTASection user={user} />
      <PriceMatchAlert />
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
