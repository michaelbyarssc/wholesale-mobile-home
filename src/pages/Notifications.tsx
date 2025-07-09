import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationList } from '@/components/notifications/NotificationList';
import { ActivityFeed } from '@/components/notifications/ActivityFeed';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { Bell, Activity, Settings } from 'lucide-react';

export default function Notifications() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Notifications & Activity
          </h1>
          <p className="text-gray-600">
            Stay updated with real-time notifications and track your activity
          </p>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Feed
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Your Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <NotificationList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <ActivityFeed />
          </TabsContent>

          <TabsContent value="preferences">
            <NotificationPreferences />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}