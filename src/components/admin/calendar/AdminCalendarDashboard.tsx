import { useState, useEffect } from 'react';
import { Calendar, Settings, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CalendarIntegrationTab } from '@/components/calendar/CalendarIntegrationTab';
import { CalendarSettings } from '@/components/calendar/CalendarSettings';
import { CalendarView } from './CalendarView';
import { CalendarAutomationWrapper } from '../automation/CalendarAutomationWrapper';
import { supabase } from '@/integrations/supabase/client';

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AdminCalendarDashboardProps {
  userRole: 'admin' | 'super_admin';
  currentUserId: string;
}

export function AdminCalendarDashboard({ userRole, currentUserId }: AdminCalendarDashboardProps) {
  const [selectedAdminId, setSelectedAdminId] = useState<string>(currentUserId);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminUsers = async () => {
    try {
      // First get admin user IDs
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin']);

      if (rolesError) throw rolesError;

      const adminUserIds = adminRoles?.map(role => role.user_id) || [];

      if (adminUserIds.length === 0) {
        setAdminUsers([]);
        return;
      }

      // Then get their profiles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          email
        `)
        .in('user_id', adminUserIds);

      if (error) throw error;

      const admins = data?.map(profile => ({
        id: profile.user_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
      })) || [];

      setAdminUsers(admins);
    } catch (error) {
      console.error('Error fetching admin users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'super_admin') {
      fetchAdminUsers();
    } else {
      setLoading(false);
    }
  }, [userRole]);

  const selectedAdmin = adminUsers.find(admin => admin.id === selectedAdminId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar Management</h2>
          <p className="text-muted-foreground">
            Manage calendar integration and view appointments
          </p>
        </div>

        {/* Super Admin: Admin Selector */}
        {userRole === 'super_admin' && (
          <div className="flex items-center gap-2">
            <Label htmlFor="admin-select">View Calendar:</Label>
            <Select
              value={selectedAdminId}
              onValueChange={setSelectedAdminId}
            >
              <SelectTrigger id="admin-select" className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adminUsers.map(admin => (
                  <SelectItem key={admin.id} value={admin.id}>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {admin.first_name} {admin.last_name} ({admin.email})
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content based on viewing mode */}
      {userRole === 'super_admin' && selectedAdminId !== currentUserId ? (
        /* Super Admin viewing another admin's calendar */
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {selectedAdmin?.first_name} {selectedAdmin?.last_name}'s Calendar
              </CardTitle>
              <CardDescription>
                Viewing appointments for {selectedAdmin?.email}
              </CardDescription>
            </CardHeader>
          </Card>

          <CalendarView adminUserId={selectedAdminId} />
        </div>
      ) : (
        /* Admin viewing their own calendar OR Super Admin managing their own */
        <Tabs defaultValue="calendar" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="automations" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Automations
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Integration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  My Appointments
                </CardTitle>
                <CardDescription>
                  View and manage your scheduled appointments
                </CardDescription>
              </CardHeader>
            </Card>

            <CalendarView />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <CalendarSettings />
          </TabsContent>

          <TabsContent value="automations" className="space-y-6">
            <CalendarAutomationWrapper />
          </TabsContent>

          <TabsContent value="integration" className="space-y-6">
            <CalendarIntegrationTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}