import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShoppingCart as CartIcon, 
  LogOut, 
  User, 
  Lock, 
  Menu, 
  Phone, 
  Mail, 
  X, 
  Download, 
  Calendar, 
  Home, 
  FileText, 
  UserPlus,
  Users,
  ChevronDown
} from 'lucide-react';
import { CartItem } from '@/hooks/useShoppingCart';
import { PasswordChangeDialog } from '@/components/auth/PasswordChangeDialog';
import { UserSettingsDialog } from '@/components/auth/UserSettingsDialog';
import { ForceLogoutButton } from '@/components/auth/ForceLogoutButton';
import { useBusinessInfo } from '@/hooks/useBusinessInfo';
import { usePWA } from '@/hooks/usePWA';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MultiUserHeaderProps {
  cartItems: CartItem[];
  isLoading: boolean;
  onToggleCart: () => void;
  onProfileUpdated?: () => void;
}

export const MultiUserHeader = ({ 
  cartItems, 
  isLoading, 
  onToggleCart,
  onProfileUpdated,
}: MultiUserHeaderProps) => {
  const navigate = useNavigate();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: businessInfo } = useBusinessInfo();
  const { canInstall, installApp } = usePWA();
  
  const {
    user,
    userProfile,
    sessions,
    activeSession,
    switchToSession,
    signOut,
    signOutAll,
    hasMultipleSessions,
    fetchUserProfile,
    activeSessionId,
    supabaseClient,
    isSigningOut
  } = useAuth();

  // Optimized display name with progressive loading
  const [displayState, setDisplayState] = useState<'loading' | 'email' | 'profile'>('loading');

  // Progressive display name with memoization
  const getDisplayName = React.useMemo(() => {
    // If signing out, show signing out message
    if (isSigningOut) {
      return 'Signing out...';
    }

    // If we have profile data, prioritize first_name
    if (userProfile?.first_name) {
      return userProfile.last_name ? `${userProfile.first_name} ${userProfile.last_name}` : userProfile.first_name;
    }
    
    // If we only have last_name
    if (userProfile?.last_name) {
      return userProfile.last_name;
    }
    
    // Show email prefix while profile loads, but only briefly
    if (user?.email) {
      return user.email.split('@')[0];
    }
    
    return 'User';
  }, [userProfile, user?.email, isSigningOut]);

  // Track display state for smooth transitions
  React.useEffect(() => {
    if (isSigningOut) {
      setDisplayState('loading');
    } else if (userProfile?.first_name || userProfile?.last_name) {
      setDisplayState('profile');
    } else if (user?.email) {
      setDisplayState('email');
    } else {
      setDisplayState('loading');
    }
  }, [userProfile, user?.email, isSigningOut]);

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

  const handleAddUser = () => {
    navigate('/auth?mode=add');
  };

  const handleSwitchSession = (sessionId: string) => {
    switchToSession(sessionId);
  };

  const handleSignOut = async () => {
    console.log('🚨 HEADER: User clicked sign out, sessions:', sessions.length);
    
    try {
      if (hasMultipleSessions) {
        console.log('🚨 HEADER: Multiple sessions detected, signing out current user');
        await signOut();
      } else {
        console.log('🚨 HEADER: Single session, signing out all');
        await signOutAll();
      }
    } catch (error) {
      console.error('🚨 HEADER: Sign out error, forcing page reload:', error);
      // Emergency fallback - force page reload
      window.location.href = '/';
    }
  };

  const handleSignOutAll = async () => {
    console.log('🚨 HEADER: User clicked sign out all');
    try {
      await signOutAll();
    } catch (error) {
      console.error('🚨 HEADER: Sign out all error, forcing page reload:', error);
      // Emergency fallback
      window.location.href = '/';
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
                    {/* Multi-User Session Selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-medium">{getDisplayName}</span>
                          {hasMultipleSessions && (
                            <>
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {sessions.length}
                              </Badge>
                              <ChevronDown className="h-3 w-3" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        {/* Current User */}
                        <div className="px-3 py-2 text-sm font-medium text-gray-900 border-b">
                          Active Session
                        </div>
                        <DropdownMenuItem className="flex items-center gap-3 px-3 py-3 bg-blue-50">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{getDisplayName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </DropdownMenuItem>
                        
                        {/* Other Sessions */}
                        {sessions.filter(s => s.id !== activeSession?.id).length > 0 && (
                          <>
                            <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-t">
                              Switch To
                            </div>
                            {sessions
                              .filter(s => s.id !== activeSession?.id)
                              .map((session) => (
                                <DropdownMenuItem
                                  key={session.id}
                                  onClick={() => handleSwitchSession(session.id)}
                                  className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50"
                                >
                                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                                    <User className="h-4 w-4 text-gray-600" />
                                  </div>
                                  <div className="flex-1">
                                     <div className="font-medium text-gray-900">
                                       {session.userProfile?.first_name || session.userProfile?.last_name 
                                         ? `${session.userProfile.first_name || ''} ${session.userProfile.last_name || ''}`.trim()
                                         : session.user.email.split('@')[0]}
                                     </div>
                                    <div className="text-sm text-gray-500">{session.user.email}</div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                          </>
                        )}
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleAddUser} className="flex items-center gap-3 px-3 py-3">
                          <UserPlus className="h-4 w-4" />
                          <span>Add User</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

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
                        <DropdownMenuItem onClick={handleSignOut} disabled={isLoading || isSigningOut} className="hover:bg-gray-50">
                          <LogOut className="h-4 w-4 mr-2" />
                          {isSigningOut ? 'Signing out...' : (hasMultipleSessions ? 'Sign Out User' : 'Sign Out')}
                        </DropdownMenuItem>
                        {hasMultipleSessions && (
                          <DropdownMenuItem onClick={handleSignOutAll} disabled={isLoading || isSigningOut} className="hover:bg-red-50 text-red-600">
                            <Users className="h-4 w-4 mr-2" />
                            {isSigningOut ? 'Signing out...' : 'Sign Out All'}
                          </DropdownMenuItem>
                        )}
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

          {/* Mobile Menu with Multi-User Support */}
          {isMobileMenuOpen && (
            <div className="lg:hidden border-t border-gray-200 py-4 space-y-3 animate-fade-in">
              {/* Current User Info */}
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">{getDisplayName}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
                {hasMultipleSessions && (
                  <Badge variant="secondary" className="text-xs">
                    {sessions.length} users
                  </Badge>
                )}
              </div>

              {/* Session Management */}
              {hasMultipleSessions && (
                <div className="px-4 border-b border-gray-100 pb-3">
                  <Button
                    onClick={handleAddUser}
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Another User
                  </Button>
                </div>
              )}

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
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  disabled={isLoading || isSigningOut}
                  variant="ghost"
                  className="w-full justify-start text-left p-3 hover:bg-gray-50"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  {isSigningOut ? 'Signing out...' : (hasMultipleSessions ? 'Sign Out User' : 'Sign Out')}
                </Button>
                {hasMultipleSessions && (
                  <Button
                    onClick={() => {
                      handleSignOutAll();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isLoading || isSigningOut}
                    variant="ghost"
                    className="w-full justify-start text-left p-3 hover:bg-red-50 text-red-600"
                  >
                    <Users className="h-4 w-4 mr-3" />
                    {isSigningOut ? 'Signing out...' : 'Sign Out All Users'}
                  </Button>
                )}
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
