
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

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);
      console.log('Current user:', user);

      // Debug: Check if user exists in user_roles table
      const { data: allRoles, error: allRolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      console.log('All user roles:', allRoles);
      console.log('All roles error:', allRolesError);

      // Check if user is admin
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      console.log('Role check result:', roleData);
      console.log('Role check error:', roleError);

      // Check user's roles (all of them)
      const { data: userRoles, error: userRolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      console.log('User roles:', userRoles);
      console.log('User roles error:', userRolesError);

      setDebugInfo({
        userId: user.id,
        userEmail: user.email,
        allRoles,
        roleData,
        roleError,
        userRoles,
        userRolesError
      });

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: `You don't have admin privileges. Contact an administrator. User ID: ${user.id}`,
          variant: "destructive",
        });
        
        // Don't navigate away immediately so we can see the debug info
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-blue-900">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">You don't have admin privileges. Contact an administrator.</p>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Debug Information:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
            
            <div className="mt-4 flex gap-2">
              <Button onClick={() => navigate('/')}>
                Back to Home
              </Button>
              <Button variant="outline" onClick={handleSignOut}>
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
            <div>
              <h1 className="text-2xl font-bold text-blue-900">Admin Dashboard</h1>
              <p className="text-gray-600">Wholesale Homes of the Carolinas</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
              >
                View Site
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="estimates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="estimates">Estimates</TabsTrigger>
            <TabsTrigger value="mobile-homes">Mobile Homes</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
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

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
