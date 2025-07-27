
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Percent, Settings, MessageSquare, Phone, TestTube } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatPhoneNumber, isValidPhoneNumber, toTwilioFormat } from '@/utils/phoneUtils';

interface SuperAdminMarkup {
  id: string;
  user_id: string;
  markup_percentage: number;
  created_at: string;
  updated_at: string;
}

export const SuperAdminMarkupTab = () => {
  const [markupPercentage, setMarkupPercentage] = useState<number>(1.0);
  const [saving, setSaving] = useState(false);
  
  // SMS Settings
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState('New estimate from ${customer_name} for ${mobile_home_model} ($${total_amount}). Review at www.WholesaleMobileHome.com. Contact: ${customer_phone}. Good luck!');
  const [fallbackPhone, setFallbackPhone] = useState('');
  const [testingPhone, setTestingPhone] = useState('');
  const [testingSms, setTestingSms] = useState(false);
  
  const { toast } = useToast();

  // Fetch current super admin markup
  const { data: superAdminMarkup, isLoading, refetch } = useQuery({
    queryKey: ['super-admin-markup'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('super_admin_markups')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  // Fetch SMS settings
  const { data: smsSettings, isLoading: smsLoading, refetch: refetchSms } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['sms_notifications_enabled', 'sms_template', 'fallback_admin_phone']);

      if (error) throw error;
      
      // Convert array to object for easier access
      const settings: Record<string, string> = {};
      data.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value;
      });
      
      return settings;
    }
  });

  useEffect(() => {
    if (superAdminMarkup) {
      setMarkupPercentage(superAdminMarkup.markup_percentage);
    }
  }, [superAdminMarkup]);

  useEffect(() => {
    if (smsSettings) {
      setSmsEnabled(smsSettings.sms_notifications_enabled === 'true');
      setSmsTemplate(smsSettings.sms_template || smsTemplate);
      setFallbackPhone(smsSettings.fallback_admin_phone || '');
    }
  }, [smsSettings]);

  const handleSaveSmsSettings = async () => {
    try {
      setSaving(true);
      
      // Format phone number
      const formattedPhone = formatPhoneNumber(fallbackPhone);
      
      // Validate phone number if provided
      if (fallbackPhone && !isValidPhoneNumber(formattedPhone)) {
        throw new Error('Please enter a valid phone number (XXX-XXX-XXXX format)');
      }

      // Update SMS settings
      const settingsToUpdate = [
        { setting_key: 'sms_notifications_enabled', setting_value: smsEnabled.toString() },
        { setting_key: 'sms_template', setting_value: smsTemplate },
        { setting_key: 'fallback_admin_phone', setting_value: formattedPhone }
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(setting);

        if (error) throw error;
      }

      // Update local state with formatted phone
      setFallbackPhone(formattedPhone);

      toast({
        title: "Success",
        description: "SMS notification settings saved successfully",
      });

      refetchSms();
    } catch (error: any) {
      console.error('Error saving SMS settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save SMS settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestSms = async () => {
    try {
      setTestingSms(true);
      
      const phoneToTest = testingPhone || fallbackPhone;
      if (!phoneToTest) {
        throw new Error('Please enter a phone number to test');
      }

      if (!isValidPhoneNumber(phoneToTest)) {
        throw new Error('Please enter a valid phone number');
      }

      const testMessage = smsTemplate
        .replace('${customer_name}', 'Test Customer')
        .replace('${mobile_home_model}', 'Test Model')
        .replace('${total_amount}', '50,000')
        .replace('${customer_phone}', '555-123-4567');

      const { data, error } = await supabase.functions.invoke('send-sms-notification', {
        body: {
          to: toTwilioFormat(phoneToTest),
          message: `TEST SMS: ${testMessage}`
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Test SMS sent to ${formatPhoneNumber(phoneToTest)}`,
      });
    } catch (error: any) {
      console.error('Error sending test SMS:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send test SMS",
        variant: "destructive",
      });
    } finally {
      setTestingSms(false);
    }
  };

  const handleSaveMarkup = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      if (superAdminMarkup) {
        // Update existing markup
        const { error } = await supabase
          .from('super_admin_markups')
          .update({
            markup_percentage: markupPercentage,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new markup
        const { error } = await supabase
          .from('super_admin_markups')
          .insert({
            user_id: user.id,
            markup_percentage: markupPercentage
          });

        if (error) throw error;
      }

      // Also update all customer markups with the new super admin markup
      const { error: updateError } = await supabase
        .from('customer_markups')
        .update({
          super_admin_markup_percentage: markupPercentage,
          updated_at: new Date().toISOString()
        })
        .eq('tier_level', 'admin'); // Update all admin tier markups

      if (updateError) {
        console.warn('Failed to update cascading markups:', updateError);
      }

      toast({
        title: "Success",
        description: `Super admin markup updated to ${markupPercentage}%`,
      });

      refetch();
    } catch (error: any) {
      console.error('Error saving super admin markup:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save super admin markup",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Super Admin Markup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <div>
              <CardTitle>Super Admin Markup Configuration</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Set your markup percentage that applies to all admin-level pricing
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="markup-percentage" className="text-base font-medium">
                  Super Admin Markup Percentage
                </Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="markup-percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={markupPercentage}
                    onChange={(e) => setMarkupPercentage(parseFloat(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <Percent className="h-4 w-4 text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  This markup applies on top of base costs before admin markups
                </p>
              </div>
              
              <Button 
                onClick={handleSaveMarkup}
                disabled={saving}
                className="w-full"
              >
                {saving ? "Saving..." : "Save Markup"}
              </Button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-3">Pricing Structure</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Cost:</span>
                  <span className="font-mono">$1,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Super Admin ({markupPercentage}%):</span>
                  <span className="font-mono">+${(1000 * markupPercentage / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Admin sees:</span>
                  <span className="font-mono font-medium">${(1000 * (1 + markupPercentage / 100)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Admin Markup (30%):</span>
                  <span className="font-mono">+${(1000 * (1 + markupPercentage / 100) * 0.30).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span className="text-gray-900">Customer pays:</span>
                  <span className="font-mono">${(1000 * (1 + markupPercentage / 100) * 1.30).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <div>
              <CardTitle>SMS Notification Configuration</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Configure SMS notifications for new estimate submissions
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master SMS Toggle */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <div>
                <Label htmlFor="sms-enabled" className="text-base font-medium">
                  Enable SMS Notifications
                </Label>
                <p className="text-sm text-gray-600">
                  Send SMS alerts when customers submit estimates
                </p>
              </div>
            </div>
            <Switch
              id="sms-enabled"
              checked={smsEnabled}
              onCheckedChange={setSmsEnabled}
            />
          </div>

          {smsEnabled && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SMS Template */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sms-template" className="text-base font-medium">
                    SMS Message Template
                  </Label>
                  <Textarea
                    id="sms-template"
                    value={smsTemplate}
                    onChange={(e) => setSmsTemplate(e.target.value)}
                    placeholder="Enter SMS template..."
                    className="mt-2 min-h-[120px]"
                  />
                  <div className="text-xs text-gray-500 mt-2">
                    <p className="font-medium mb-1">Available variables:</p>
                    <div className="grid grid-cols-2 gap-1">
                      <span>• {'${customer_name}'}</span>
                      <span>• {'${total_amount}'}</span>
                      <span>• {'${mobile_home_model}'}</span>
                      <span>• {'${customer_phone}'}</span>
                    </div>
                  </div>
                </div>

                {/* Fallback Phone */}
                <div>
                  <Label htmlFor="fallback-phone" className="text-base font-medium">
                    Fallback Admin Phone Number
                  </Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <Input
                      id="fallback-phone"
                      type="tel"
                      value={fallbackPhone}
                      onChange={(e) => setFallbackPhone(formatPhoneNumber(e.target.value))}
                      placeholder="314-650-0658"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Used when no assigned admin or anonymous estimates
                  </p>
                </div>

                <Button 
                  onClick={handleSaveSmsSettings}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save SMS Settings"}
                </Button>
              </div>

              {/* Test SMS Section */}
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <TestTube className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-900">Test SMS</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="test-phone" className="text-sm font-medium">
                        Test Phone Number (optional)
                      </Label>
                      <Input
                        id="test-phone"
                        type="tel"
                        value={testingPhone}
                        onChange={(e) => setTestingPhone(formatPhoneNumber(e.target.value))}
                        placeholder="314-650-0658"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to use fallback number
                      </p>
                    </div>

                    <Button 
                      onClick={handleTestSms}
                      disabled={testingSms || !smsTemplate || (!testingPhone && !fallbackPhone)}
                      variant="outline"
                      className="w-full border-green-200 text-green-700 hover:bg-green-50"
                    >
                      {testingSms ? "Sending..." : "Send Test SMS"}
                    </Button>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Message Preview</h3>
                  <div className="text-sm text-gray-700 bg-white p-3 rounded border">
                    {smsTemplate
                      .replace('${customer_name}', 'John Doe')
                      .replace('${mobile_home_model}', 'Clayton Sensation')
                      .replace('${total_amount}', '75,000')
                      .replace('${customer_phone}', '555-123-4567')
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
