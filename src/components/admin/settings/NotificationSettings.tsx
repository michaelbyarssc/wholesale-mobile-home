import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail, MessageSquare, Smartphone, Phone, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatPhoneNumber, isValidPhoneNumber, toTwilioFormat } from '@/utils/phoneUtils';

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  system_notifications: boolean;
  notification_frequency: string;
  inventory_updates: boolean;
  price_updates: boolean;
  estimate_updates: boolean;
  customer_activity_notifications: boolean;
  phone_number: string;
}

export const NotificationSettings = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: false,
    sms_notifications: true,
    system_notifications: true,
    notification_frequency: 'immediate',
    inventory_updates: true,
    price_updates: true,
    estimate_updates: true,
    customer_activity_notifications: true,
    phone_number: ''
  });
  const [testingPhone, setTestingPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
    checkPushSupport();
  }, []);

  const checkPushSupport = () => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPushPermission(Notification.permission);
    }
  };

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setPreferences({
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
          sms_notifications: data.sms_notifications ?? true,
          system_notifications: data.system_notifications,
          notification_frequency: data.notification_frequency,
          inventory_updates: data.inventory_updates || true,
          price_updates: data.price_updates || true,
          estimate_updates: data.estimate_updates || true,
          customer_activity_notifications: data.customer_activity_notifications ?? true,
          phone_number: data.phone_number || ''
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const requestPushPermission = async () => {
    if (!pushSupported) {
      toast({
        title: 'Push Notifications Not Supported',
        description: 'Your browser does not support push notifications',
        variant: 'destructive'
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        // Register service worker and get push subscription
        const registration = await navigator.serviceWorker.register('/sw.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: 'BEl62iUYgUivxIkv69yViEuiBIa6eK5L2sP9mLPnvFfI' // You'll need to generate this
        });

        // Save subscription to database
        await savePushSubscription(subscription);
        
        setPreferences(prev => ({ ...prev, push_notifications: true }));
        toast({
          title: 'Success',
          description: 'Push notifications enabled successfully'
        });
      } else {
        setPreferences(prev => ({ ...prev, push_notifications: false }));
        toast({
          title: 'Permission Denied',
          description: 'Push notifications were not enabled',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable push notifications',
        variant: 'destructive'
      });
    }
  };

  const savePushSubscription = async (subscription: PushSubscription) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase.functions.invoke('save-push-subscription', {
        body: {
          user_id: user.id,
          subscription: subscription.toJSON()
        }
      });
    } catch (error) {
      console.error('Error saving push subscription:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Authentication Error',
          description: 'You must be logged in to save preferences',
          variant: 'destructive'
        });
        return;
      }

      // Validate phone number if SMS is enabled
      if (preferences.sms_notifications && preferences.phone_number) {
        if (!isValidPhoneNumber(preferences.phone_number)) {
          toast({
            title: 'Invalid Phone Number',
            description: 'Please enter a valid 10-digit phone number',
            variant: 'destructive'
          });
          return;
        }
      }

      // Format phone number before saving
      const formattedPhone = formatPhoneNumber(preferences.phone_number);
      
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: user.id,
            email_notifications: preferences.email_notifications,
            push_notifications: preferences.push_notifications,
            sms_notifications: preferences.sms_notifications,
            system_notifications: preferences.system_notifications,
            notification_frequency: preferences.notification_frequency,
            inventory_updates: preferences.inventory_updates,
            price_updates: preferences.price_updates,
            estimate_updates: preferences.estimate_updates,
            customer_activity_notifications: preferences.customer_activity_notifications,
            phone_number: formattedPhone,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id'
          }
        );
      
      if (error) {
        console.error('Supabase error details:', error);
        if (error.code === '23505') {
          throw new Error('A unique constraint violation occurred. Please try again.');
        }
        throw error;
      }
      
      // Update local state with formatted phone
      setPreferences(prev => ({ ...prev, phone_number: formattedPhone }));

      toast({
        title: 'Success',
        description: 'Notification preferences saved successfully'
      });
    } catch (error: any) {
      console.error('Error saving notification preferences:', error);
      const errorMessage = error.message || 'Failed to save notification preferences';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    if (key === 'push_notifications' && value && pushPermission !== 'granted') {
      requestPushPermission();
      return;
    }
    
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleFrequencyChange = (value: string) => {
    setPreferences(prev => ({ ...prev, notification_frequency: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Channels</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="system-notifications">In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">Show notifications in the admin dashboard</p>
                </div>
              </div>
              <Switch
                id="system-notifications"
                checked={preferences.system_notifications}
                onCheckedChange={(checked) => handleToggle('system_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.email_notifications}
                onCheckedChange={(checked) => handleToggle('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    {!pushSupported 
                      ? 'Not supported in your browser'
                      : pushPermission === 'granted' 
                        ? 'Browser push notifications'
                        : 'Click to enable browser notifications'
                    }
                  </p>
                </div>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.push_notifications}
                onCheckedChange={(checked) => handleToggle('push_notifications', checked)}
                disabled={!pushSupported}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="sms-notifications">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive text message notifications</p>
                </div>
              </div>
              <Switch
                id="sms-notifications"
                checked={preferences.sms_notifications}
                onCheckedChange={(checked) => handleToggle('sms_notifications', checked)}
              />
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notification Types</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="customer-activity">Customer Activity</Label>
                <p className="text-sm text-muted-foreground">Wishlist and cart additions from your customers</p>
              </div>
              <Switch
                id="customer-activity"
                checked={preferences.customer_activity_notifications}
                onCheckedChange={(checked) => handleToggle('customer_activity_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="inventory-updates">Inventory Updates</Label>
                <p className="text-sm text-muted-foreground">New mobile homes and inventory changes</p>
              </div>
              <Switch
                id="inventory-updates"
                checked={preferences.inventory_updates}
                onCheckedChange={(checked) => handleToggle('inventory_updates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="price-updates">Price Updates</Label>
                <p className="text-sm text-muted-foreground">Price changes and special offers</p>
              </div>
              <Switch
                id="price-updates"
                checked={preferences.price_updates}
                onCheckedChange={(checked) => handleToggle('price_updates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="estimate-updates">Estimate Updates</Label>
                <p className="text-sm text-muted-foreground">New estimate requests and approvals</p>
              </div>
              <Switch
                id="estimate-updates"
                checked={preferences.estimate_updates}
                onCheckedChange={(checked) => handleToggle('estimate_updates', checked)}
              />
            </div>
          </div>
        </div>

        {/* SMS Settings */}
        {preferences.sms_notifications && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">SMS Settings</h3>
            
            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Phone Number Configuration</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="phone-number" className="text-sm font-medium">
                    Your Phone Number
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <input
                      id="phone-number"
                      type="tel"
                      value={preferences.phone_number}
                      onChange={(e) => setPreferences(prev => ({ 
                        ...prev, 
                        phone_number: formatPhoneNumber(e.target.value) 
                      }))}
                      placeholder="314-650-0658"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Required for receiving SMS notifications about estimates
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Frequency */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Frequency</h3>
          <div className="space-y-2">
            <Label htmlFor="frequency">How often would you like to receive notifications?</Label>
            <Select value={preferences.notification_frequency} onValueChange={handleFrequencyChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="hourly">Hourly digest</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};