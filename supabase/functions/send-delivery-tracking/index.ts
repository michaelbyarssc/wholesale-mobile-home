import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { Resend } from 'npm:resend@2.0.0'
import { Twilio } from 'npm:twilio@4.19.0'

// Initialize clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const twilio = new Twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID'),
  Deno.env.get('TWILIO_AUTH_TOKEN')
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  deliveryId: string;
  notificationType: 'status_update' | 'delivery_completed' | 'pickup_started' | 'custom';
  customMessage?: string;
}

interface Notification {
  type: string;
  emailSubject: string;
  emailTemplate: string;
  smsTemplate: string;
}

// Notification templates
const notificationTemplates: Record<string, Notification> = {
  status_update: {
    type: 'status_update',
    emailSubject: 'Delivery Status Update',
    emailTemplate: `
      <h1>Your Delivery Status Has Been Updated</h1>
      <p>Your delivery #{{deliveryNumber}} has been updated to status: {{status}}</p>
      <p>Current Location: {{location}}</p>
      {{#if eta}}
      <p>Estimated arrival: {{eta}}</p>
      {{/if}}
      <p>Track your delivery: {{trackingUrl}}</p>
    `,
    smsTemplate: 'Your delivery #{{deliveryNumber}} status: {{status}}. {{#if eta}}ETA: {{eta}}. {{/if}}Track: {{trackingUrl}}'
  },
  delivery_completed: {
    type: 'delivery_completed',
    emailSubject: 'Delivery Successfully Completed',
    emailTemplate: `
      <h1>Your Delivery is Complete!</h1>
      <p>Your delivery #{{deliveryNumber}} has been successfully completed.</p>
      <p>Thank you for choosing our services.</p>
      <p>View delivery details: {{trackingUrl}}</p>
    `,
    smsTemplate: 'Your delivery #{{deliveryNumber}} has been completed. Thank you for choosing our services!'
  },
  pickup_started: {
    type: 'pickup_started',
    emailSubject: 'Pickup Process Started',
    emailTemplate: `
      <h1>Pickup Process Has Started</h1>
      <p>The pickup process for your delivery #{{deliveryNumber}} has begun.</p>
      <p>Our team will keep you updated on the progress.</p>
      <p>Track your delivery: {{trackingUrl}}</p>
    `,
    smsTemplate: 'Pickup started for delivery #{{deliveryNumber}}. Track: {{trackingUrl}}'
  }
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      deliveryId, 
      notificationType,
      customMessage 
    } = await req.json() as NotificationRequest;

    if (!deliveryId || !notificationType) {
      return new Response(
        JSON.stringify({ error: 'deliveryId and notificationType are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get delivery details
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select(`
        *,
        mobile_homes (
          display_name
        )
      `)
      .eq('id', deliveryId)
      .maybeSingle();

    if (deliveryError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch delivery details', details: deliveryError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get the notification template
    const template = notificationTemplates[notificationType];
    if (!template && notificationType !== 'custom') {
      return new Response(
        JSON.stringify({ error: 'Invalid notification type' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Build notification content
    const trackingUrl = `${Deno.env.get('PUBLIC_SITE_URL')}/track/${delivery.delivery_number}`;
    const variables = {
      deliveryNumber: delivery.delivery_number,
      status: delivery.status,
      location: 'In Transit', // TODO: Get actual location from GPS
      trackingUrl,
      eta: null // TODO: Calculate ETA based on GPS
    };

    // Prepare notification content
    const emailContent = customMessage || template?.emailTemplate.replace(
      /{{(\w+)}}/g,
      (match, key) => variables[key] || match
    );

    const smsContent = customMessage || template?.smsTemplate.replace(
      /{{(\w+)}}/g,
      (match, key) => variables[key] || match
    );

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from('delivery_notifications')
      .insert({
        delivery_id: deliveryId,
        notification_type: notificationType,
        scheduled_for: new Date().toISOString()
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Failed to create notification record:', notificationError);
      // Continue even if record creation fails
    }

    // Send email notification
    if (delivery.customer_email) {
      try {
        const emailResult = await resend.emails.send({
          from: 'Delivery Updates <deliveries@updates.example.com>',
          to: delivery.customer_email,
          subject: template?.emailSubject || 'Delivery Update',
          html: emailContent,
        });

        // Update notification record
        await supabase
          .from('delivery_notifications')
          .update({ email_sent: true })
          .eq('id', notification.id);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    // Send SMS notification
    if (delivery.customer_phone) {
      try {
        const smsResult = await twilio.messages.create({
          body: smsContent,
          to: delivery.customer_phone,
          from: Deno.env.get('TWILIO_PHONE_NUMBER')
        });

        // Update notification record
        await supabase
          .from('delivery_notifications')
          .update({ sms_sent: true })
          .eq('id', notification.id);
      } catch (smsError) {
        console.error('Failed to send SMS:', smsError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Error in send-delivery-tracking function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});