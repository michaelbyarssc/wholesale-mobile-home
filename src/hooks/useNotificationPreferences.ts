import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];
type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update'];

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Create default preferences if none exist
      if (!data) {
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            email_notifications: true,
            push_notifications: true,
            estimate_updates: true,
            inventory_updates: true,
            price_updates: false,
            system_notifications: true,
            notification_frequency: 'immediate'
          })
          .select()
          .single();

        if (createError) throw createError;
        setPreferences(newPrefs);
      } else {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferencesUpdate>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !preferences) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data);
      return data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  return {
    preferences,
    isLoading,
    updatePreferences,
    refetch: fetchPreferences
  };
}