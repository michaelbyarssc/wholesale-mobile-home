
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
      className="relative bg-cover bg-center bg-no-repeat min-h-[60vh] sm:min-h-[70vh] lg:min-h-[80vh] flex items-center mobile-safe-area"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2158&q=80)'
      }}
    >
      {/* Enhanced overlay for better mobile readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/50"></div>
      
      <div className="container mx-auto mobile-container relative z-10 text-center">
        {/* Mobile-first responsive heading */}
        <h1 className="text-fluid-3xl sm:text-fluid-4xl lg:text-fluid-5xl font-bold text-white mb-fluid-sm leading-[1.1] drop-shadow-2xl">
          <span className="block">Wholesale Mobile and</span>
          <span className="block text-blue-300 animate-fade-in">Modular Home Sales</span>
          <span className="block text-fluid-xl sm:text-fluid-2xl lg:text-fluid-3xl font-medium text-blue-100 mt-2">
            to Investors
          </span>
        </h1>
        
        {/* Enhanced mobile description */}
        <p className="text-fluid-sm sm:text-fluid-base lg:text-fluid-lg text-gray-100 mb-fluid-lg max-w-4xl mx-auto leading-relaxed drop-shadow-lg">
          Browse our selection of quality mobile and modular homes. Get instant pricing, detailed specifications, and professional support for your investment projects.
        </p>
        
        {/* Mobile-optimized action buttons */}
        <div className="flex flex-col space-fluid-sm sm:flex-row sm:justify-center sm:space-fluid-md max-w-2xl mx-auto">
          {!user ? (
            <>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white mobile-button shadow-2xl transition-all duration-300 hover:shadow-blue-500/25 hover:scale-105 active:scale-95 touch-manipulation border-0"
              >
                <span className="text-fluid-base font-semibold">Get Started - Login Required</span>
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-white/80 text-white hover:bg-white hover:text-blue-600 active:bg-gray-100 mobile-button shadow-2xl bg-white/10 backdrop-blur-md transition-all duration-300 hover:shadow-white/25 hover:scale-105 active:scale-95 touch-manipulation"
                onClick={() => {
                  document.getElementById('mobile-homes')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <span className="text-fluid-base font-semibold">View Our Models</span>
              </Button>
            </>
          ) : (
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-white/80 text-white hover:bg-white hover:text-blue-600 active:bg-gray-100 mobile-button shadow-2xl bg-white/10 backdrop-blur-md transition-all duration-300 hover:shadow-white/25 hover:scale-105 active:scale-95 touch-manipulation"
              onClick={() => {
                document.getElementById('mobile-homes')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span className="text-fluid-base font-semibold">View Models & Pricing</span>
            </Button>
          )}
        </div>
        
        {/* Enhanced mobile call-to-action */}
        <div className="mt-fluid-lg sm:mt-fluid-xl lg:hidden animate-slide-up">
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-fluid-md border border-white/10">
            <p className="text-fluid-sm text-blue-100 mb-fluid-sm font-medium">
              Need immediate assistance?
            </p>
            <Button
              onClick={() => window.location.href = 'tel:864-680-4030'}
              className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white mobile-button shadow-xl transition-all duration-300 hover:shadow-green-500/25 hover:scale-105 active:scale-95 touch-manipulation w-full"
            >
              <span className="text-fluid-base font-semibold">📞 Call (864) 680-4030</span>
            </Button>
          </div>
        </div>
        
        {/* Mobile scroll indicator */}
        <div className="absolute bottom-fluid-md left-1/2 transform -translate-x-1/2 lg:hidden animate-mobile-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
