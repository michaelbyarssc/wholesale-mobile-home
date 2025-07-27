import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailNotificationRequest {
  recipient_id: string;
  subject: string;
  message: string;
  type: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient_id, subject, message, type }: EmailNotificationRequest = await req.json();

    console.log('📧 Processing email notification request:', { recipient_id, subject, type });

    // Get recipient's email from auth.users via profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', recipient_id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Error fetching recipient profile:', profileError);
      return new Response(JSON.stringify({ error: 'Recipient not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get business settings for sender info
    const { data: businessSettings } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['business_name', 'business_email']);

    const businessName = businessSettings?.find(s => s.setting_key === 'business_name')?.setting_value || 'Wholesale Mobile Home';
    const businessEmail = businessSettings?.find(s => s.setting_key === 'business_email')?.setting_value || 'noreply@invoice.wholesalemobilehome.com';

    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 20px; }
            .content { margin-bottom: 20px; }
            .footer { text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px; }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${businessName}</h1>
              <h2>${subject}</h2>
            </div>
            <div class="content">
              <p>Hello ${profile.first_name} ${profile.last_name},</p>
              <p>${message}</p>
              ${type === 'customer_activity' ? `
                <p>You can view more details in your admin dashboard:</p>
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://your-app-url'}/admin" class="button">View Admin Dashboard</a>
              ` : ''}
            </div>
            <div class="footer">
              <p>This notification was sent by ${businessName}</p>
              <p>You can manage your notification preferences in your admin settings.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: `${businessName} <${businessEmail}>`,
      to: [profile.email],
      subject: subject,
      html: htmlContent,
    });

    if (emailResponse.error) {
      console.error('❌ Error sending email:', emailResponse.error);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Email sent successfully:', emailResponse.data);

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Email notification sent successfully',
      email_id: emailResponse.data?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in send-email-notification function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});