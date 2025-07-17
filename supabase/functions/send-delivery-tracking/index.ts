import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { Resend } from 'npm:resend@2.0.0';
import twilio from 'npm:twilio@4.23.0';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Resend client for email
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

// Initialize Twilio client for SMS
const twilioClient = twilio(
  Deno.env.get('TWILIO_ACCOUNT_SID')!, 
  Deno.env.get('TWILIO_AUTH_TOKEN')!
);
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliveryNotificationRequest {
  deliveryId: string;
  notificationType: 'status_update' | 'eta_update' | 'delivery_complete' | 'pickup_complete';
  customMessage?: string;
}

async function getDeliveryDetails(deliveryId: string) {
  const { data, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      mobile_homes(display_name)
    `)
    .eq('id', deliveryId)
    .single();

  if (error) throw new Error(`Error fetching delivery: ${error.message}`);
  return data;
}

async function sendEmailNotification(delivery: any, notificationType: string, customMessage?: string) {
  const homeName = delivery.mobile_homes?.display_name || 'your mobile home';
  let subject = '';
  let content = '';

  switch (notificationType) {
    case 'status_update':
      subject = `Update on your delivery: ${delivery.delivery_number}`;
      content = `
        <h1>Delivery Status Update</h1>
        <p>Hello ${delivery.customer_name},</p>
        <p>Your delivery of ${homeName} has been updated to: <strong>${delivery.status.replace(/_/g, ' ')}</strong>.</p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}
        <p>You can track your delivery using this link: <a href="${supabaseUrl}/track/${delivery.delivery_number}">Track Delivery</a></p>
        <p>Thank you for your business!</p>
      `;
      break;
    case 'eta_update':
      subject = `Updated ETA for delivery: ${delivery.delivery_number}`;
      content = `
        <h1>Delivery ETA Update</h1>
        <p>Hello ${delivery.customer_name},</p>
        <p>We have an updated estimated time of arrival for your ${homeName}.</p>
        <p>Expected delivery: <strong>${new Date(delivery.scheduled_delivery_date).toLocaleString()}</strong></p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}
        <p>You can track your delivery using this link: <a href="${supabaseUrl}/track/${delivery.delivery_number}">Track Delivery</a></p>
        <p>Thank you for your business!</p>
      `;
      break;
    case 'delivery_complete':
      subject = `Delivery Completed: ${delivery.delivery_number}`;
      content = `
        <h1>Delivery Completed!</h1>
        <p>Hello ${delivery.customer_name},</p>
        <p>Your ${homeName} has been successfully delivered to ${delivery.delivery_address}.</p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}
        <p>Thank you for your business!</p>
      `;
      break;
    case 'pickup_complete':
      subject = `Pickup Completed for: ${delivery.delivery_number}`;
      content = `
        <h1>Factory Pickup Completed</h1>
        <p>Hello ${delivery.customer_name},</p>
        <p>Your ${homeName} has been picked up from the factory and is now in transit.</p>
        <p>Expected delivery: <strong>${new Date(delivery.scheduled_delivery_date).toLocaleString()}</strong></p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}
        <p>You can track your delivery using this link: <a href="${supabaseUrl}/track/${delivery.delivery_number}">Track Delivery</a></p>
        <p>Thank you for your business!</p>
      `;
      break;
  }

  const { data, error } = await resend.emails.send({
    from: 'Delivery Notifications <delivery@resend.dev>',
    to: [delivery.customer_email],
    subject,
    html: content,
  });

  if (error) throw new Error(`Error sending email: ${error.message}`);
  return data;
}

async function sendSmsNotification(delivery: any, notificationType: string, customMessage?: string) {
  const homeName = delivery.mobile_homes?.display_name || 'your mobile home';
  let message = '';

  switch (notificationType) {
    case 'status_update':
      message = `Delivery Update: Your ${homeName} delivery (${delivery.delivery_number}) status is now: ${delivery.status.replace(/_/g, ' ')}. ${customMessage || ''} Track at: ${supabaseUrl}/track/${delivery.delivery_number}`;
      break;
    case 'eta_update':
      message = `Updated ETA: Your ${homeName} delivery (${delivery.delivery_number}) is expected on ${new Date(delivery.scheduled_delivery_date).toLocaleString()}. ${customMessage || ''} Track at: ${supabaseUrl}/track/${delivery.delivery_number}`;
      break;
    case 'delivery_complete':
      message = `Delivery Complete! Your ${homeName} has been successfully delivered to your address. ${customMessage || ''} Thank you for your business!`;
      break;
    case 'pickup_complete':
      message = `Pickup Complete: Your ${homeName} has been picked up from the factory and is now in transit. Expected delivery: ${new Date(delivery.scheduled_delivery_date).toLocaleString()}. ${customMessage || ''} Track at: ${supabaseUrl}/track/${delivery.delivery_number}`;
      break;
  }

  // Truncate message if too long for SMS
  if (message.length > 1600) {
    message = message.substring(0, 1597) + '...';
  }

  const formattedPhone = delivery.customer_phone.replace(/\D/g, '');
  if (!formattedPhone.match(/^\d{10,15}$/)) {
    throw new Error(`Invalid phone number format: ${delivery.customer_phone}`);
  }

  const result = await twilioClient.messages.create({
    body: message,
    from: twilioPhoneNumber,
    to: `+${formattedPhone.startsWith('1') ? '' : '1'}${formattedPhone}`,
  });

  return result;
}

async function logNotification(deliveryId: string, notificationType: string, emailSent: boolean, smsSent: boolean, error?: string) {
  const { data, error: logError } = await supabase
    .from('delivery_notifications')
    .insert({
      delivery_id: deliveryId,
      notification_type: notificationType,
      email_sent: emailSent,
      sms_sent: smsSent,
      error_message: error,
      sent_at: new Date().toISOString()
    })
    .select()
    .single();

  if (logError) {
    console.error('Error logging notification:', logError);
  }

  return data;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { deliveryId, notificationType, customMessage } = await req.json() as DeliveryNotificationRequest;

    if (!deliveryId || !notificationType) {
      return new Response(
        JSON.stringify({ error: 'deliveryId and notificationType are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get delivery details
    const delivery = await getDeliveryDetails(deliveryId);
    if (!delivery) {
      return new Response(
        JSON.stringify({ error: 'Delivery not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Attempt to send email notification
    let emailResult = null;
    let emailError = null;
    let emailSent = false;
    try {
      if (delivery.customer_email) {
        emailResult = await sendEmailNotification(delivery, notificationType, customMessage);
        emailSent = true;
      }
    } catch (error) {
      console.error('Error sending email:', error);
      emailError = error.message;
    }

    // Attempt to send SMS notification
    let smsResult = null;
    let smsError = null;
    let smsSent = false;
    try {
      if (delivery.customer_phone) {
        smsResult = await sendSmsNotification(delivery, notificationType, customMessage);
        smsSent = true;
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      smsError = error.message;
    }

    // Log the notification
    const notificationLog = await logNotification(
      deliveryId, 
      notificationType, 
      emailSent, 
      smsSent, 
      emailError || smsError ? `Email: ${emailError || 'none'}, SMS: ${smsError || 'none'}` : undefined
    );

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        smsSent,
        notificationLog,
        emailResult,
        smsResult,
        emailError,
        smsError
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