import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart as CartIcon, LogOut, User, Lock, Menu, Phone, Mail, X, Download, Calendar, Home, FileText, Truck } from 'lucide-react';
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

  const displayName = userProfile?.first_name || 'Michael';

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
      <header className="bg-white shadow-sm border-b border-gray-100 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Left side - Brand */}
            <div className="flex-1 min-w-0">
              <Link to="/" className="block group">
                <h1 className="text-base sm:text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                  WholesaleMobileHome.com
                </h1>
                <div className="w-16 h-1 bg-blue-600 mt-1 group-hover:w-20 transition-all duration-300"></div>
              </Link>
              
              {/* Simplified Contact - Desktop only */}
              <div className="hidden lg:flex items-center gap-6 mt-3">
                <Link 
                  to="/track-delivery"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span className="font-medium">Track Delivery</span>
                </Link>
                <Link 
                  to="/driver"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Truck className="h-4 w-4" />
                  <span className="font-medium">Driver App</span>
                </Link>
                <a 
                  href="tel:864-680-4030"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span className="font-medium">864-680-4030</span>
                </a>
                <a 
                  href="mailto:Info@WholesaleMobileHome.com"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Contact Us</span>
                </a>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Home Icon - Always visible, enhanced for mobile */}
              <Link
                to="/"
                className="flex items-center justify-center p-3 sm:p-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px]"
                title="Go to Home"
              >
                <Home className="h-6 w-6 sm:h-5 sm:w-5" />
              </Link>
              
              {!user ? (
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate('/auth');
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2.5 font-medium rounded-lg shadow-sm transition-all duration-200 touch-manipulation"
                >
                  Login
                </Button>
              ) : (
                <>
                  {/* Desktop User Menu */}
                  <div className="hidden lg:flex items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="font-medium">Welcome, {displayName}</span>
                    </div>

                    {/* Appointments Link */}
                    <Link 
                      to="/appointments" 
                      className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Book A Call</span>
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
                          <Link to="/transactions" className="flex items-center w-full hover:bg-gray-50 px-2 py-2">
                            <FileText className="h-4 w-4 mr-2" />
                            My Transactions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
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
                      className="relative border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 px-4 py-2 touch-manipulation"
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

                  {/* Mobile Actions */}
                  <Button
                    onClick={onToggleCart}
                    variant="outline"
                    className="relative border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 lg:hidden p-3 touch-manipulation"
                    size="sm"
                  >
                    <CartIcon className="h-5 w-5" />
                    {cartItems.length > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
                      >
                        {cartItems.length}
                      </Badge>
                    )}
                  </Button>

                  <Button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    variant="ghost"
                    className="lg:hidden p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 touch-manipulation"
                    size="sm"
                  >
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Simplified Mobile Menu */}
          {user && isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4 space-y-3 animate-fade-in">
              {/* User Info */}
              <div className="flex items-center gap-3 px-4">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
                <span className="font-medium text-gray-700">Welcome, {displayName}</span>
              </div>

              {/* Quick Actions */}
              <div className="space-y-2 px-4">
                <Link
                  to="/appointments"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Book A Call</span>
                </Link>
                <Link
                  to="/transactions"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">My Transactions</span>
                </Link>
                <Link
                  to="/driver"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Truck className="h-4 w-4" />
                  <span className="font-medium">Driver App</span>
                </Link>
                <Link
                  to="/faq"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <span className="font-medium">FAQ</span>
                </Link>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 px-4 pt-2 border-t border-gray-100">
                <a 
                  href="tel:864-680-4030"
                  className="flex items-center gap-3 p-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span className="font-medium">864-680-4030</span>
                </a>
                <a 
                  href="mailto:Info@WholesaleMobileHome.com"
                  className="flex items-center gap-3 p-3 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  <span className="font-medium">Contact Us</span>
                </a>
              </div>

              {/* Account Actions */}
              <div className="space-y-2 px-4 pt-2 border-t border-gray-100">
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
                  className="w-full justify-start text-left p-3 hover:bg-gray-50"
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
                  className="w-full justify-start text-left p-3 hover:bg-gray-50"
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
