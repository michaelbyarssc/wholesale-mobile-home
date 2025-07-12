import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  user_id: string;
  title: string;
  message: string;
  data?: any;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, message, data }: PushNotificationRequest = await req.json();

    console.log('📱 Processing push notification request:', { user_id, title });

    // Get user's push subscriptions
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('subscription_data')
      .eq('user_id', user_id)
      .eq('active', true);

    if (subscriptionError) {
      console.error('❌ Error fetching push subscriptions:', subscriptionError);
      return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('ℹ️ No active push subscriptions found for user');
      return new Response(JSON.stringify({ message: 'No active subscriptions' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Send push notification to all user's devices
    const results = [];
    for (const sub of subscriptions) {
      try {
        const subscription = sub.subscription_data as any;
        
        // Use Web Push API to send notification
        const pushPayload = JSON.stringify({
          title,
          body: message,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          data: data || {}
        });

        // Note: In a real implementation, you would use a Web Push library
        // For now, we'll log the notification that would be sent
        console.log('📱 Would send push notification:', {
          subscription: subscription.endpoint,
          payload: pushPayload
        });

        results.push({ success: true, endpoint: subscription.endpoint });
      } catch (error) {
        console.error('❌ Error sending push notification:', error);
        results.push({ success: false, error: error.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Push notifications processed',
      results: results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in send-push-notification function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});