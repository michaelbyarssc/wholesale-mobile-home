import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CalendarConnection {
  id: string;
  google_account_email: string;
  calendar_id: string;
  calendar_name: string;
  calendar_timezone?: string;
  is_primary: boolean;
  is_default_for_appointments: boolean;
  token_expires_at: string;
  created_at: string;
}

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

export function useGoogleCalendar() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [preferences, setPreferences] = useState<CalendarPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const { toast } = useToast();

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('user_calendar_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching calendar connections:', error);
      toast({
        title: "Error",
        description: "Failed to load calendar connections",
        variant: "destructive",
      });
    }
  };

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_calendar_preferences')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setPreferences(data);
    } catch (error) {
      console.error('Error fetching calendar preferences:', error);
    }
  };

  const connectGoogleCalendar = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_auth_url' }
      });

      if (error) throw error;

      // Open Google OAuth in popup
      const popup = window.open(
        data.auth_url,
        'google-calendar-auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // Listen for auth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_CALENDAR_AUTH_SUCCESS') {
          popup?.close();
          toast({
            title: "Success",
            description: "Google Calendar connected successfully!",
          });
          fetchConnections();
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'GOOGLE_CALENDAR_AUTH_ERROR') {
          popup?.close();
          toast({
            title: "Error",
            description: event.data.error || "Failed to connect Google Calendar",
            variant: "destructive",
          });
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Clean up if popup is closed manually
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);

    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
      toast({
        title: "Error",
        description: "Failed to initiate Google Calendar connection",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const disconnectCalendar = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('user_calendar_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Calendar disconnected successfully",
      });
      fetchConnections();
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect calendar",
        variant: "destructive",
      });
    }
  };

  const setDefaultCalendar = async (connectionId: string) => {
    try {
      // First, unset all defaults
      await supabase
        .from('user_calendar_connections')
        .update({ is_default_for_appointments: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Then set the new default
      const { error } = await supabase
        .from('user_calendar_connections')
        .update({ is_default_for_appointments: true })
        .eq('id', connectionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default calendar updated",
      });
      fetchConnections();
    } catch (error) {
      console.error('Error setting default calendar:', error);
      toast({
        title: "Error",
        description: "Failed to update default calendar",
        variant: "destructive",
      });
    }
  };

  const updatePreferences = async (newPreferences: Partial<CalendarPreferences>) => {
    try {
      const { data, error } = await supabase
        .from('user_calendar_preferences')
        .upsert({
          ...preferences,
          ...newPreferences,
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      toast({
        title: "Success",
        description: "Calendar preferences updated",
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchConnections(), fetchPreferences()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    connections,
    preferences,
    loading,
    connecting,
    connectGoogleCalendar,
    disconnectCalendar,
    setDefaultCalendar,
    updatePreferences,
    refreshConnections: fetchConnections,
  };
}