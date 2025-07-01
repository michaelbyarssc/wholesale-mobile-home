
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
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { HomeOptionsTab } from '@/components/admin/HomeOptionsTab';

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('estimates');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Admin page: Starting authentication check');
    
    const checkUserRole = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Admin page: Session check result:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          email: session?.user?.email,
          sessionError 
        });
        
        if (sessionError) {
          console.error('Admin page: Session error:', sessionError);
          setDebugInfo({ error: 'Session error', details: sessionError });
        }
        
        if (!session?.user) {
          console.log('Admin page: No session found, redirecting to auth');
          setDebugInfo({ error: 'No session found' });
          navigate('/auth');
          return;
        }

        setUser(session.user);
        console.log('Admin page: User set:', session.user.id);

        // Check if user is super admin with detailed logging
        console.log('Admin page: Checking user roles...');
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', session.user.id);

        console.log('Admin page: Role query result:', { roleData, roleError });
        
        if (roleError) {
          console.error('Admin page: Error checking user role:', roleError);
          setDebugInfo({ 
            error: 'Role check error', 
            details: roleError,
            userId: session.user.id,
            email: session.user.email
          });
        }

        const userRole = roleData?.[0]?.role;
        console.log('Admin page: User role found:', userRole);
        
        const isAdmin = userRole === 'admin' || userRole === 'super_admin';
        const isSuperAdminUser = userRole === 'super_admin';
        
        setIsSuperAdmin(isSuperAdminUser);
        
        // Set comprehensive debug info
        setDebugInfo({
          userId: session.user.id,
          email: session.user.email,
          roleData,
          userRole,
          isAdmin,
          isSuperAdminUser,
          timestamp: new Date().toISOString()
        });
        
        if (!isAdmin) {
          console.log('Admin page: User is not admin, redirecting to home');
          toast({
            title: "Access Denied",
            description: `You don't have permission to access the admin panel. Your role: ${userRole || 'none'}`,
            variant: "destructive",
          });
          // Don't redirect immediately, let them see the debug info
          setTimeout(() => navigate('/'), 3000);
          return;
        }
        
        console.log('Admin page: Access granted, user role:', userRole);
        
      } catch (error) {
        console.error('Admin page: Error checking user role:', error);
        setDebugInfo({ error: 'Unexpected error', details: error });
        toast({
          title: "Error",
          description: "Failed to load admin dashboard",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Admin page: Auth state changed:', event);
      if (!session?.user) {
        navigate('/auth');
      } else {
        checkUserRole();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    console.log('Admin page: Signing out');
    await supabase.auth.signOut();
    navigate('/');
  };

  const MobileNavigation = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <div className="flex flex-col space-y-4 mt-8">
          <Button
            variant={activeTab === 'estimates' ? 'default' : 'ghost'}
            className="justify-start"
            onClick={() => setActiveTab('estimates')}
          >
            Estimates
          </Button>
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
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 md:h-32 md:w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm md:text-lg text-blue-900">Loading admin dashboard...</p>
          {debugInfo && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-lg text-left max-w-md">
              <h3 className="font-bold text-sm mb-2">Debug Info:</h3>
              <pre className="text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show debug info if there's an access issue
  if (debugInfo?.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Admin Access Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Current User Info:</h3>
                <p><strong>Email:</strong> {debugInfo.email || 'N/A'}</p>
                <p><strong>User ID:</strong> {debugInfo.userId || 'N/A'}</p>
                <p><strong>Role:</strong> {debugInfo.userRole || 'none'}</p>
                <p><strong>Is Admin:</strong> {debugInfo.isAdmin ? 'Yes' : 'No'}</p>
                <p><strong>Is Super Admin:</strong> {debugInfo.isSuperAdminUser ? 'Yes' : 'No'}</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Raw Role Data:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(debugInfo.roleData, null, 2)}
                </pre>
              </div>
              
              {debugInfo.error && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-600">Error:</h3>
                  <p className="text-red-600">{debugInfo.error}</p>
                  <pre className="bg-red-50 p-2 rounded text-sm overflow-auto mt-2">
                    {JSON.stringify(debugInfo.details, null, 2)}
                  </pre>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={() => navigate('/')} variant="outline">
                  Go Home
                </Button>
                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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
                      variant={activeTab === 'estimates' ? 'default' : 'ghost'}
                      className="justify-start"
                      onClick={() => setActiveTab('estimates')}
                    >
                      Estimates
                    </Button>
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
                    {debugInfo && (
                      <Button
                        variant={activeTab === 'debug' ? 'default' : 'ghost'}
                        className="justify-start"
                        onClick={() => setActiveTab('debug')}
                      >
                        Debug Info
                      </Button>
                    )}
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
          <TabsList className={`hidden md:grid w-full ${isSuperAdmin ? 'grid-cols-9' : 'grid-cols-8'}`}>
            <TabsTrigger value="estimates">Estimates</TabsTrigger>
            <TabsTrigger value="mobile-homes">Mobile Homes</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="home-options">Home Options</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="super-admin">Super Admin</TabsTrigger>
            )}
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            {debugInfo && (
              <TabsTrigger value="debug">Debug</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="estimates">
            <EstimatesTab />
          </TabsContent>

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

          {debugInfo && (
            <TabsContent value="debug">
              <Card>
                <CardHeader>
                  <CardTitle>Debug Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
