
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
      className="py-8 sm:py-12 lg:py-20 px-4 sm:px-6 lg:px-8 relative bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1721322800607-8c38375eef04?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=3011&q=80)'
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 sm:mb-4 lg:mb-6 leading-tight drop-shadow-lg">
          Wholesale Mobile and Modular Home
          <span className="block text-blue-300">Sales to Investors</span>
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-gray-100 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
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
                className="border-white text-white hover:bg-white hover:text-blue-600 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg w-full sm:w-auto shadow-lg bg-white bg-opacity-10 backdrop-blur-sm"
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
              className="border-white text-white hover:bg-white hover:text-blue-600 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg w-full sm:w-auto shadow-lg bg-white bg-opacity-10 backdrop-blur-sm"
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
