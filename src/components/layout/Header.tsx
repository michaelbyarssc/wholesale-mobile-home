
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart as CartIcon, LogOut } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { CartItem } from '@/hooks/useShoppingCart';

interface HeaderProps {
  user: User | null;
  userProfile: { first_name?: string } | null;
  cartItems: CartItem[];
  isLoading: boolean;
  onLogout: () => void;
  onToggleCart: () => void;
}

export const Header = ({ 
  user, 
  userProfile, 
  cartItems, 
  isLoading, 
  onLogout, 
  onToggleCart 
}: HeaderProps) => {
  const navigate = useNavigate();

  return (
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
                  onClick={onLogout}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-800 p-1 sm:p-2"
                  disabled={isLoading}
                >
                  <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1">Logout</span>
                </Button>
              </div>
              <Button
                onClick={onToggleCart}
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
  );
};
