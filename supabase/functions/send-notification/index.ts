import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: 'estimate' | 'inventory' | 'price' | 'system';
  data?: Record<string, any>;
  expiresHours?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      userId, 
      title, 
      message, 
      type = 'info', 
      category = 'general',
      data = {},
      expiresHours 
    }: NotificationRequest = await req.json();

    console.log('Sending notification:', { userId, title, type, category });

    // Check user notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      console.error('Error fetching preferences:', prefsError);
    }

    // Check if user wants this type of notification
    const shouldSend = !preferences || (
      preferences.system_notifications && 
      (category === 'system' || 
       (category === 'estimate' && preferences.estimate_updates) ||
       (category === 'inventory' && preferences.inventory_updates) ||
       (category === 'price' && preferences.price_updates))
    );

    if (!shouldSend) {
      console.log('User has disabled this notification type');
      return new Response(
        JSON.stringify({ success: true, message: 'Notification disabled by user preferences' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification using the database function
    const { data: notificationId, error: notificationError } = await supabase
      .rpc('create_notification', {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_type: type,
        p_category: category,
        p_data: data,
        p_expires_hours: expiresHours
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
      throw notificationError;
    }

    console.log('Notification created successfully:', notificationId);

    // TODO: Send email notification if enabled
    if (preferences?.email_notifications && preferences.notification_frequency === 'immediate') {
      console.log('Would send email notification here');
      // Email sending logic would go here
    }

    // TODO: Send push notification if enabled
    if (preferences?.push_notifications) {
      console.log('Would send push notification here');
      // Push notification logic would go here
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationId,
        message: 'Notification sent successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});