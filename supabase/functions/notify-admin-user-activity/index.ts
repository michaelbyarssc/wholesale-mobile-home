import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  user_id: string;
  activity_type: 'wishlist_add' | 'cart_add';
  mobile_home_id: string;
  mobile_home_model?: string;
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
    const { user_id, activity_type, mobile_home_id, mobile_home_model }: NotificationRequest = await req.json();

    console.log('🔔 Processing admin notification request:', { user_id, activity_type, mobile_home_id });

    // Get the user's profile to find their assigned admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('assigned_admin_id, first_name, last_name')
      .eq('user_id', user_id)
      .single();

    if (profileError || !profile) {
      console.log('❌ Profile not found or error:', profileError);
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!profile.assigned_admin_id) {
      console.log('ℹ️ User has no assigned admin, skipping notification');
      return new Response(JSON.stringify({ message: 'No assigned admin' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if the assigned admin is actually an admin/super admin
    const { data: adminRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.assigned_admin_id)
      .in('role', ['admin', 'super_admin']);

    if (roleError || !adminRoles || adminRoles.length === 0) {
      console.log('❌ Assigned user is not an admin:', roleError);
      return new Response(JSON.stringify({ error: 'Assigned user is not an admin' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check admin's notification preferences
    const { data: prefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('system_notifications, customer_activity_notifications, email_notifications, push_notifications, notification_frequency')
      .eq('user_id', profile.assigned_admin_id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.log('❌ Error fetching notification preferences:', prefsError);
    }

    // Default to enabled if no preferences found
    const preferences = prefs || {
      system_notifications: true,
      customer_activity_notifications: true,
      email_notifications: true,
      push_notifications: false,
      notification_frequency: 'immediate'
    };

    // Skip if admin has disabled customer activity notifications
    if (!preferences.customer_activity_notifications) {
      console.log('ℹ️ Admin has disabled customer activity notifications');
      return new Response(JSON.stringify({ message: 'Admin has disabled customer activity notifications' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get mobile home details if not provided
    let homeModel = mobile_home_model;
    if (!homeModel) {
      const { data: homeData } = await supabase
        .from('mobile_homes')
        .select('model')
        .eq('id', mobile_home_id)
        .single();
      
      homeModel = homeData?.model || 'Mobile Home';
    }

    // Create notification content
    const activityText = activity_type === 'wishlist_add' ? 'added to wishlist' : 'added to cart';
    const title = `Customer Activity: ${activityText}`;
    const message = `${profile.first_name} ${profile.last_name} ${activityText}: ${homeModel}`;

    // Create notification for the admin (in-app notification)
    if (preferences.system_notifications) {
      const { error: notificationError } = await supabase.rpc('create_notification', {
        p_user_id: profile.assigned_admin_id,
        p_title: title,
        p_message: message,
        p_type: 'info',
        p_category: 'customer_activity',
        p_data: {
          user_id,
          activity_type,
          mobile_home_id,
          mobile_home_model: homeModel,
          customer_name: `${profile.first_name} ${profile.last_name}`
        }
      });

      if (notificationError) {
        console.error('❌ Error creating in-app notification:', notificationError);
      } else {
        console.log('✅ In-app notification created successfully');
      }
    }

    // Send email notification if enabled
    if (preferences.email_notifications) {
      try {
        await supabase.functions.invoke('send-email-notification', {
          body: {
            recipient_id: profile.assigned_admin_id,
            subject: title,
            message: message,
            type: 'customer_activity'
          }
        });
        console.log('✅ Email notification sent successfully');
      } catch (emailError) {
        console.error('❌ Error sending email notification:', emailError);
      }
    }

    // Send push notification if enabled
    if (preferences.push_notifications) {
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: profile.assigned_admin_id,
            title: title,
            message: message,
            data: {
              type: 'customer_activity',
              user_id,
              activity_type,
              mobile_home_id
            }
          }
        });
        console.log('✅ Push notification sent successfully');
      } catch (pushError) {
        console.error('❌ Error sending push notification:', pushError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Admin notifications processed',
      admin_id: profile.assigned_admin_id,
      notifications_sent: {
        in_app: preferences.system_notifications,
        email: preferences.email_notifications,
        push: preferences.push_notifications
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in notify-admin-user-activity function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});