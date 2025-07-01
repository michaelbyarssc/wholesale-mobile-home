import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EstimatesTab } from '@/components/admin/EstimatesTab';
import { MobileHomesTab } from '@/components/admin/MobileHomesTab';
import { ServicesTab } from '@/components/admin/ServicesTab';
import { SettingsTab } from '@/components/admin/SettingsTab';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { AuditLogTab } from '@/components/admin/AuditLogTab';
import { SuperAdminMarkupTab } from '@/components/admin/SuperAdminMarkupTab';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { HomeOptionsTab } from '@/components/admin/HomeOptionsTab';

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('mobile-homes');
  const [roleLoading, setRoleLoading] = useState(true);
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

        // Check if user is super admin
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        console.log('Admin: Role check result:', { roleData, roleError });
        
        if (roleError) {
          console.error('Admin: Error checking user role:', roleError);
        }

        const userRole = roleData && roleData.length > 0 ? roleData[0].role : null;
        const isSuperAdminUser = userRole === 'super_admin';
        
        setIsSuperAdmin(isSuperAdminUser);
        console.log('Admin: User role set:', userRole, 'isSuperAdmin:', isSuperAdminUser);
        
      } catch (error) {
        console.error('Admin: Error in role check:', error);
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

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Mobile Navigation */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <div className="flex flex-col space-y-4 mt-8">
                    <Button
                      variant={activeTab === 'mobile-homes' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setActiveTab('mobile-homes')}
                    >
                      Mobile Homes
                    </Button>
                    <Button
                      variant={activeTab === 'services' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setActiveTab('services')}
                    >
                      Services
                    </Button>
                    <Button
                      variant={activeTab === 'home-options' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setActiveTab('home-options')}
                    >
                      Home Options
                    </Button>
                    <Button
                      variant={activeTab === 'users' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setActiveTab('users')}
                    >
                      Users
                    </Button>
                    {isSuperAdmin && (
                      <Button
                        variant={activeTab === 'super-admin' ? 'default' : 'ghost'}
                        className="justify-start"
                        onClick={() => setActiveTab('super-admin')}
                      >
                        Super Admin
                      </Button>
                    )}
                    <Button
                      variant={activeTab === 'settings' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setActiveTab('settings')}
                    >
                      Settings
                    </Button>
                    <Button
                      variant={activeTab === 'audit' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setActiveTab('audit')}
                    >
                      Audit Log
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-blue-900">Admin Dashboard</h1>
                <p className="text-sm md:text-base text-gray-600 hidden sm:block">Wholesale Mobile Home</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs md:text-sm text-gray-600 hidden sm:inline">
                Welcome, {user?.email} ({isSuperAdmin ? 'Super Admin' : 'Admin'})
              </span>
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/')}
                  className="text-xs md:text-sm"
                >
                  View Site
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSignOut}
                  className="text-xs md:text-sm"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`hidden md:grid w-full ${isSuperAdmin ? 'grid-cols-7' : 'grid-cols-6'}`}>
            <TabsTrigger value="mobile-homes">Mobile Homes</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="home-options">Home Options</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="super-admin">Super Admin</TabsTrigger>
            )}
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="mobile-homes">
            <MobileHomesTab />
          </TabsContent>

          <TabsContent value="services">
            <ServicesTab />
          </TabsContent>

          <TabsContent value="home-options">
            <HomeOptionsTab />
          </TabsContent>

          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="super-admin">
              <SuperAdminMarkupTab />
            </TabsContent>
          )}

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
