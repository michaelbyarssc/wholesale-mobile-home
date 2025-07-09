import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save } from 'lucide-react';
import { useState } from 'react';

export function NotificationPreferences() {
  const { preferences, isLoading, updatePreferences } = useNotificationPreferences();
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  if (isLoading || !preferences) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Loading preferences...
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleUpdate = async (field: string, value: boolean | string) => {
    setIsSaving(true);
    try {
      await updatePreferences({ [field]: value });
      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Delivery Methods</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications" className="text-sm">
              Email Notifications
            </Label>
            <Switch
              id="email-notifications"
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => handleUpdate('email_notifications', checked)}
              disabled={isSaving}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="push-notifications" className="text-sm">
              Push Notifications
            </Label>
            <Switch
              id="push-notifications"
              checked={preferences.push_notifications}
              onCheckedChange={(checked) => handleUpdate('push_notifications', checked)}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Notification Types</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="estimate-updates" className="text-sm">
              Estimate Updates
            </Label>
            <Switch
              id="estimate-updates"
              checked={preferences.estimate_updates}
              onCheckedChange={(checked) => handleUpdate('estimate_updates', checked)}
              disabled={isSaving}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="inventory-updates" className="text-sm">
              New Inventory
            </Label>
            <Switch
              id="inventory-updates"
              checked={preferences.inventory_updates}
              onCheckedChange={(checked) => handleUpdate('inventory_updates', checked)}
              disabled={isSaving}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="price-updates" className="text-sm">
              Price Changes
            </Label>
            <Switch
              id="price-updates"
              checked={preferences.price_updates}
              onCheckedChange={(checked) => handleUpdate('price_updates', checked)}
              disabled={isSaving}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="system-notifications" className="text-sm">
              System Notifications
            </Label>
            <Switch
              id="system-notifications"
              checked={preferences.system_notifications}
              onCheckedChange={(checked) => handleUpdate('system_notifications', checked)}
              disabled={isSaving}
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Frequency</h3>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="notification-frequency" className="text-sm">
              Notification Frequency
            </Label>
            <Select
              value={preferences.notification_frequency}
              onValueChange={(value) => handleUpdate('notification_frequency', value)}
              disabled={isSaving}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}