import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  to: string;
  message: string;
  delivery_id?: string;
  notification_rule_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, delivery_id, notification_rule_id }: SMSRequest = await req.json();
    
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error("Twilio credentials not configured");
    }

    // Send SMS using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", twilioPhoneNumber);
    formData.append("Body", message);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text();
      throw new Error(`Twilio API error: ${errorData}`);
    }

    const twilioResult = await twilioResponse.json();
    console.log("SMS sent successfully:", twilioResult);

    // Update notification log if provided
    if (notification_rule_id) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      await supabase
        .from("notification_logs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", notification_rule_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_sid: twilioResult.sid,
        delivery_id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error sending SMS:", error);
    
    // Log the error in notification_logs if notification_rule_id provided
    if (req.body) {
      try {
        const body = await req.json();
        if (body.notification_rule_id) {
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );

          await supabase
            .from("notification_logs")
            .update({
              status: "failed",
              error_message: error.message,
              retry_count: 1,
            })
            .eq("id", body.notification_rule_id);
        }
      } catch (e) {
        console.error("Error updating notification log:", e);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);