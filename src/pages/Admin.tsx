
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
import { Menu, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { HomeOptionsTab } from '@/components/admin/HomeOptionsTab';

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [activeTab, setActiveTab] = useState('estimates');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Admin: Starting auth check...');
        
        const { data: { user } } = await supabase.auth.getUser();
        console.log('🔍 Admin: Current user:', user?.id, user?.email);
        
        if (!user) {
          console.log('🔍 Admin: No user found, redirecting to auth');
          navigate('/auth');
          return;
        }

        setUser(user);

        // Check if user is admin
        console.log('🔍 Admin: Checking admin role for user:', user.id);
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();

        console.log('🔍 Admin: Role check result:', roleData);
        console.log('🔍 Admin: Role check error:', roleError);

        // Also check all roles for this user
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id);

        console.log('🔍 Admin: All user roles:', userRoles);
        console.log('🔍 Admin: User roles error:', userRolesError);

        setDebugInfo({
          userId: user.id,
          userEmail: user.email,
          roleData,
          roleError: roleError?.message,
          userRoles,
          userRolesError: userRolesError?.message,
          hasAdminRole: !!roleData
        });

        if (!roleData) {
          console.log('🔍 Admin: User is not admin');
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        console.log('🔍 Admin: User is admin, setting up dashboard');
        setIsAdmin(true);
        setLoading(false);
      } catch (error) {
        console.error('🔍 Admin: Error in auth check:', error);
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔍 Admin: Auth state changed:', event);
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const handleSignOut = async () => {
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
          <p className="mt-2 text-xs text-gray-600">Checking authentication and permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-red-600 text-lg md:text-xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm md:text-base">You don't have admin privileges. Contact an administrator.</p>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold mb-2 text-sm md:text-base">Debug Information:</h3>
              <pre className="text-xs overflow-auto max-h-60">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
            
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button onClick={() => navigate('/')} className="flex-1">
                Back to Home
              </Button>
              <Button variant="outline" onClick={handleSignOut} className="flex-1">
                Sign Out
              </Button>
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
              <MobileNavigation />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-blue-900">Admin Dashboard</h1>
                <p className="text-sm md:text-base text-gray-600 hidden sm:block">Wholesale Mobile Home</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <span className="text-xs md:text-sm text-gray-600 hidden sm:inline">
                Welcome, {user?.email}
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
          <TabsList className="hidden md:grid w-full grid-cols-7">
            <TabsTrigger value="estimates">Estimates</TabsTrigger>
            <TabsTrigger value="mobile-homes">Mobile Homes</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="home-options">Home Options</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
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
