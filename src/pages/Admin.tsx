
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileHomesTab } from '@/components/admin/MobileHomesTab';
import { ServicesTab } from '@/components/admin/ServicesTab';
import { ReviewsTab } from '@/components/admin/ReviewsTab';
import { AdminAnalytics } from '@/components/admin/AdminAnalytics';
import { CRMDashboard } from '@/components/admin/CRMDashboard';
import { SettingsTab } from '@/components/admin/SettingsTab';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { AuditLogTab } from '@/components/admin/AuditLogTab';
import { SuperAdminMarkupTab } from '@/components/admin/SuperAdminMarkupTab';
import { AdminCalendarDashboard } from '@/components/admin/calendar/AdminCalendarDashboard';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { HomeOptionsTab } from '@/components/admin/HomeOptionsTab';
import { useIsMobile } from '@/hooks/use-mobile';

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [roleLoading, setRoleLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('Admin: No session, redirecting to auth');
          navigate('/auth');
          return;
        }

        setUser(session.user);
        console.log('Admin: User authenticated:', session.user.id);

        // Check if user is super admin - fix the role checking logic
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        console.log('Admin: Role check result:', { roleData, roleError });
        
        if (roleError) {
          console.error('Admin: Error checking user role:', roleError);
          setIsSuperAdmin(false);
        } else {
          // Check if ANY of the user's roles is 'super_admin'
          const isSuperAdminUser = roleData?.some(role => role.role === 'super_admin') || false;
          setIsSuperAdmin(isSuperAdminUser);
          console.log('Admin: User roles:', roleData?.map(r => r.role));
          console.log('Admin: Is super admin:', isSuperAdminUser);
          console.log('Admin: Setting isSuperAdmin state to:', isSuperAdminUser);
          
          // Set default tab based on role
          if (isSuperAdminUser) {
            setActiveTab('mobile-homes');
            console.log('Admin: Super admin detected, setting tab to mobile-homes');
          } else {
            setActiveTab('users');
            console.log('Admin: Regular admin detected, setting tab to users');
          }
        }
        
      } catch (error) {
        console.error('Admin: Error in role check:', error);
        setIsSuperAdmin(false);
        toast({
          title: "Error",
          description: "Failed to load admin dashboard",
          variant: "destructive",
        });
      } finally {
        setRoleLoading(false);
      }
    };

    checkUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate('/auth');
      } else {
        checkUserRole();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setMobileMenuOpen(false); // Close mobile menu when tab changes
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getTabDisplayName = (tab: string) => {
    const tabNames: Record<string, string> = {
      'mobile-homes': 'Homes',
      'services': 'Services',
      'home-options': 'Options',
      'users': 'Users',
      'reviews': 'Reviews',
      'analytics': 'Analytics',
      'crm': 'CRM',
      'calendar': 'Calendar',
      'super-admin': 'Admin',
      'settings': 'Settings',
      'audit': 'Audit'
    };
    return tabNames[tab] || tab;
  };

  const NavigationItems = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex ${mobile ? 'flex-col space-y-3' : 'flex-row space-x-1'}`}>
      {isSuperAdmin ? (
        <>
          {console.log('Admin: Rendering super admin navigation - isSuperAdmin:', isSuperAdmin)}
          <Button
            variant={activeTab === 'mobile-homes' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('mobile-homes')}
          >
            Mobile Homes
          </Button>
          <Button
            variant={activeTab === 'services' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('services')}
          >
            Services
          </Button>
          <Button
            variant={activeTab === 'home-options' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('home-options')}
          >
            Home Options
          </Button>
        </>
      ) : null}
      <Button
        variant={activeTab === 'users' ? 'default' : 'ghost'}
        className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
        onClick={() => handleTabChange('users')}
      >
        Users
      </Button>
      <Button
        variant={activeTab === 'calendar' ? 'default' : 'ghost'}
        className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
        onClick={() => handleTabChange('calendar')}
      >
        Calendar
      </Button>
      {isSuperAdmin && (
        <>
          <Button
            variant={activeTab === 'super-admin' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('super-admin')}
          >
            Super Admin
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('analytics')}
          >
             Analytics
           </Button>
           <Button
             variant={activeTab === 'crm' ? 'default' : 'ghost'}
             className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
             onClick={() => handleTabChange('crm')}
           >
             CRM
           </Button>
           <Button
             variant={activeTab === 'settings' ? 'default' : 'ghost'}
             className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
             onClick={() => handleTabChange('settings')}
           >
             Settings
           </Button>
           <Button
             variant={activeTab === 'audit' ? 'default' : 'ghost'}
             className={`${mobile ? 'justify-start w-full h-12 text-base' : ''} text-xs sm:text-sm`}
             onClick={() => handleTabChange('audit')}
           >
             Audit Log
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {/* Mobile Navigation Toggle */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden shrink-0">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 sm:w-96">
                  <div className="mt-8">
                    <div className="mb-6 pb-4 border-b">
                      <h2 className="text-lg font-semibold text-foreground">Navigation</h2>
                      <p className="text-sm text-muted-foreground">
                        Current: {getTabDisplayName(activeTab)}
                      </p>
                    </div>
                    <NavigationItems mobile={true} />
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
                  {isMobile ? getTabDisplayName(activeTab) : 'Admin Dashboard'}
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Wholesale Mobile Home Management
                </p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {!isMobile && (
                <span className="text-xs text-muted-foreground hidden lg:inline max-w-[140px] xl:max-w-none truncate">
                  {user?.email?.split('@')[0]} • {isSuperAdmin ? 'Super Admin' : 'Admin'}
                </span>
              )}
              <div className="flex gap-1 sm:gap-2">
                <Button 
                  variant="outline" 
                  size={isMobile ? "sm" : "sm"}
                  onClick={() => navigate('/')}
                  className={`text-xs ${isMobile ? 'px-2' : 'px-3'}`}
                >
                  {isMobile ? 'Site' : 'View Site'}
                </Button>
                <Button 
                  variant="outline" 
                  size={isMobile ? "sm" : "sm"}
                  onClick={handleSignOut}
                  className={`text-xs ${isMobile ? 'px-2' : 'px-3'}`}
                >
                  {isMobile ? 'Out' : 'Sign Out'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 md:py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-3 sm:space-y-4 md:space-y-6">
          {/* Desktop Tab List - Hidden on mobile since we use sheet menu */}
          {!isMobile && isSuperAdmin && (
            <TabsList className="grid w-full grid-cols-11 h-auto p-1">
              <TabsTrigger value="mobile-homes" className="text-xs lg:text-sm">Homes</TabsTrigger>
              <TabsTrigger value="services" className="text-xs lg:text-sm">Services</TabsTrigger>
              <TabsTrigger value="home-options" className="text-xs lg:text-sm">Options</TabsTrigger>
              <TabsTrigger value="users" className="text-xs lg:text-sm">Users</TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs lg:text-sm">Calendar</TabsTrigger>
              <TabsTrigger value="reviews" className="text-xs lg:text-sm">Reviews</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs lg:text-sm">Analytics</TabsTrigger>
              <TabsTrigger value="crm" className="text-xs lg:text-sm">CRM</TabsTrigger>
              <TabsTrigger value="super-admin" className="text-xs lg:text-sm">Admin</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs lg:text-sm">Settings</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs lg:text-sm">Audit</TabsTrigger>
            </TabsList>
          )}
          {!isMobile && !isSuperAdmin && (
            <TabsList className="grid w-full grid-cols-2 h-auto p-1">
              <TabsTrigger value="users" className="text-sm">Users</TabsTrigger>
              <TabsTrigger value="calendar" className="text-sm">Calendar</TabsTrigger>
            </TabsList>
          )}

          {/* Tab Content */}
          {isSuperAdmin && (
            <>
              <TabsContent value="mobile-homes" className="mt-2 sm:mt-4">
                <MobileHomesTab />
              </TabsContent>

              <TabsContent value="services" className="mt-2 sm:mt-4">
                <ServicesTab />
              </TabsContent>

              <TabsContent value="home-options" className="mt-2 sm:mt-4">
                <HomeOptionsTab />
              </TabsContent>
            </>
          )}

          <TabsContent value="users" className="mt-2 sm:mt-4">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="calendar" className="mt-2 sm:mt-4">
            <AdminCalendarDashboard 
              userRole={isSuperAdmin ? 'super_admin' : 'admin'} 
              currentUserId={user?.id} 
            />
          </TabsContent>

          {isSuperAdmin && (
            <>
              <TabsContent value="super-admin" className="mt-2 sm:mt-4">
                <SuperAdminMarkupTab />
              </TabsContent>

              <TabsContent value="settings" className="mt-2 sm:mt-4">
                <SettingsTab />
              </TabsContent>

              <TabsContent value="audit" className="mt-2 sm:mt-4">
                <AuditLogTab />
              </TabsContent>

              <TabsContent value="reviews" className="mt-2 sm:mt-4">
                <ReviewsTab />
              </TabsContent>

              <TabsContent value="analytics" className="mt-2 sm:mt-4">
                <AdminAnalytics />
              </TabsContent>

              <TabsContent value="crm" className="mt-2 sm:mt-4">
                <CRMDashboard />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
