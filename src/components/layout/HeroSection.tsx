
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
    <section className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
          Wholesale Mobile and Modular Home
          <span className="block text-blue-600">sales to Investors</span>
        </h2>
        <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
          Browse our selection of mobile and modular homes. Add items to your cart and get detailed pricing for your investment projects.
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
          )}
        </div>
      </div>
    </section>
  );
};
