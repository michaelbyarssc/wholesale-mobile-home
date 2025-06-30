
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart as CartIcon, LogOut, User, Lock, Menu, Phone, Mail } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { CartItem } from '@/hooks/useShoppingCart';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  user: SupabaseUser | null;
  userProfile: { first_name?: string } | null;
  cartItems: CartItem[];
  isLoading: boolean;
  onLogout: () => void;
  onToggleCart: () => void;
  onChangePassword?: () => void;
}

export const Header = ({ 
  user, 
  userProfile, 
  cartItems, 
  isLoading, 
  onLogout, 
  onToggleCart,
}: HeaderProps) => {
  const navigate = useNavigate();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const { data: businessInfo } = useBusinessInfo();

  const displayName = userProfile?.first_name || 'User';

  const handleChangePassword = () => {
    setIsPasswordDialogOpen(true);
  };

  return (
    <>
      <header className="bg-white shadow-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-4 lg:py-6 gap-4">
            {/* Left side - Business Info */}
            <div className="flex flex-col items-start w-full lg:w-auto">
              <div className="mb-3">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
                  {businessInfo?.business_name || 'Wholesale Homes of the Carolinas'}
                </h1>
                <div className="w-16 h-1 bg-blue-600 mt-2"></div>
              </div>
              
              {/* Contact Information */}
              {(businessInfo?.business_phone || businessInfo?.business_email) && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                  {businessInfo.business_phone && (
                    <a 
                      href={`tel:${businessInfo.business_phone}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group"
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                        <Phone className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{businessInfo.business_phone}</span>
                    </a>
                  )}
                  {businessInfo.business_email && (
                    <a 
                      href={`mailto:${businessInfo.business_email}`}
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group"
                    >
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{businessInfo.business_email}</span>
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Right side - User Actions */}
            {!user ? (
              <Button 
                onClick={() => navigate('/auth')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 font-medium rounded-lg shadow-sm transition-all duration-200 w-full sm:w-auto"
              >
                Login
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="font-medium">Welcome, {displayName}</span>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-lg transition-colors"
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-lg">
                      <DropdownMenuItem onClick={handleChangePassword} className="hover:bg-gray-50">
                        <Lock className="h-4 w-4 mr-2" />
                        Change Password
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onLogout} disabled={isLoading} className="hover:bg-gray-50">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <Button
                  onClick={onToggleCart}
                  variant="outline"
                  className="relative border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 w-full sm:w-auto"
                  size="sm"
                >
                  <CartIcon className="h-4 w-4 mr-2" />
                  <span className="font-medium">Cart ({cartItems.length})</span>
                  {cartItems.length > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
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

      <PasswordChangeDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
      />
    </>
  );
};
