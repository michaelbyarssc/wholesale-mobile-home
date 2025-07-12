import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DocuSignEstimateRequest {
  estimateId: string;
  templateId?: string;
  templateName?: string;
  documentType?: 'estimate' | 'invoice';
}

const getAccessToken = async () => {
  const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
  const userId = Deno.env.get('DOCUSIGN_USER_ID');
  const privateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY');
  
  if (!integrationKey || !userId || !privateKey) {
    console.error('Missing DocuSign credentials:', { integrationKey: !!integrationKey, userId: !!userId, privateKey: !!privateKey });
    throw new Error('Missing DocuSign credentials');
  }

  console.log('Creating DocuSign JWT token...');

  // Clean up the private key
  const cleanPrivateKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, '-----BEGIN RSA PRIVATE KEY-----\n')
    .replace(/-----END RSA PRIVATE KEY-----/, '\n-----END RSA PRIVATE KEY-----');

  const now = Math.floor(Date.now() / 1000);
  
  try {
    // Import the private key for signing
    const keyData = await crypto.subtle.importKey(
      'pkcs8',
      new TextEncoder().encode(cleanPrivateKey),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    // Create JWT header and payload
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const payload = {
      iss: integrationKey,
      sub: userId,
      aud: 'account-d.docusign.com',
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation'
    };

    // Encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    
    // Sign the data
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      keyData,
      new TextEncoder().encode(dataToSign)
    );

    // Encode signature
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwtToken = `${dataToSign}.${encodedSignature}`;

    console.log('JWT token created, making auth request...');
    
    const response = await fetch('https://account-d.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwtToken}`,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DocuSign auth failed:', errorText);
      throw new Error(`Failed to authenticate with DocuSign: ${errorText}`);
    }

    const authData = await response.json();
    console.log('DocuSign authentication successful');
    return authData.access_token;
  } catch (error) {
    console.error('Error in DocuSign authentication:', error);
    throw new Error(`Failed to authenticate with DocuSign: ${error.message}`);
  }
};

const generateEstimateHtml = (estimate: any) => {
  const currentDate = new Date().toLocaleDateString();
  const estimateNumber = estimate.id.slice(-8).toUpperCase();
  
  return `
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
      <h1>Mobile Home Estimate</h1>
      <hr>
      <div style="margin-bottom: 20px;">
        <p><strong>Estimate Number:</strong> EST-${estimateNumber}</p>
        <p><strong>Date:</strong> ${currentDate}</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> ${estimate.customer_name}</p>
        <p><strong>Email:</strong> ${estimate.customer_email}</p>
        <p><strong>Phone:</strong> ${estimate.customer_phone}</p>
        ${estimate.delivery_address ? `<p><strong>Delivery Address:</strong> ${estimate.delivery_address}</p>` : ''}
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3>Mobile Home Details</h3>
        <p><strong>Manufacturer:</strong> ${estimate.mobile_homes?.manufacturer || 'N/A'}</p>
        <p><strong>Model:</strong> ${estimate.mobile_homes?.model || 'N/A'}</p>
        <p><strong>Series:</strong> ${estimate.mobile_homes?.series || 'N/A'}</p>
      </div>
      
      ${estimate.additional_requirements ? `
        <div style="margin-bottom: 20px;">
          <h3>Additional Requirements</h3>
          <p>${estimate.additional_requirements}</p>
        </div>
      ` : ''}
      
      <div style="margin-top: 30px; padding: 15px; background-color: #f0f0f0;">
        <h3>Total Estimate: $${estimate.total_amount.toLocaleString()}</h3>
      </div>
      
      <hr style="margin-top: 30px;">
      <div style="margin-top: 20px;">
        <p><strong>Please sign below to approve this estimate:</strong></p>
        <br><br>
        <p>Customer Signature: _________________________ Date: _________</p>
      </div>
    </body></html>
  `;
};

const generateInvoiceHtml = (invoice: any) => {
  const currentDate = new Date().toLocaleDateString();
  
  return `
    <html><body style="font-family: Arial, sans-serif; padding: 20px;">
      <h1>Invoice</h1>
      <hr>
      <div style="margin-bottom: 20px;">
        <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
        <p><strong>Date:</strong> ${currentDate}</p>
        ${invoice.due_date ? `<p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>` : ''}
      </div>
      
      <div style="margin-bottom: 20px;">
        <h3>Bill To</h3>
        <p><strong>Name:</strong> ${invoice.customer_name}</p>
        <p><strong>Email:</strong> ${invoice.customer_email}</p>
        <p><strong>Phone:</strong> ${invoice.customer_phone}</p>
        ${invoice.delivery_address ? `<p><strong>Delivery Address:</strong> ${invoice.delivery_address}</p>` : ''}
      </div>
      
      <div style="margin-top: 30px; padding: 15px; background-color: #f0f0f0;">
        <h3>Total Amount: $${invoice.total_amount.toLocaleString()}</h3>
        <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
      </div>
      
      <hr style="margin-top: 30px;">
      <div style="margin-top: 20px;">
        <p><strong>Please sign to acknowledge receipt of this invoice:</strong></p>
        <br><br>
        <p>Customer Signature: _________________________ Date: _________</p>
      </div>
    </body></html>
  `;
};

const sendEnvelopeFromTemplate = async (accessToken: string, data: any, templateId: string, templateName: string, documentType: string) => {
  const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
  
  if (!accountId) {
    throw new Error('Missing DocuSign Account ID');
  }

  const envelope = {
    emailSubject: `${templateName} - ${documentType === 'estimate' ? `EST-${data.id.slice(-8).toUpperCase()}` : data.invoice_number || data.id}`,
    templateId: templateId,
    templateRoles: [{
      email: data.customer_email,
      name: data.customer_name,
      roleName: 'Customer',
      clientUserId: null,
      tabs: {
        textTabs: [
          {
            tabLabel: 'CustomerName',
            value: data.customer_name
          },
          {
            tabLabel: 'CustomerEmail',
            value: data.customer_email
          },
          {
            tabLabel: 'CustomerPhone',
            value: data.customer_phone
          },
          {
            tabLabel: 'DeliveryAddress',
            value: data.delivery_address || ''
          },
          {
            tabLabel: 'TotalAmount',
            value: `$${data.total_amount.toLocaleString()}`
          },
          {
            tabLabel: 'DocumentNumber',
            value: documentType === 'estimate' 
              ? `EST-${data.id.slice(-8).toUpperCase()}`
              : data.invoice_number || data.id
          },
          {
            tabLabel: 'Date',
            value: new Date().toLocaleDateString()
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

const sendCustomDocument = async (accessToken: string, data: any, documentType: 'estimate' | 'invoice') => {
  const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
  
  if (!accountId) {
    throw new Error('Missing DocuSign Account ID');
  }

  const documentHtml = documentType === 'estimate' 
    ? generateEstimateHtml(data)
    : generateInvoiceHtml(data);
  
  const documentBase64 = btoa(documentHtml);
  const documentNumber = documentType === 'estimate' 
    ? `EST-${data.id.slice(-8).toUpperCase()}`
    : data.invoice_number || data.id;

  const envelope = {
    emailSubject: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} - ${documentNumber}`,
    documents: [{
      documentBase64,
      name: `${documentType}_${documentNumber}.html`,
      fileExtension: 'html',
      documentId: '1'
    }],
    recipients: {
      signers: [{
        email: data.customer_email,
        name: data.customer_name,
        recipientId: '1',
        routingOrder: '1',
        tabs: {
          signHereTabs: [{
            documentId: '1',
            pageNumber: '1',
            xPosition: '400',
            yPosition: '500'
          }],
          dateSignedTabs: [{
            documentId: '1',
            pageNumber: '1',
            xPosition: '500',
            yPosition: '500'
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { estimateId, templateId, templateName, documentType = 'estimate' }: DocuSignEstimateRequest = await req.json();

    // Fetch estimate details
    console.log('Fetching estimate with ID:', estimateId);
    const { data: estimate, error: estimateError } = await supabaseClient
      .from('estimates')
      .select(`
        *,
        mobile_homes(manufacturer, series, model)
      `)
      .eq('id', estimateId)
      .maybeSingle();

    console.log('Estimate query result:', { estimate, estimateError });

    if (estimateError) {
      console.error('Error fetching estimate:', estimateError);
      throw new Error(`Database error: ${estimateError.message}`);
    }

    if (!estimate) {
      console.error('Estimate not found for ID:', estimateId);
      
      // Try without the join to see if it's a join issue
      const { data: simpleEstimate, error: simpleError } = await supabaseClient
        .from('estimates')
        .select('*')
        .eq('id', estimateId)
        .maybeSingle();
      
      console.log('Simple estimate query result:', { simpleEstimate, simpleError });
      throw new Error('Estimate not found');
    }

    // If it's an invoice, also get invoice details
    let invoiceData = null;
    if (documentType === 'invoice' && estimate.invoice_id) {
      const { data: invoice, error: invoiceError } = await supabaseClient
        .from('invoices')
        .select('*')
        .eq('id', estimate.invoice_id)
        .single();
      
      if (invoice && !invoiceError) {
        invoiceData = invoice;
      }
    }

    const dataToUse = documentType === 'invoice' && invoiceData ? invoiceData : estimate;

    // Get DocuSign access token
    const accessToken = await getAccessToken();

    // Send envelope
    let envelopeResult;
    if (templateId && templateName) {
      envelopeResult = await sendEnvelopeFromTemplate(accessToken, dataToUse, templateId, templateName, documentType);
    } else {
      envelopeResult = await sendCustomDocument(accessToken, dataToUse, documentType);
    }

    // Log the document sending - create a simple log table entry
    const logEntry = {
      estimate_id: estimateId,
      document_type: documentType,
      docusign_envelope_id: envelopeResult.envelopeId,
      recipient_email: estimate.customer_email,
      status: 'sent',
      template_id: templateId || null,
      template_name: templateName || null,
      created_at: new Date().toISOString()
    };

    // Insert into a generic documents table or create a specific one for estimates/invoices
    await supabaseClient.from('estimate_documents').insert(logEntry);

    console.log(`DocuSign ${documentType} sent successfully:`, envelopeResult.envelopeId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        envelopeId: envelopeResult.envelopeId,
        message: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} sent successfully for signing`,
        documentType
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in docusign-send-estimate function:', error);
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