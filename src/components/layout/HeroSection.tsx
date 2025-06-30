
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface HeroSectionProps {
  user: User | null;
}

export const HeroSection = ({ user }: HeroSectionProps) => {
  const navigate = useNavigate();

  return (
    <section 
      className="py-8 sm:py-12 lg:py-20 px-4 sm:px-6 lg:px-8 relative bg-gradient-to-br from-amber-50 to-orange-50"
    >
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-800 mb-3 sm:mb-4 lg:mb-6 leading-tight">
          Wholesale Mobile and Modular Home
          <span className="block text-blue-600">Sales to Investors</span>
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
          Browse our selection of mobile and modular homes. Add items to your cart and get detailed pricing for your investment projects.
        </p>
        <div className="space-y-3 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
          {!user ? (
            <>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg w-full sm:w-auto shadow-lg"
              >
                Get Started - Login Required
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg w-full sm:w-auto shadow-lg"
                onClick={() => {
                  document.getElementById('mobile-homes')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                View Our Models
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="lg"
              className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg w-full sm:w-auto shadow-lg"
              onClick={() => {
                document.getElementById('mobile-homes')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Models & Pricing
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};
