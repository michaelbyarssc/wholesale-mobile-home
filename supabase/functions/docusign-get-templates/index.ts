import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

const fetchTemplates = async (accessToken: string) => {
  const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
  
  if (!accountId) {
    throw new Error('Missing DocuSign Account ID');
  }

  const response = await fetch(
    `https://demo.docusign.net/restapi/v2.1/accounts/${accountId}/templates?count=100`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('DocuSign templates fetch failed:', errorText);
    throw new Error(`Failed to fetch DocuSign templates: ${errorText}`);
  }

  const data = await response.json();
  return data.envelopeTemplates || [];
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

    // Get DocuSign access token
    const accessToken = await getAccessToken();

    // Fetch templates
    const templates = await fetchTemplates(accessToken);

    console.log(`Found ${templates.length} DocuSign templates`);

    // Filter and format templates for easier use
    const formattedTemplates = templates
      .filter((template: any) => template.name && template.templateId)
      .map((template: any) => ({
        id: template.templateId,
        name: template.name,
        description: template.description || '',
        created: template.created,
        lastModified: template.lastModified,
        shared: template.shared === 'true',
        uri: template.uri
      }));

    return new Response(
      JSON.stringify({ 
        success: true, 
        templates: formattedTemplates,
        count: formattedTemplates.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in docusign-get-templates function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        templates: []
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});