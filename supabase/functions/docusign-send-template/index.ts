import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocuSignTemplateRequest {
  deliveryId: string;
  templateId: string;
  customerEmail: string;
  customerName: string;
  templateName: string;
}

const getAccessToken = async () => {
  const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
  const userId = Deno.env.get('DOCUSIGN_USER_ID');
  const privateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY');
  
  if (!integrationKey || !userId || !privateKey) {
    throw new Error('Missing DocuSign credentials');
  }

  // Clean up the private key
  const cleanPrivateKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, '-----BEGIN RSA PRIVATE KEY-----\n')
    .replace(/-----END RSA PRIVATE KEY-----/, '\n-----END RSA PRIVATE KEY-----');

  // Create JWT assertion
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: 'account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation'
  };

  // For demo purposes, we'll use a simplified approach
  // In production, you'd want to use a proper JWT library
  const jwtToken = btoa(JSON.stringify(header)) + '.' + btoa(JSON.stringify(payload));
  
  const response = await fetch('https://account-d.docusign.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwtToken}`,
  });

  if (!response.ok) {
    console.error('DocuSign auth failed:', await response.text());
    throw new Error('Failed to authenticate with DocuSign');
  }

  const authData = await response.json();
  return authData.access_token;
};

const sendEnvelopeFromTemplate = async (accessToken: string, delivery: any, templateId: string, templateName: string) => {
  const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
  
  if (!accountId) {
    throw new Error('Missing DocuSign Account ID');
  }

  const envelope = {
    emailSubject: `${templateName} - ${delivery.delivery_number}`,
    templateId: templateId,
    templateRoles: [{
      email: delivery.customer_email,
      name: delivery.customer_name,
      roleName: 'Customer', // This should match the role name in your template
      clientUserId: null, // For remote signing
      tabs: {
        textTabs: [
          {
            tabLabel: 'DeliveryNumber',
            value: delivery.delivery_number
          },
          {
            tabLabel: 'CustomerName',
            value: delivery.customer_name
          },
          {
            tabLabel: 'DeliveryAddress',
            value: delivery.delivery_address
          },
          {
            tabLabel: 'MobileHome',
            value: `${delivery.mobile_homes?.manufacturer || ''} ${delivery.mobile_homes?.model || ''}`.trim()
          },
          {
            tabLabel: 'DeliveryDate',
            value: delivery.scheduled_delivery_date 
              ? new Date(delivery.scheduled_delivery_date).toLocaleDateString()
              : new Date().toLocaleDateString()
          }
        ]
      }
    }],
    status: 'sent'
  };

  const response = await fetch(
    `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/envelopes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelope),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DocuSign envelope creation failed:', errorText);
    throw new Error(`Failed to send DocuSign envelope: ${errorText}`);
  }

  return await response.json();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { deliveryId, templateId, customerEmail, customerName, templateName }: DocuSignTemplateRequest = await req.json();

    // Fetch delivery details
    const { data: delivery, error: deliveryError } = await supabaseClient
      .from('deliveries')
      .select(`
        *,
        mobile_homes(manufacturer, model)
      `)
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      throw new Error('Delivery not found');
    }

    // Get DocuSign access token
    const accessToken = await getAccessToken();

    // Send envelope from template
    const envelopeResult = await sendEnvelopeFromTemplate(accessToken, delivery, templateId, templateName);

    // Log the document sending
    await supabaseClient.from('delivery_documents').insert({
      delivery_id: deliveryId,
      document_type: templateName,
      docusign_envelope_id: envelopeResult.envelopeId,
      recipient_email: customerEmail,
      status: 'sent',
      created_at: new Date().toISOString()
    });

    console.log('DocuSign envelope sent successfully from template:', envelopeResult.envelopeId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        envelopeId: envelopeResult.envelopeId,
        message: `${templateName} sent successfully for signing`,
        templateId: templateId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in docusign-send-template function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});