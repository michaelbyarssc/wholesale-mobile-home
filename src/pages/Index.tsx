
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
  const [userProfile, setUserProfile] = useState<{ first_name?: string, last_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
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
    let mounted = true;

    const checkAuthState = async () => {
      try {
        console.log('🔍 Index: Checking initial auth state...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Index: Error getting session:', error);
          if (mounted) {
            setUser(null);
            setUserProfile(null);
            clearCart();
            setIsLoading(false);
            setAuthChecked(true);
          }
          return;
        }

        if (mounted) {
          if (session?.user) {
            console.log('✅ Index: User found:', session.user.email);
            setUser(session.user);
            await fetchUserProfile(session.user.id);
          } else {
            console.log('ℹ️ Index: No session found');
            setUser(null);
            setUserProfile(null);
            clearCart();
          }
          setIsLoading(false);
          setAuthChecked(true);
        }
      } catch (error) {
        console.error('❌ Index: Exception in auth check:', error);
        if (mounted) {
          setUser(null);
          setUserProfile(null);
          clearCart();
          setIsLoading(false);
          setAuthChecked(true);
        }
      }
    };

    if (!authChecked) {
      checkAuthState();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Index: Auth state changed:', event, session?.user?.email);
      
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      } else {
        console.log('🔄 Index: User logged out, clearing state');
        setUser(null);
        setUserProfile(null);
        clearCart();
      }
      
      if (event !== 'INITIAL_SESSION') {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [authChecked, clearCart]);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('👤 Index: Fetching user profile for ID:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Index: Error fetching user profile:', error);
        
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Index: No profile found, setting default');
          setUserProfile({ first_name: 'User', last_name: '' });
        } else {
          // For other errors, set a fallback
          setUserProfile({ first_name: 'User', last_name: '' });
        }
        return;
      }

      console.log('✅ Index: User profile fetched successfully:', data);
      setUserProfile(data);
    } catch (error) {
      console.error('❌ Index: Exception in fetchUserProfile:', error);
      setUserProfile({ first_name: 'User', last_name: '' });
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Index: Starting logout process...');
      setIsLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Index: Logout error:', error);
        throw error;
      }
      
      console.log('✅ Index: Logout successful');
      
      // Clear state immediately
      setUser(null);
      setUserProfile(null);
      clearCart();
      
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error: any) {
      console.error('❌ Index: Logout failed:', error);
      toast({
        title: "Logout failed",
        description: error.message || "Failed to log out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  console.log('🏠 Index: Current state:', {
    user: user?.email,
    userProfile,
    isLoading,
    authChecked
  });

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
