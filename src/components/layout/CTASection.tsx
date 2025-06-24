
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';

interface CTASectionProps {
  user: User | null;
}

export const CTASection = ({ user }: CTASectionProps) => {
  const navigate = useNavigate();

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-blue-600">
      <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
        <h3 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-white mb-4 sm:mb-6">
          Ready to Explore Our Inventory?
        </h3>
        <p className="text-base sm:text-lg lg:text-xl text-blue-100 mb-6 sm:mb-8 leading-relaxed">
          {!user 
            ? "Join our platform to access wholesale pricing on mobile and modular homes for your investment projects."
            : "Browse our selection and add items to your cart to see personalized pricing for your investment needs."
          }
        </p>
        <Button 
          onClick={() => user ? document.getElementById('mobile-homes')?.scrollIntoView({ behavior: 'smooth' }) : navigate('/auth')}
          size="lg"
          variant="secondary"
          className="bg-white text-blue-600 hover:bg-gray-100 px-6 sm:px-8 py-3 sm:py-4 text-sm sm:text-base lg:text-lg w-full sm:w-auto"
        >
          {user ? 'Browse Our Inventory' : 'Login to View Pricing'}
        </Button>
      </div>
    </section>
  );
};
