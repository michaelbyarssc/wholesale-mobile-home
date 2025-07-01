
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MobileHomesTab } from '@/components/admin/MobileHomesTab';
import { ServicesTab } from '@/components/admin/ServicesTab';
import { SettingsTab } from '@/components/admin/SettingsTab';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { AuditLogTab } from '@/components/admin/AuditLogTab';
import { SuperAdminMarkupTab } from '@/components/admin/SuperAdminMarkupTab';
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { HomeOptionsTab } from '@/components/admin/HomeOptionsTab';

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [roleLoading, setRoleLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
          
          // Set default tab based on role
          if (isSuperAdminUser) {
            setActiveTab('mobile-homes');
          } else {
            setActiveTab('users');
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

  const NavigationItems = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex ${mobile ? 'flex-col space-y-2' : 'flex-row space-x-1'}`}>
      {isSuperAdmin ? (
        <>
          <Button
            variant={activeTab === 'mobile-homes' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('mobile-homes')}
          >
            Mobile Homes
          </Button>
          <Button
            variant={activeTab === 'services' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('services')}
          >
            Services
          </Button>
          <Button
            variant={activeTab === 'home-options' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('home-options')}
          >
            Home Options
          </Button>
        </>
      ) : null}
      <Button
        variant={activeTab === 'users' ? 'default' : 'ghost'}
        className={`${mobile ? 'justify-start w-full' : ''} text-xs sm:text-sm`}
        onClick={() => handleTabChange('users')}
      >
        Users
      </Button>
      {isSuperAdmin && (
        <>
          <Button
            variant={activeTab === 'super-admin' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('super-admin')}
          >
            Super Admin
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('settings')}
          >
            Settings
          </Button>
          <Button
            variant={activeTab === 'audit' ? 'default' : 'ghost'}
            className={`${mobile ? 'justify-start w-full' : ''} text-xs sm:text-sm`}
            onClick={() => handleTabChange('audit')}
          >
            Audit Log
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-2 sm:px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Mobile Navigation Toggle */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <div className="flex flex-col space-y-4 mt-8">
                    <NavigationItems mobile={true} />
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 truncate">
                  Admin Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Wholesale Mobile Home
                </p>
              </div>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
              <span className="text-xs text-gray-600 hidden md:inline max-w-[120px] lg:max-w-none truncate">
                Welcome, {user?.email?.split('@')[0]} ({isSuperAdmin ? 'Super Admin' : 'Admin'})
              </span>
              <div className="flex flex-col sm:flex-row gap-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/')}
                  className="text-xs px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">View Site</span>
                  <span className="sm:hidden">Site</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSignOut}
                  className="text-xs px-2 sm:px-3"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>

          {/* Desktop Navigation - Hidden on mobile */}
          <div className="hidden lg:block mt-4 border-t pt-4">
            <NavigationItems />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-2 sm:px-4 py-4 md:py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
          {/* Desktop Tab List - Hidden on mobile since we use buttons */}
          {isSuperAdmin ? (
            <TabsList className="hidden lg:grid w-full grid-cols-7 h-auto p-1">
              <TabsTrigger value="mobile-homes" className="text-xs sm:text-sm">Mobile Homes</TabsTrigger>
              <TabsTrigger value="services" className="text-xs sm:text-sm">Services</TabsTrigger>
              <TabsTrigger value="home-options" className="text-xs sm:text-sm">Home Options</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
              <TabsTrigger value="super-admin" className="text-xs sm:text-sm">Super Admin</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs sm:text-sm">Audit Log</TabsTrigger>
            </TabsList>
          ) : (
            <TabsList className="hidden lg:grid w-full grid-cols-1 h-auto p-1">
              <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
            </TabsList>
          )}

          {/* Tab Content */}
          {isSuperAdmin && (
            <>
              <TabsContent value="mobile-homes" className="mt-4">
                <MobileHomesTab />
              </TabsContent>

              <TabsContent value="services" className="mt-4">
                <ServicesTab />
              </TabsContent>

              <TabsContent value="home-options" className="mt-4">
                <HomeOptionsTab />
              </TabsContent>
            </>
          )}

          <TabsContent value="users" className="mt-4">
            <UserManagementTab />
          </TabsContent>

          {isSuperAdmin && (
            <>
              <TabsContent value="super-admin" className="mt-4">
                <SuperAdminMarkupTab />
              </TabsContent>

              <TabsContent value="settings" className="mt-4">
                <SettingsTab />
              </TabsContent>

              <TabsContent value="audit" className="mt-4">
                <AuditLogTab />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
