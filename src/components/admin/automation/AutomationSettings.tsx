import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Settings, Save } from "lucide-react";

interface AutomationSetting {
  setting_key: string;
  setting_value: any;
  description: string;
}

export function AutomationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({
    max_daily_messages_per_lead: 3,
    max_weekly_messages_per_lead: 10,
    global_automation_enabled: true,
    business_hours_only: false,
    business_hours: { start: "09:00", end: "17:00", timezone: "America/New_York" },
    opt_out_message: { email: "Reply STOP to opt out", sms: "Reply STOP to opt out" }
  });

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_settings')
        .select('*');

      if (error) throw error;

      const settingsMap: Record<string, any> = {};
      data.forEach((setting: AutomationSetting) => {
        settingsMap[setting.setting_key] = setting.setting_value.value || setting.setting_value;
      });

      setSettings({ ...settings, ...settingsMap });
    } catch (error) {
      console.error('Error fetching automation settings:', error);
      toast({
        title: "Error",
        description: "Failed to fetch automation settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: { value },
        updated_by: undefined // Will be set by server trigger
      }));

      for (const update of updates) {
        await supabase
          .from('automation_settings')
          .upsert(update, { onConflict: 'setting_key' });
      }

      toast({
        title: "Success",
        description: "Automation settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving automation settings:', error);
      toast({
        title: "Error",
        description: "Failed to save automation settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return <div className="p-6">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Automation Settings</h3>
      </div>

      <div className="grid gap-6">
        {/* Global Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Global Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Enable Automations</Label>
                <p className="text-sm text-muted-foreground">
                  Master switch for all automation features
                </p>
              </div>
              <Switch
                checked={settings.global_automation_enabled}
                onCheckedChange={(checked) => updateSetting('global_automation_enabled', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Business Hours Only</Label>
                <p className="text-sm text-muted-foreground">
                  Only send messages during business hours
                </p>
              </div>
              <Switch
                checked={settings.business_hours_only}
                onCheckedChange={(checked) => updateSetting('business_hours_only', checked)}
              />
            </div>

            {settings.business_hours_only && (
              <div className="grid grid-cols-2 gap-4 pl-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={settings.business_hours?.start || "09:00"}
                    onChange={(e) => updateSetting('business_hours', {
                      ...settings.business_hours,
                      start: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={settings.business_hours?.end || "17:00"}
                    onChange={(e) => updateSetting('business_hours', {
                      ...settings.business_hours,
                      end: e.target.value
                    })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Message Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="daily_limit">Daily Messages per Lead</Label>
                <Input
                  id="daily_limit"
                  type="number"
                  min="1"
                  value={settings.max_daily_messages_per_lead}
                  onChange={(e) => updateSetting('max_daily_messages_per_lead', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum messages per lead per day
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weekly_limit">Weekly Messages per Lead</Label>
                <Input
                  id="weekly_limit"
                  type="number"
                  min="1"
                  value={settings.max_weekly_messages_per_lead}
                  onChange={(e) => updateSetting('max_weekly_messages_per_lead', parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum messages per lead per week
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opt-out Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Opt-out Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email_opt_out">Email Opt-out Message</Label>
              <Textarea
                id="email_opt_out"
                value={settings.opt_out_message?.email || ""}
                onChange={(e) => updateSetting('opt_out_message', {
                  ...settings.opt_out_message,
                  email: e.target.value
                })}
                placeholder="Instructions for email opt-out"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms_opt_out">SMS Opt-out Message</Label>
              <Textarea
                id="sms_opt_out"
                value={settings.opt_out_message?.sms || ""}
                onChange={(e) => updateSetting('opt_out_message', {
                  ...settings.opt_out_message,
                  sms: e.target.value
                })}
                placeholder="Instructions for SMS opt-out"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Integration Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Integration Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">SMS Service (Twilio)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                To enable SMS automations, you need to configure your Twilio API credentials.
              </p>
              <Button variant="outline" size="sm">
                Configure Twilio
              </Button>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Email Service (Resend)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Email automations use your existing Resend integration.
              </p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Connected</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}