import { useState, useEffect } from 'react';
import { Settings, Clock, Users, MapPin, Calendar, Bell, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CalendarSettingsData {
  appointment_duration: number;
  buffer_time: number;
  max_bookings_per_slot: number;
  advance_booking_days: number;
  working_hours_start: string;
  working_hours_end: string;
  working_days: string[];
  auto_confirm: boolean;
  send_reminders: boolean;
  reminder_hours: number;
  default_location: string;
  booking_instructions: string;
  allow_cancellation: boolean;
  cancellation_hours: number;
}

const defaultSettings: CalendarSettingsData = {
  appointment_duration: 60,
  buffer_time: 15,
  max_bookings_per_slot: 1,
  advance_booking_days: 30,
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  auto_confirm: false,
  send_reminders: true,
  reminder_hours: 24,
  default_location: 'showroom',
  booking_instructions: '',
  allow_cancellation: true,
  cancellation_hours: 24,
};

const weekDays = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

export function CalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettingsData>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .like('setting_key', 'calendar_%');

      if (error) throw error;

      const settingsMap = data?.reduce((acc, item) => {
        const key = item.setting_key.replace('calendar_', '');
        acc[key] = item.setting_value;
        return acc;
      }, {} as Record<string, any>) || {};

      setSettings({ ...defaultSettings, ...settingsMap });
    } catch (error) {
      console.error('Error loading calendar settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Convert settings to individual admin_settings records
      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        setting_key: `calendar_${key}`,
        setting_value: typeof value === 'string' ? value : JSON.stringify(value),
        description: getSettingDescription(key),
      }));

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('admin_settings')
          .upsert(setting, { onConflict: 'setting_key' });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Calendar settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save calendar settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getSettingDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      appointment_duration: 'Default appointment duration in minutes',
      buffer_time: 'Buffer time between appointments in minutes',
      max_bookings_per_slot: 'Maximum bookings allowed per time slot',
      advance_booking_days: 'How many days in advance customers can book',
      working_hours_start: 'Start of working hours',
      working_hours_end: 'End of working hours',
      working_days: 'Available working days',
      auto_confirm: 'Automatically confirm appointments',
      send_reminders: 'Send reminder notifications',
      reminder_hours: 'Hours before appointment to send reminder',
      default_location: 'Default appointment location',
      booking_instructions: 'Instructions shown to customers when booking',
      allow_cancellation: 'Allow customers to cancel appointments',
      cancellation_hours: 'Minimum hours before appointment to allow cancellation',
    };
    return descriptions[key] || '';
  };

  const handleWorkingDayToggle = (day: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      working_days: checked
        ? [...prev.working_days, day]
        : prev.working_days.filter(d => d !== day)
    }));
  };

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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Calendar Settings
          </h2>
          <p className="text-muted-foreground">
            Configure appointment booking settings and availability
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Appointment Duration & Timing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Appointment Duration & Timing
          </CardTitle>
          <CardDescription>
            Configure appointment duration and scheduling intervals
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="duration">Appointment Duration (minutes)</Label>
            <Select
              value={settings.appointment_duration.toString()}
              onValueChange={(value) => setSettings(prev => ({ ...prev, appointment_duration: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="buffer">Buffer Time (minutes)</Label>
            <Select
              value={settings.buffer_time.toString()}
              onValueChange={(value) => setSettings(prev => ({ ...prev, buffer_time: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No buffer</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Working Hours & Days */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Working Hours & Availability
          </CardTitle>
          <CardDescription>
            Set your working hours and available days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-time">Working Hours Start</Label>
              <Input
                id="start-time"
                type="time"
                value={settings.working_hours_start}
                onChange={(e) => setSettings(prev => ({ ...prev, working_hours_start: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time">Working Hours End</Label>
              <Input
                id="end-time"
                type="time"
                value={settings.working_hours_end}
                onChange={(e) => setSettings(prev => ({ ...prev, working_hours_end: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Working Days</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {weekDays.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Switch
                    id={day.value}
                    checked={settings.working_days.includes(day.value)}
                    onCheckedChange={(checked) => handleWorkingDayToggle(day.value, checked)}
                  />
                  <Label htmlFor={day.value} className="text-sm">{day.label}</Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Capacity & Restrictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Booking Capacity & Restrictions
          </CardTitle>
          <CardDescription>
            Configure booking limits and advance booking settings
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="max-bookings">Max Bookings per Time Slot</Label>
            <Select
              value={settings.max_bookings_per_slot.toString()}
              onValueChange={(value) => setSettings(prev => ({ ...prev, max_bookings_per_slot: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 appointment</SelectItem>
                <SelectItem value="2">2 appointments</SelectItem>
                <SelectItem value="3">3 appointments</SelectItem>
                <SelectItem value="4">4 appointments</SelectItem>
                <SelectItem value="5">5 appointments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="advance-days">Advance Booking (days)</Label>
            <Select
              value={settings.advance_booking_days.toString()}
              onValueChange={(value) => setSettings(prev => ({ ...prev, advance_booking_days: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
                <SelectItem value="60">2 months</SelectItem>
                <SelectItem value="90">3 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Location & Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location & Instructions
          </CardTitle>
          <CardDescription>
            Set default location and booking instructions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location">Default Location</Label>
            <Select
              value={settings.default_location}
              onValueChange={(value) => setSettings(prev => ({ ...prev, default_location: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="showroom">Showroom</SelectItem>
                <SelectItem value="customer_site">Customer Site</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="virtual">Virtual Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Booking Instructions</Label>
            <Textarea
              id="instructions"
              placeholder="Instructions that will be shown to customers when booking..."
              value={settings.booking_instructions}
              onChange={(e) => setSettings(prev => ({ ...prev, booking_instructions: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications & Automation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications & Automation
          </CardTitle>
          <CardDescription>
            Configure automatic confirmations and reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-confirm Appointments</Label>
              <p className="text-sm text-muted-foreground">
                Automatically confirm appointments without manual approval
              </p>
            </div>
            <Switch
              checked={settings.auto_confirm}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_confirm: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Send Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Send reminder notifications before appointments
              </p>
            </div>
            <Switch
              checked={settings.send_reminders}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, send_reminders: checked }))}
            />
          </div>

          {settings.send_reminders && (
            <div className="space-y-2">
              <Label htmlFor="reminder-hours">Reminder Time (hours before)</Label>
              <Select
                value={settings.reminder_hours.toString()}
                onValueChange={(value) => setSettings(prev => ({ ...prev, reminder_hours: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours (1 day)</SelectItem>
                  <SelectItem value="48">48 hours (2 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Cancellation</Label>
              <p className="text-sm text-muted-foreground">
                Allow customers to cancel their appointments
              </p>
            </div>
            <Switch
              checked={settings.allow_cancellation}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allow_cancellation: checked }))}
            />
          </div>

          {settings.allow_cancellation && (
            <div className="space-y-2">
              <Label htmlFor="cancellation-hours">Cancellation Deadline (hours before)</Label>
              <Select
                value={settings.cancellation_hours.toString()}
                onValueChange={(value) => setSettings(prev => ({ ...prev, cancellation_hours: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="4">4 hours</SelectItem>
                  <SelectItem value="12">12 hours</SelectItem>
                  <SelectItem value="24">24 hours (1 day)</SelectItem>
                  <SelectItem value="48">48 hours (2 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}