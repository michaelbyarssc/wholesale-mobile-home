
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart as CartIcon, LogOut, User, Lock, Menu, Phone, Mail, X, Download, MessageCircle, Calendar } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { CartItem } from '@/hooks/useShoppingCart';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { UserSettingsDialog } from '@/components/auth/UserSettingsDialog';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import { usePWA } from '@/hooks/usePWA';
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
  onProfileUpdated?: () => void;
}

export const Header = ({ 
  user, 
  userProfile, 
  cartItems, 
  isLoading, 
  onLogout, 
  onToggleCart,
  onProfileUpdated,
}: HeaderProps) => {
  const navigate = useNavigate();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: businessInfo } = useBusinessInfo();
  const { canInstall, installApp } = usePWA();

  const displayName = userProfile?.first_name || 'User';

  const handleChangePassword = () => {
    setIsPasswordDialogOpen(true);
  };

  const handleProfileUpdated = () => {
    if (onProfileUpdated) {
      onProfileUpdated();
    }
  };

  const handleInstallApp = async () => {
    try {
      await installApp();
    } catch (error) {
      console.error('Failed to install app:', error);
    }
  };

  return (
    <>
      <header className="bg-white shadow-md border-b border-gray-100 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 lg:py-4">
            {/* Left side - Business Info */}
            <div className="flex-1 min-w-0">
              <div className="mb-2 lg:mb-3">
                <Link to="/" className="block">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight leading-tight truncate hover:text-blue-600 transition-colors cursor-pointer">
                    WholesaleMobileHome.com
                  </h1>
                  <div className="w-12 sm:w-16 h-1 bg-blue-600 mt-1 lg:mt-2"></div>
                </Link>
              </div>
              
              {/* Contact Information */}
              <div className="hidden md:flex flex-col lg:flex-row gap-2 lg:gap-6">
                <a 
                  href="tel:864-680-4030"
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group"
                >
                  <div className="flex items-center justify-center w-7 h-7 lg:w-8 lg:h-8 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                    <Phone className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-sm lg:text-base">864-680-4030</span>
                </a>
                <a 
                  href="mailto:Info@WholesaleMobileHome.com"
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors group"
                >
                  <div className="flex items-center justify-center w-7 h-7 lg:w-8 lg:h-8 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                    <Mail className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-sm lg:text-base">Info@WholesaleMobileHome.com</span>
                </a>
              </div>
              
              {/* Navigation Links */}
              <div className="hidden lg:flex items-center gap-6 mt-2">
                <Link 
                  to="/" 
                  className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                  Home
                </Link>
                <Link 
                  to="/faq" 
                  className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                >
                  FAQ
                </Link>
              </div>
            </div>

            {/* Right side - User Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {!user ? (
                <>
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Login button clicked, navigating to /auth');
                      navigate('/auth');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-6 py-2 sm:py-2.5 font-medium rounded-lg shadow-sm transition-all duration-200 text-sm sm:text-base cursor-pointer"
                  >
                    <span className="hidden sm:inline">Login</span>
                    <span className="sm:hidden">Login</span>
                  </Button>
                </>
              ) : (
                <>
                  {/* Desktop User Menu */}
                  <div className="hidden lg:flex items-center gap-3">
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="font-medium">Welcome, {displayName}</span>
                    </div>

                    {/* Appointments Link */}
                    <Link 
                      to="/appointments" 
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Book Viewing</span>
                    </Link>

                    {/* PWA Install Button */}
                    {canInstall && (
                      <Button
                        onClick={handleInstallApp}
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary/30 hover:bg-primary/10"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Install App
                      </Button>
                    )}
                    
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
                        <DropdownMenuItem asChild>
                          <UserSettingsDialog 
                            user={user} 
                            userProfile={userProfile} 
                            onProfileUpdated={handleProfileUpdated}
                          />
                        </DropdownMenuItem>
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
                    
                    <Button
                      onClick={onToggleCart}
                      variant="outline"
                      className="relative border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
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

                  {/* Mobile Cart Button */}
                  <Button
                    onClick={onToggleCart}
                    variant="outline"
                    className="relative border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 lg:hidden p-2"
                    size="sm"
                  >
                    <CartIcon className="h-4 w-4" />
                    {cartItems.length > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                      >
                        {cartItems.length}
                      </Badge>
                    )}
                  </Button>

                  {/* Mobile Menu Button */}
                  <Button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    variant="ghost"
                    className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                    size="sm"
                  >
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {user && isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4 space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 px-2">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <span className="font-medium text-gray-700">Welcome, {displayName}</span>
              </div>

              {/* Contact Info on Mobile */}
              <div className="space-y-3 px-2 pt-2 border-t border-gray-100">
                <a 
                  href="tel:864-680-4030"
                  className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-full">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">864-680-4030</span>
                </a>
                <a 
                  href="mailto:Info@WholesaleMobileHome.com"
                  className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-full">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">Info@WholesaleMobileHome.com</span>
                </a>
              </div>

              {/* Navigation Links for Mobile */}
              <div className="space-y-2 px-2 pt-2 border-t border-gray-100">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <span className="font-medium">Home</span>
                </Link>
                <Link
                  to="/faq"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <span className="font-medium">FAQ</span>
                </Link>
              </div>

              {/* Menu Actions */}
              <div className="space-y-2 px-2 pt-2 border-t border-gray-100">
                <UserSettingsDialog 
                  user={user} 
                  userProfile={userProfile} 
                  onProfileUpdated={() => {
                    handleProfileUpdated();
                    setIsMobileMenuOpen(false);
                  }}
                />
                <Button
                  onClick={() => {
                    handleChangePassword();
                    setIsMobileMenuOpen(false);
                  }}
                  variant="ghost"
                  className="w-full justify-start text-left p-3"
                >
                  <Lock className="h-4 w-4 mr-3" />
                  Change Password
                </Button>
                <Button
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoading}
                  variant="ghost"
                  className="w-full justify-start text-left p-3"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      <PasswordChangeDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
      />
    </>
  );
};
