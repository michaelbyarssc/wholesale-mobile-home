
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Shield, Users, Zap, ShoppingCart as CartIcon, LogOut } from 'lucide-react';
import { MobileHomesShowcase } from '@/components/MobileHomesShowcase';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { useShoppingCart } from '@/hooks/useShoppingCart';

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<{ first_name?: string } | null>(null);
  const { cartItems, toggleCart } = useShoppingCart();

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

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
    await supabase.auth.signOut();
    navigate('/');
  };

  const features = [
    {
      icon: <CheckCircle className="h-8 w-8 text-green-600" />,
      title: "Professional Estimates",
      description: "Get accurate, detailed estimates for your mobile home needs with our professional assessment process."
    },
    {
      icon: <Shield className="h-8 w-8 text-blue-600" />,
      title: "Trusted Service",
      description: "Years of experience in the mobile home industry with a proven track record of satisfied customers."
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "Expert Team",
      description: "Our certified professionals provide personalized service tailored to your specific requirements."
    },
    {
      icon: <Zap className="h-8 w-8 text-yellow-600" />,
      title: "Quick Process",
      description: "Streamlined estimation process that saves you time while ensuring accuracy and completeness."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4 sm:gap-0">
            <div className="flex items-center">
              <h1 className="text-xl sm:text-2xl font-bold text-blue-900">
                Wholesale Homes of the Carolinas
              </h1>
            </div>
            {!user ? (
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 w-full sm:w-auto"
              >
                Login
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <span className="text-gray-700">
                    Welcome back{userProfile?.first_name ? `, ${userProfile.first_name}` : ''}!
                  </span>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800 p-1 sm:p-2"
                  >
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="sr-only sm:not-sr-only sm:ml-1">Logout</span>
                  </Button>
                </div>
                <Button
                  onClick={toggleCart}
                  variant="outline"
                  className="relative w-full sm:w-auto"
                  size="sm"
                >
                  <CartIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="text-sm">Cart ({cartItems.length})</span>
                  {cartItems.length > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-5 w-5 sm:h-6 sm:w-6 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {cartItems.length}
                    </Badge>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Professional Mobile Home
            <span className="block text-blue-600">Estimation Services</span>
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Get accurate, professional estimates for your mobile home projects. 
            Our expert team provides detailed assessments tailored to your specific needs.
          </p>
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
            {!user ? (
              <>
                <Button 
                  onClick={() => navigate('/auth')}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
                >
                  Get Started - Login Required
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
                  onClick={() => {
                    document.getElementById('mobile-homes')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  View Our Models
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => navigate('/estimate')}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
                >
                  Get Your Estimate
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg w-full sm:w-auto"
                  onClick={() => {
                    document.getElementById('mobile-homes')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  View Models & Pricing
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Homes Showcase */}
      <div id="mobile-homes">
        <MobileHomesShowcase user={user} />
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Our Services?
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We provide comprehensive mobile home services with a focus on quality, 
              reliability, and customer satisfaction.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h4>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-white mb-6">
            Ready to Get Your Estimate?
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            {!user 
              ? "Join our platform to access professional mobile home estimation services with transparent pricing and expert guidance."
              : "Access professional mobile home estimation services with your personalized pricing and expert guidance."
            }
          </p>
          <Button 
            onClick={() => user ? navigate('/estimate') : navigate('/auth')}
            size="lg"
            variant="secondary"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg"
          >
            {user ? 'Get Your Estimate' : 'Login to View Pricing'}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h4 className="text-2xl font-bold mb-4">
              Wholesale Homes of the Carolinas
            </h4>
            <p className="text-gray-400 mb-6">
              Professional mobile home services you can trust
            </p>
            <div className="border-t border-gray-800 pt-6">
              <p className="text-gray-500 text-sm">
                © 2024 Wholesale Homes of the Carolinas. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
