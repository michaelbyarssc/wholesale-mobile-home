import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocuSignRequest {
  deliveryId: string;
  customerEmail: string;
  customerName: string;
  documentType: 'delivery_receipt' | 'service_agreement' | 'completion_form';
}

const generateDocumentHtml = (documentType: string, delivery: any) => {
  const currentDate = new Date().toLocaleDateString();
  
  switch (documentType) {
    case 'delivery_receipt':
      return `
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Mobile Home Delivery Receipt</h1>
          <hr>
          <p><strong>Delivery Number:</strong> ${delivery.delivery_number}</p>
          <p><strong>Customer:</strong> ${delivery.customer_name}</p>
          <p><strong>Delivery Address:</strong> ${delivery.delivery_address}</p>
          <p><strong>Mobile Home:</strong> ${delivery.mobile_homes?.manufacturer} ${delivery.mobile_homes?.model}</p>
          <p><strong>Date:</strong> ${currentDate}</p>
          <hr>
          <h3>Delivery Confirmation</h3>
          <p>I acknowledge that the mobile home described above has been delivered to the specified address in satisfactory condition.</p>
          <br><br>
          <p>Customer Signature: _________________________ Date: _________</p>
          <div style="margin-top: 50px;">
            <p><strong>Please sign below to confirm receipt of your mobile home delivery.</strong></p>
          </div>
        </body></html>
      `;
    case 'service_agreement':
      return `
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Mobile Home Delivery Service Agreement</h1>
          <hr>
          <p><strong>Service Agreement Number:</strong> ${delivery.delivery_number}</p>
          <p><strong>Customer:</strong> ${delivery.customer_name}</p>
          <p><strong>Service Date:</strong> ${currentDate}</p>
          <hr>
          <h3>Terms of Service</h3>
          <p>This agreement confirms the delivery services for your mobile home as outlined in your purchase agreement.</p>
          <ul>
            <li>Delivery will be completed within the agreed timeframe</li>
            <li>Customer must be present during delivery</li>
            <li>Final inspection will be conducted upon delivery</li>
            <li>Any damages must be reported immediately</li>
          </ul>
          <br><br>
          <p>Customer Agreement: _________________________ Date: _________</p>
          <div style="margin-top: 50px;">
            <p><strong>Please sign to acknowledge the terms of service.</strong></p>
          </div>
        </body></html>
      `;
    default:
      return `
        <html><body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Mobile Home Delivery Document</h1>
          <p>Delivery Number: ${delivery.delivery_number}</p>
          <p>Customer: ${delivery.customer_name}</p>
          <p>Date: ${currentDate}</p>
          <br><br>
          <p>Signature: _________________________ Date: _________</p>
        </body></html>
      `;
  }
};

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

const sendEnvelope = async (accessToken: string, delivery: any, documentType: string) => {
  const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
  
  if (!accountId) {
    throw new Error('Missing DocuSign Account ID');
  }

  const documentHtml = generateDocumentHtml(documentType, delivery);
  const documentBase64 = btoa(documentHtml);

  const envelope = {
    emailSubject: `Mobile Home Delivery Document - ${delivery.delivery_number}`,
    documents: [{
      documentBase64,
      name: `${documentType}_${delivery.delivery_number}.html`,
      fileExtension: 'html',
      documentId: '1'
    }],
    recipients: {
      signers: [{
        email: delivery.customer_email,
        name: delivery.customer_name,
        recipientId: '1',
        routingOrder: '1',
        tabs: {
          signHereTabs: [{
            documentId: '1',
            pageNumber: '1',
            xPosition: '400',
            yPosition: '400'
          }],
          dateSignedTabs: [{
            documentId: '1',
            pageNumber: '1',
            xPosition: '500',
            yPosition: '400'
          }]
        }
      }]
    },
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

    const { deliveryId, customerEmail, customerName, documentType }: DocuSignRequest = await req.json();

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

    // Send envelope
    const envelopeResult = await sendEnvelope(accessToken, delivery, documentType);

    // Log the document sending
    await supabaseClient.from('delivery_documents').insert({
      delivery_id: deliveryId,
      document_type: documentType,
      docusign_envelope_id: envelopeResult.envelopeId,
      recipient_email: customerEmail,
      status: 'sent',
      created_at: new Date().toISOString()
    });

    console.log('DocuSign envelope sent successfully:', envelopeResult.envelopeId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        envelopeId: envelopeResult.envelopeId,
        message: 'Document sent successfully for signing'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in docusign-send-envelope function:', error);
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