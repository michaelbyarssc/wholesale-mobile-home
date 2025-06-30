
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
      className="py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 relative bg-cover bg-center bg-no-repeat min-h-[60vh] sm:min-h-[70vh] flex items-center"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2158&q=80)'
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10 w-full">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 sm:mb-6 lg:mb-8 leading-tight drop-shadow-lg">
          Wholesale Mobile and Modular Home
          <span className="block text-blue-300 mt-2">Sales to Investors</span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl lg:text-xl text-gray-100 mb-8 sm:mb-10 lg:mb-12 max-w-3xl mx-auto leading-relaxed drop-shadow-md px-4">
          Browse our selection of mobile and modular homes. Add items to your cart and get detailed pricing for your investment projects.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center px-4">
          {!user ? (
            <>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-lg min-h-[52px] sm:min-h-[56px]"
              >
                Get Started - Login Required
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-lg bg-white bg-opacity-10 backdrop-blur-sm min-h-[52px] sm:min-h-[56px]"
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
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-6 sm:px-8 py-4 sm:py-5 text-base sm:text-lg font-semibold w-full sm:w-auto shadow-lg bg-white bg-opacity-10 backdrop-blur-sm min-h-[52px] sm:min-h-[56px]"
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
