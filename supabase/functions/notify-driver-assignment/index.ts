import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
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

    const { assignmentId, driverId, deliveryId }: NotificationRequest = await req.json();

    // Get driver and delivery details
    const { data: assignment, error: assignmentError } = await supabase
      .from('delivery_assignments')
      .select(`
        *,
        drivers:driver_id (id, phone, full_name, email),
        deliveries:delivery_id (
          delivery_number,
          customer_name,
          customer_phone,
          pickup_address,
          delivery_address,
          mobile_homes (manufacturer, model),
          transaction_number
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

    if (!driver?.phone) {
      console.error('Driver phone number not found');
      return new Response(
        JSON.stringify({ error: 'Driver phone number not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for SMS
    const cleanPhone = driver.phone.replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

    // Create SMS message
    const message = `New delivery assignment: ${delivery.transaction_number || delivery.delivery_number}
Customer: ${delivery.customer_name}
From: ${delivery.pickup_address}
To: ${delivery.delivery_address}
Home: ${delivery.mobile_homes?.manufacturer} ${delivery.mobile_homes?.model}

Login to your Driver Portal to accept or decline this assignment.`;

    // Send SMS notification
    const { error: smsError } = await supabase.functions.invoke('send-sms-notification', {
      body: {
        to: formattedPhone,
        message: message,
        delivery_id: deliveryId
      }
    });

    if (smsError) {
      console.error('Error sending SMS:', smsError);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the notification
    await supabase
      .from('delivery_status_history')
      .insert({
        delivery_id: deliveryId,
        previous_status: null,
        new_status: 'assignment_notified',
        changed_by: null,
        notes: `SMS notification sent to driver ${driver.full_name} (${driver.phone})`,
        driver_id: driverId
      });

    console.log(`Driver assignment notification sent to ${driver.full_name} (${driver.phone})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Driver notification sent successfully',
        driverName: driver.full_name,
        driverPhone: driver.phone
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in notify-driver-assignment function:', error);
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