import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeclineNotificationRequest {
  assignmentId: string;
  driverId: string;
  deliveryId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { assignmentId, driverId, deliveryId }: DeclineNotificationRequest = await req.json();

    // Get assignment details and find relevant admins
    const { data: assignment, error: assignmentError } = await supabase
      .from('delivery_assignments')
      .select(`
        *,
        drivers:driver_id (id, phone, full_name, email),
        deliveries:delivery_id (
          delivery_number,
          customer_name,
          customer_phone,
          mobile_homes (manufacturer, model),
          transaction_number,
          company_id
        )
      `)
      .eq('id', assignmentId)
      .single();

    if (assignmentError || !assignment) {
      console.error('Error fetching assignment:', assignmentError);
      return new Response(
        JSON.stringify({ error: 'Assignment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const driver = assignment.drivers;
    const delivery = assignment.deliveries;

    // Get customer's admin and super admins
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        user_id,
        display_name,
        phone,
        user_roles (role)
      `)
      .or(`user_roles.some.role.eq.super_admin,assigned_admin_id.eq.${delivery.customer_id || 'null'}`);

    if (profilesError) {
      console.error('Error fetching admin profiles:', profilesError);
    }

    // Find customer's admin and super admins
    const adminsToNotify = profiles?.filter(profile => 
      profile.user_roles.some((role: any) => 
        role.role === 'super_admin' || role.role === 'admin'
      )
    ) || [];

    const message = `DELIVERY ASSIGNMENT DECLINED

Driver: ${driver.full_name}
Delivery: ${delivery.transaction_number || delivery.delivery_number}
Customer: ${delivery.customer_name}
Mobile Home: ${delivery.mobile_homes?.manufacturer} ${delivery.mobile_homes?.model}

The driver has declined this assignment. Please reassign to another driver.

Login to admin portal to manage assignments.`;

    const emailSubject = `Driver Declined Assignment - ${delivery.transaction_number || delivery.delivery_number}`;

    // Send notifications to each admin
    const notificationPromises = adminsToNotify.map(async (admin) => {
      const notifications = [];

      // Send SMS if admin has phone
      if (admin.phone) {
        const cleanPhone = admin.phone.replace(/[^0-9]/g, '');
        const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;
        
        notifications.push(
          supabase.functions.invoke('send-sms-notification', {
            body: {
              to: formattedPhone,
              message: message,
              delivery_id: deliveryId
            }
          })
        );
      }

      // Send email notification
      notifications.push(
        supabase.functions.invoke('send-email-notification', {
          body: {
            to: admin.user_id,
            subject: emailSubject,
            template: 'assignment-declined',
            data: {
              driverName: driver.full_name,
              deliveryNumber: delivery.transaction_number || delivery.delivery_number,
              customerName: delivery.customer_name,
              mobileHome: `${delivery.mobile_homes?.manufacturer} ${delivery.mobile_homes?.model}`,
              adminName: admin.display_name
            }
          }
        })
      );

      return Promise.all(notifications);
    });

    await Promise.all(notificationPromises);

    // Log the decline event
    await supabase
      .from('delivery_status_history')
      .insert({
        delivery_id: deliveryId,
        previous_status: 'assignment_notified',
        new_status: 'assignment_declined',
        changed_by: driverId,
        notes: `Assignment declined by driver ${driver.full_name}. Admin notifications sent.`,
        driver_id: driverId
      });

    console.log(`Admin notifications sent for declined assignment by ${driver.full_name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin notifications sent successfully',
        notifiedAdmins: adminsToNotify.length,
        driverName: driver.full_name
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in notify-admin-driver-decline function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);