
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
      className="py-8 sm:py-12 lg:py-16 xl:py-20 px-4 sm:px-6 lg:px-8 relative bg-cover bg-center bg-no-repeat min-h-[50vh] sm:min-h-[60vh] lg:min-h-[70vh] flex items-center"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2158&q=80)'
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      
      <div className="max-w-4xl mx-auto text-center relative z-10 w-full">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 sm:mb-4 lg:mb-6 leading-tight drop-shadow-lg">
          Wholesale Mobile and Modular Home
          <span className="block text-blue-300 mt-1 sm:mt-2">Sales to Investors</span>
        </h2>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-100 mb-6 sm:mb-8 lg:mb-10 max-w-3xl mx-auto leading-relaxed drop-shadow-md px-2 sm:px-4">
          Browse our selection of mobile and modular homes. Add items to your cart and get detailed pricing for your investment projects.
        </p>
        
        <div className="flex flex-col  gap-3 sm:gap-4 lg:flex-row lg:gap-6 justify-center items-center px-2 sm:px-4">
          {!user ? (
            <>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-sm sm:text-base lg:text-lg font-semibold w-full sm:w-auto shadow-lg min-h-[48px] sm:min-h-[52px] lg:min-h-[56px] touch-manipulation"
              >
                Get Started - Login Required
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-sm sm:text-base lg:text-lg font-semibold w-full sm:w-auto shadow-lg bg-white bg-opacity-10 backdrop-blur-sm min-h-[48px] sm:min-h-[52px] lg:min-h-[56px] touch-manipulation"
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
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-5 text-sm sm:text-base lg:text-lg font-semibold w-full sm:w-auto shadow-lg bg-white bg-opacity-10 backdrop-blur-sm min-h-[48px] sm:min-h-[52px] lg:min-h-[56px] touch-manipulation"
              onClick={() => {
                document.getElementById('mobile-homes')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Models & Pricing
            </Button>
          )}
        </div>
        
        {/* Mobile-specific call to action */}
        <div className="mt-6 sm:hidden">
          <p className="text-sm text-gray-200 mb-3">
            Questions? Call us now!
          </p>
          <Button
            onClick={() => window.location.href = 'tel:864-680-4030'}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-base font-semibold shadow-lg touch-manipulation"
          >
            📞 Call (864) 680-4030
          </Button>
        </div>
      </div>
    </section>
  );
};
