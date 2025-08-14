import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileHomesTab } from '@/components/admin/MobileHomesTab';
import { SalesTab } from '@/components/admin/SalesTab';
import { ReviewsTab } from '@/components/admin/ReviewsTab';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { CombinedCRMTab } from '@/components/admin/CombinedCRMTab';
import { CombinedSettingsTab } from '@/components/admin/CombinedSettingsTab';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { SocialProofManager } from '@/components/admin/SocialProofManager';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { FAQManagementTab } from '@/components/admin/FAQManagementTab';
import DeliveryManagement from '@/components/admin/DeliveryManagement';
import { ComprehensiveTestSuite } from '@/components/admin/ComprehensiveTestSuite';
import { ComprehensiveTestRunner } from '@/components/ComprehensiveTestRunner';
import { SecurityTestDashboard } from '@/components/SecurityTestDashboard';
import { SecurityOverhaulVerification } from '@/components/SecurityOverhaulVerification';

import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const Admin = () => {
  const { user, session, isLoading: authLoading, handleLogout, forceRefreshAuth } = useAuthUser();
  const { isAdmin, isSuperAdmin, isLoading: rolesLoading, userRoles, verifyAdminAccess, forceRefreshRoles } = useUserRoles();
  const [activeTab, setActiveTab] = useState('users');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // SECURITY: Enhanced admin validation with session checks
  const isSecureAdmin = isAdmin && user && session && user.id === session.user.id;
  
  // SECURITY: Enhanced debug logging with session validation
  console.log('🔐 Admin Panel State:', {
    userEmail: user?.email,
    userId: user?.id,
    sessionUserId: session?.user?.id,
    sessionUserEmail: session?.user?.email,
    isAdmin,
    isSuperAdmin,
    isSecureAdmin,
    userRoles: userRoles.map(r => r.role),
    authLoading,
    rolesLoading,
    sessionMatch: user?.id === session?.user?.id,
    timestamp: new Date().toISOString()
  });

  // SECURITY: Alert on session mismatch
  if (user && session && user.id !== session.user.id) {
    console.error('🚨 SECURITY ALERT: User/Session mismatch in Admin panel!', {
      userId: user.id,
      sessionUserId: session.user.id,
      userEmail: user.email,
      sessionUserEmail: session.user.email
    });
  }

  // SECURITY: Force auth and role refresh on mount to prevent stale data
  useEffect(() => {
    const initializeAdminPanel = async () => {
      console.log('🔐 Initializing admin panel...');
      await forceRefreshAuth();
      await forceRefreshRoles();
    };
    
    initializeAdminPanel();
  }, []); // Only run once on mount

  // SECURITY: Verify admin access with database function (no auto-logout; UI will handle)
  useEffect(() => {
    const verifyAccess = async () => {
      if (user && !authLoading && !rolesLoading) {
        const isVerifiedAdmin = await verifyAdminAccess();
        if (!isVerifiedAdmin) {
          console.warn('⚠️ Admin access verification failed - keeping session, showing limited UI');
          toast({
            title: 'Access check',
            description: 'Admin privileges not verified yet. Try refresh or contact support.',
            duration: 4000,
          });
        }
      }
    };
    verifyAccess();
  }, [user, authLoading, rolesLoading, verifyAdminAccess, toast]);

  // Initialize default tab based on role (ProtectedRoute already handles auth)
  useEffect(() => {
    if (!authLoading && !rolesLoading && isSecureAdmin) {
      // Set default tab based on role
      if (isSuperAdmin) {
        setActiveTab('mobile-homes');
        console.log('🔐 Admin: Super admin detected, setting tab to mobile-homes');
      } else {
        setActiveTab('sales');
        console.log('🔐 Admin: Regular admin detected, setting tab to sales');
      }
    }
  }, [isSuperAdmin, authLoading, rolesLoading, isSecureAdmin]);

  const handleSignOut = async () => {
    await handleLogout();
    navigate('/');
  };

  const handleTabChange = (value: string) => {
    // Remove top-level "automation" from allowed tabs
    const superAdminTabs = ['mobile-homes', 'sales', 'users', 'crm', 'analytics', 'social-proof', 'faq', 'delivery', 'testing', 'settings', 'reviews']
    const adminTabs = ['sales', 'users', 'crm']
    const allowed = isSuperAdmin ? superAdminTabs : adminTabs
    const next = allowed.includes(value) ? value : (isSuperAdmin ? 'mobile-homes' : 'sales')
    setActiveTab(next)
    setMobileMenuOpen(false) // Close mobile menu when tab changes
  };

  // SECURITY: Show loading while verifying authentication and roles
  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // SECURITY: Only redirect to auth when not logged in; otherwise let ProtectedRoute handle access
  if (!user || !session) {
    navigate('/auth');
    return null;
  }

  const getTabDisplayName = (tab: string) => {
    const tabNames: Record<string, string> = {
      'mobile-homes': 'Homes',
      'sales': 'Sales',
      'users': 'Users',
      'reviews': 'Reviews',
      'social-proof': 'Social Proof',
      'analytics': 'Analytics',
      'crm': 'CRM',
      'automation': 'Automation',
      'delivery': 'Delivery',
      'testing': 'Testing',
      'settings': 'Settings'
    };
    return tabNames[tab] || tab;
  };

  const NavigationItems = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex ${mobile ? 'flex-col space-y-2' : 'flex-row space-x-1'}`}>
      {isSuperAdmin ? (
        <>
          <Button
            variant={activeTab === 'mobile-homes' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('mobile-homes')}
          >
            Mobile Homes
          </Button>
        </>
      ) : null}
      <Button
        variant={activeTab === 'sales' ? 'default' : 'ghost'}
        className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
        onClick={() => handleTabChange('sales')}
      >
        Sales
      </Button>
      <Button
        variant={activeTab === 'users' ? 'default' : 'ghost'}
        className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
        onClick={() => handleTabChange('users')}
      >
        Users
      </Button>
      <Button
        variant={activeTab === 'crm' ? 'default' : 'ghost'}
        className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
        onClick={() => handleTabChange('crm')}
      >
        CRM
      </Button>
      {isSuperAdmin && (
        <Button
          variant={activeTab === 'delivery' ? 'default' : 'ghost'}
          className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
          onClick={() => handleTabChange('delivery')}
        >
          Delivery
        </Button>
      )}
       {isSuperAdmin && (
        <>
           <Button
             variant={activeTab === 'analytics' ? 'default' : 'ghost'}
             className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
             onClick={() => handleTabChange('analytics')}
           >
            Analytics
             </Button>
           <Button
             variant={activeTab === 'social-proof' ? 'default' : 'ghost'}
             className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
             onClick={() => handleTabChange('social-proof')}
           >
             Social Proof
           </Button>
            <Button
              variant={activeTab === 'faq' ? 'default' : 'ghost'}
              className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
              onClick={() => handleTabChange('faq')}
            >
              FAQ
            </Button>
            <Button
              variant={activeTab === 'testing' ? 'default' : 'ghost'}
              className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
              onClick={() => handleTabChange('testing')}
            >
              Testing
            </Button>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'ghost'}
              className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
              onClick={() => handleTabChange('settings')}
            >
              Settings
            </Button>
        </>
      )}
    </div>
  );

  // Debug final render state
  console.log('Admin: RENDER - isSuperAdmin:', isSuperAdmin, 'isMobile:', isMobile, 'activeTab:', activeTab);
  console.log('Admin: RENDER - user:', user?.email);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95 shadow-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              {/* Mobile Navigation Toggle */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden shrink-0">
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Open navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 sm:w-96 p-0">
                  <div className="p-6">
                    <div className="mb-8 pb-4 border-b">
                      <h2 className="text-xl font-semibold text-foreground">Admin Dashboard</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Current: {getTabDisplayName(activeTab)}
                      </p>
                      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Signed in as</p>
                        <p className="text-sm font-medium truncate">
                          {user?.email || session?.user?.email} • {isSuperAdmin ? 'Super Admin' : 'Admin'}
                        </p>
                      </div>
                    </div>
                    <nav className="space-y-2">
                      <NavigationItems mobile={true} />
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground truncate">
                  {isMobile ? getTabDisplayName(activeTab) : 'Admin Dashboard'}
                </h1>
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Wholesale Mobile Home Management System
                </p>
              </div>
            </div>

            {/* User Info & Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* User Info - Desktop */}
              <div className="hidden lg:flex flex-col items-end text-right min-w-0">
                <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                  {user?.email || session?.user?.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </p>
              </div>
              
              {/* Separator */}
              <div className="hidden lg:block h-8 w-px bg-border" />
              
              <NotificationCenter />
              
              {/* Debug: Force Refresh Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  console.log('Manual refresh triggered');
                  await forceRefreshAuth();
                  await forceRefreshRoles();
                  toast({
                    title: "Refreshed",
                    description: "Auth and roles have been refreshed. Check console for debug info.",
                  });
                }}
                className="hidden sm:flex text-xs"
              >
                🔄 Refresh
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/')}
                className="hidden sm:flex"
              >
                View Site
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/')}
                className="sm:hidden"
              >
                Site
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSignOut}
                className="text-destructive hover:text-destructive"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 lg:py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
          {/* Desktop Tab Navigation */}
          {!isMobile && isSuperAdmin && (
            <div className="border rounded-lg p-1 bg-muted/30 overflow-x-auto">
              <TabsList className="inline-flex h-12 w-max bg-transparent space-x-1 p-1">
                <TabsTrigger 
                  value="mobile-homes" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  Homes
                </TabsTrigger>
                <TabsTrigger 
                  value="sales" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  Sales
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  Users
                </TabsTrigger>
                <TabsTrigger 
                  value="crm" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  CRM
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="social-proof" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  Social
                </TabsTrigger>
                <TabsTrigger 
                  value="faq" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  FAQ
                </TabsTrigger>
                <TabsTrigger 
                  value="delivery" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  Delivery
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  Reviews
                </TabsTrigger>
                <TabsTrigger 
                  value="testing" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  Testing
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm px-3 py-2 whitespace-nowrap"
                >
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>
          )}
          
          {!isMobile && !isSuperAdmin && (
            <div className="border rounded-lg p-1 bg-muted/30">
              <TabsList className="grid w-full grid-cols-3 h-12 bg-transparent">
                <TabsTrigger 
                  value="sales" 
                  className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Sales
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Users
                </TabsTrigger>
                <TabsTrigger 
                  value="crm" 
                  className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  CRM
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Tab Content with responsive spacing */}
          <div className="bg-card rounded-lg border shadow-sm">
            {isSuperAdmin && (
              <>
                <TabsContent value="mobile-homes" className="p-3 sm:p-6 m-0">
                  <MobileHomesTab />
                </TabsContent>
              </>
            )}

            <TabsContent value="sales" className="p-3 sm:p-6 m-0">
              <SalesTab />
            </TabsContent>

            <TabsContent value="users" className="p-3 sm:p-6 m-0">
              <UserManagementTab />
            </TabsContent>

            <TabsContent value="crm" className="p-3 sm:p-6 m-0">
              <CombinedCRMTab 
                userRole={isSuperAdmin ? 'super_admin' : 'admin'} 
                currentUserId={user?.id} 
              />
            </TabsContent>

            {isSuperAdmin && (
              <>
                <TabsContent value="analytics" className="p-3 sm:p-6 m-0">
                  <AdminAnalytics />
                </TabsContent>

                <TabsContent value="delivery" className="p-3 sm:p-6 m-0">
                  <DeliveryManagement />
                </TabsContent>

                <TabsContent value="settings" className="p-3 sm:p-6 m-0">
                  <CombinedSettingsTab isSuperAdmin={isSuperAdmin} />
                </TabsContent>

                <TabsContent value="social-proof" className="p-3 sm:p-6 m-0">
                  <SocialProofManager />
                </TabsContent>

                <TabsContent value="faq" className="p-3 sm:p-6 m-0">
                  <FAQManagementTab />
                </TabsContent>

                <TabsContent value="testing" className="p-3 sm:p-6 m-0">
                  <div className="space-y-6">
                    <SecurityOverhaulVerification />
                    <SecurityTestDashboard />
                    <ComprehensiveTestRunner />
                  </div>
                </TabsContent>

                <TabsContent value="reviews" className="p-3 sm:p-6 m-0">
                  <ReviewsTab />
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
