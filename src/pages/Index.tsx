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
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { cartItems, toggleCart } = useShoppingCart();

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // Then check current session
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setUser(null);
        } else {
          console.log('Current session:', session?.user?.id);
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    return () => subscription.unsubscribe();
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
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
        } else {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      console.log('Attempting logout...');
      
      // Clear local state immediately
      setUser(null);
      setSession(null);
      setUserProfile(null);
      
      // Attempt to sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
        // Even if there's an error, we've cleared local state
      } else {
        console.log('Logout successful');
      }
      
      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, clear local state and navigate
      setUser(null);
      setSession(null);
      setUserProfile(null);
      navigate('/');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

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

      <HeroSection user={user} />

      <div id="mobile-homes">
        <MobileHomesShowcase user={user} />
      </div>

      <FeaturesSection />

      <CTASection user={user} />

      <Footer />
    </div>
  );
};

export default Index;
