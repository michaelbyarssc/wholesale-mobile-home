import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface CalendarPreferences {
  id: string;
  user_id: string;
  event_privacy: string;
  sync_enabled: boolean;
  auto_create_events: boolean;
  check_availability: boolean;
  include_customer_details: boolean;
  include_mobile_home_details: boolean;
  event_title_template: string;
  created_at: string;
  updated_at: string;
}

interface CalendarPreferencesFormProps {
  preferences: CalendarPreferences | null;
  onUpdatePreferences: (preferences: Partial<CalendarPreferences>) => Promise<void>;
  loading?: boolean;
}

export function CalendarPreferencesForm({
  preferences,
  onUpdatePreferences,
  loading = false,
}: CalendarPreferencesFormProps) {
  const [formData, setFormData] = useState({
    event_privacy: preferences?.event_privacy || 'private',
    sync_enabled: preferences?.sync_enabled ?? true,
    auto_create_events: preferences?.auto_create_events ?? true,
    check_availability: preferences?.check_availability ?? true,
    include_customer_details: preferences?.include_customer_details ?? true,
    include_mobile_home_details: preferences?.include_mobile_home_details ?? true,
    event_title_template: preferences?.event_title_template || 'Appointment: {customer_name} - {mobile_home_model}',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdatePreferences(formData);
  };

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Preferences</CardTitle>
        <CardDescription>
          Configure how appointments are created and managed in your calendar
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sync Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Calendar Sync</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically sync appointments to your calendar
                </div>
              </div>
              <Switch
                checked={formData.sync_enabled}
                onCheckedChange={(checked) => handleChange('sync_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Create Events</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically create calendar events for new appointments
                </div>
              </div>
              <Switch
                checked={formData.auto_create_events}
                onCheckedChange={(checked) => handleChange('auto_create_events', checked)}
                disabled={!formData.sync_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Check Availability</Label>
                <div className="text-sm text-muted-foreground">
                  Check for conflicts before booking appointments
                </div>
              </div>
              <Switch
                checked={formData.check_availability}
                onCheckedChange={(checked) => handleChange('check_availability', checked)}
                disabled={!formData.sync_enabled}
              />
            </div>
          </div>

          <Separator />

          {/* Privacy Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event_privacy">Event Privacy</Label>
              <Select
                value={formData.event_privacy}
                onValueChange={(value) => handleChange('event_privacy', value)}
                disabled={!formData.sync_enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="default">Use Calendar Default</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                Controls who can see appointment details in your calendar
              </div>
            </div>
          </div>

          <Separator />

          {/* Content Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Customer Details</Label>
                <div className="text-sm text-muted-foreground">
                  Add customer information to calendar events
                </div>
              </div>
              <Switch
                checked={formData.include_customer_details}
                onCheckedChange={(checked) => handleChange('include_customer_details', checked)}
                disabled={!formData.sync_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Mobile Home Details</Label>
                <div className="text-sm text-muted-foreground">
                  Add mobile home information to calendar events
                </div>
              </div>
              <Switch
                checked={formData.include_mobile_home_details}
                onCheckedChange={(checked) => handleChange('include_mobile_home_details', checked)}
                disabled={!formData.sync_enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_title_template">Event Title Template</Label>
              <Input
                id="event_title_template"
                value={formData.event_title_template}
                onChange={(e) => handleChange('event_title_template', e.target.value)}
                disabled={!formData.sync_enabled}
                placeholder="Appointment: {customer_name} - {mobile_home_model}"
              />
              <div className="text-sm text-muted-foreground">
                Available variables: {'{customer_name}'}, {'{mobile_home_model}'}, {'{appointment_type}'}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading || !formData.sync_enabled}>
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}