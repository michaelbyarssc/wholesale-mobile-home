import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Calendar, ShoppingCart } from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface StickyMobileNavProps {
  user: User | null;
  cartCount: number;
  onCartToggle: () => void;
}

export const StickyMobileNav = ({ user, cartCount, onCartToggle }: StickyMobileNavProps) => {
  const navigate = useNavigate();
  
  const handleCall = () => {
    window.location.href = 'tel:864-680-4030';
  };

  const handleChat = () => {
    // Open chat widget or navigate to contact form
    document.dispatchEvent(new CustomEvent('openChat'));
  };

  const handleAppointment = () => {
    if (user) {
      navigate('/appointments');
    } else {
      navigate('/auth');
    }
  };

  return (
    <>
      {/* Mobile Sticky Navigation - Only show on mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg lg:hidden">
        <div className="grid grid-cols-4 gap-1 p-2">
          {/* Call Button */}
          <Button
            onClick={handleCall}
            variant="ghost"
            className="flex flex-col items-center justify-center h-14 px-2 py-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors touch-manipulation"
          >
            <Phone className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Call</span>
          </Button>

          {/* Chat Button */}
          <Button
            onClick={handleChat}
            variant="ghost"
            className="flex flex-col items-center justify-center h-14 px-2 py-3 text-gray-600 hover:text-green-600 hover:bg-green-50 transition-colors touch-manipulation"
          >
            <MessageCircle className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Chat</span>
          </Button>

          {/* Appointment Button */}
          <Button
            onClick={handleAppointment}
            variant="ghost"
            className="flex flex-col items-center justify-center h-14 px-2 py-3 text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors touch-manipulation"
          >
            <Calendar className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Book</span>
          </Button>

          {/* Cart Button */}
          <Button
            onClick={onCartToggle}
            variant="ghost"
            className="relative flex flex-col items-center justify-center h-14 px-2 py-3 text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors touch-manipulation"
          >
            <ShoppingCart className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">Cart</span>
            {cartCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount > 9 ? '9+' : cartCount}
              </div>
            )}
          </Button>
        </div>
      </div>

      {/* Add padding to body to account for sticky nav */}
      <div className="h-16 lg:hidden"></div>
    </>
  );
};