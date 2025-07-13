import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
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

import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
            setActiveTab('sales');
            console.log('Admin: Regular admin detected, setting tab to sales');
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
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
            🏠 Mobile Homes
          </Button>
        </>
      ) : null}
      <Button
        variant={activeTab === 'sales' ? 'default' : 'ghost'}
        className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
        onClick={() => handleTabChange('sales')}
      >
        💰 Sales
      </Button>
      <Button
        variant={activeTab === 'users' ? 'default' : 'ghost'}
        className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
        onClick={() => handleTabChange('users')}
      >
        👥 Users
      </Button>
      <Button
        variant={activeTab === 'crm' ? 'default' : 'ghost'}
        className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
        onClick={() => handleTabChange('crm')}
      >
        📊 CRM
      </Button>
       {isSuperAdmin && (
        <>
           <Button
             variant={activeTab === 'analytics' ? 'default' : 'ghost'}
             className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
             onClick={() => handleTabChange('analytics')}
           >
            📈 Analytics
             </Button>
           <Button
             variant={activeTab === 'social-proof' ? 'default' : 'ghost'}
             className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
             onClick={() => handleTabChange('social-proof')}
           >
             ⭐ Social Proof
           </Button>
           <Button
             variant={activeTab === 'settings' ? 'default' : 'ghost'}
             className={`${mobile ? 'justify-start w-full h-11 text-base font-medium' : ''} text-xs sm:text-sm`}
             onClick={() => handleTabChange('settings')}
           >
             ⚙️ Settings
           </Button>
        </>
      )}
    </div>
  );

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
                          {user?.email} • {isSuperAdmin ? 'Super Admin' : 'Admin'}
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

            {/* User Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <NotificationCenter />
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
      <main className="container mx-auto px-4 py-6 lg:py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Desktop Tab Navigation */}
          {!isMobile && isSuperAdmin && (
            <div className="border rounded-lg p-1 bg-muted/30">
              <TabsList className="grid w-full grid-cols-7 h-12 bg-transparent">
                <TabsTrigger 
                  value="mobile-homes" 
                  className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Homes
                </TabsTrigger>
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
                <TabsTrigger 
                  value="analytics" 
                  className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="social-proof" 
                  className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Social Proof
                </TabsTrigger>
                <TabsTrigger 
                  value="settings" 
                  className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
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

          {/* Tab Content with better spacing */}
          <div className="bg-card rounded-lg border shadow-sm">
            {isSuperAdmin && (
              <>
                <TabsContent value="mobile-homes" className="p-6 m-0">
                  <MobileHomesTab />
                </TabsContent>
              </>
            )}

            <TabsContent value="sales" className="p-6 m-0">
              <SalesTab />
            </TabsContent>

            <TabsContent value="users" className="p-6 m-0">
              <UserManagementTab />
            </TabsContent>

            <TabsContent value="crm" className="p-6 m-0">
              <CombinedCRMTab 
                userRole={isSuperAdmin ? 'super_admin' : 'admin'} 
                currentUserId={user?.id} 
              />
            </TabsContent>

            {isSuperAdmin && (
              <>
                <TabsContent value="analytics" className="p-6 m-0">
                  <AdminAnalytics />
                </TabsContent>

                <TabsContent value="settings" className="p-6 m-0">
                  <CombinedSettingsTab isSuperAdmin={isSuperAdmin} />
                </TabsContent>

                <TabsContent value="social-proof" className="p-6 m-0">
                  <SocialProofManager />
                </TabsContent>

                <TabsContent value="reviews" className="p-6 m-0">
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