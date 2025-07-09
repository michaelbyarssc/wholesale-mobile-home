import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type ActivityItem = Database['public']['Tables']['activity_feed']['Row'];

export function useActivityFeed(limit = 20) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .or(`user_id.eq.${user.id},actor_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activity feed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Set up real-time subscription for activity feed
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const channel = supabase
          .channel('activity_feed')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'activity_feed'
            },
            (payload) => {
              const newActivity = payload.new as ActivityItem;
              // Only add if relevant to current user
              if (newActivity.user_id === user.id || newActivity.actor_id === user.id) {
                setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    setupRealtime();
  }, [limit]);

  return {
    activities,
    isLoading,
    refetch: fetchActivities
  };
}

// Helper function to create activity records
export async function createActivity(
  userId: string | null,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  metadata: Record<string, any> = {}
) {
  try {
    const { error } = await supabase.rpc('create_activity', {
      p_user_id: userId,
      p_actor_id: actorId,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_description: description,
      p_metadata: metadata
    });

    if (error) throw error;
  } catch (error) {
    console.error('Error creating activity:', error);
  }
}