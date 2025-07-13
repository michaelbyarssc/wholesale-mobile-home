import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Twilio configuration
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

interface DeliveryTrackingRequest {
  deliveryId: string;
  notificationType?: 'email' | 'sms' | 'both';
}

async function sendSMS(to: string, message: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  
  const body = new URLSearchParams({
    To: to,
    From: TWILIO_PHONE_NUMBER!,
    Body: message,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  return response.json();
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Send delivery tracking function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { deliveryId, notificationType = 'both' }: DeliveryTrackingRequest = await req.json();
    console.log('Processing delivery tracking for:', deliveryId);

    // Get delivery information and tracking token
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('deliveries')
      .select(`
        *,
        mobile_homes:mobile_home_id(model, manufacturer)
      `)
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !deliveryData) {
      console.error('Error fetching delivery:', deliveryError);
      throw new Error('Delivery not found');
    }

    // Get tracking session
    const { data: trackingData, error: trackingError } = await supabase
      .from('customer_tracking_sessions')
      .select('session_token, order_id')
      .eq('order_id', deliveryData.id) // This might need adjustment based on your schema
      .eq('active', true)
      .single();

    // If no tracking session exists, try to find by customer email
    let trackingToken = trackingData?.session_token;
    
    if (!trackingToken) {
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, customer_tracking_sessions!inner(session_token)')
        .eq('customer_email', deliveryData.customer_email)
        .eq('customer_tracking_sessions.active', true)
        .single();
      
      trackingToken = orderData?.customer_tracking_sessions?.[0]?.session_token;
    }

    if (!trackingToken) {
      throw new Error('No tracking token found for this delivery');
    }

    const baseUrl = `${Deno.env.get('SUPABASE_URL')?.replace('/v1', '')}/delivery-portal`;
    const trackingUrl = `${baseUrl}/${trackingToken}`;
    
    console.log('Generated tracking URL:', trackingUrl);

    const homeInfo = deliveryData.mobile_homes 
      ? `${deliveryData.mobile_homes.manufacturer} ${deliveryData.mobile_homes.model}`
      : 'Mobile Home';

    let emailSent = false;
    let smsSent = false;

    // Send Email
    if (notificationType === 'email' || notificationType === 'both') {
      console.log('Sending email to:', deliveryData.customer_email);
      
      const emailResponse = await resend.emails.send({
        from: "Delivery Updates <deliveries@resend.dev>",
        to: [deliveryData.customer_email],
        subject: `Your ${homeInfo} Delivery is Scheduled - Track Your Order`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Your Mobile Home Delivery</h1>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #333; margin-top: 0;">Delivery Details</h2>
              <p><strong>Delivery Number:</strong> ${deliveryData.delivery_number}</p>
              <p><strong>Customer:</strong> ${deliveryData.customer_name}</p>
              <p><strong>Mobile Home:</strong> ${homeInfo}</p>
              <p><strong>Delivery Address:</strong> ${deliveryData.delivery_address}</p>
              <p><strong>Status:</strong> ${deliveryData.status}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${trackingUrl}" 
                 style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Track Your Delivery
              </a>
            </div>

            <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                <strong>Track your delivery:</strong> Click the button above or visit: <br>
                <a href="${trackingUrl}" style="color: #007bff; word-break: break-all;">${trackingUrl}</a>
              </p>
            </div>

            <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
              If you have any questions, please contact our customer service team.
            </p>
          </div>
        `,
      });

      console.log('Email response:', emailResponse);
      emailSent = !emailResponse.error;
      
      if (emailResponse.error) {
        console.error('Email error:', emailResponse.error);
      }
    }

    // Send SMS
    if (notificationType === 'sms' || notificationType === 'both') {
      if (deliveryData.customer_phone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
        console.log('Sending SMS to:', deliveryData.customer_phone);
        
        const smsMessage = `Your ${homeInfo} delivery (${deliveryData.delivery_number}) is scheduled! Track your delivery: ${trackingUrl}`;
        
        const smsResponse = await sendSMS(deliveryData.customer_phone, smsMessage);
        console.log('SMS response:', smsResponse);
        
        smsSent = !smsResponse.error_code;
        
        if (smsResponse.error_code) {
          console.error('SMS error:', smsResponse);
        }
      } else {
        console.log('SMS not sent - missing phone number or Twilio config');
      }
    }

    const result = {
      success: true,
      deliveryNumber: deliveryData.delivery_number,
      trackingUrl,
      notifications: {
        email: emailSent,
        sms: smsSent,
      },
    };

    console.log('Notification result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-delivery-tracking function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);