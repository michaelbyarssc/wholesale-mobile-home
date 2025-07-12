import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('DocuSign webhook received');

    // Parse the webhook payload
    const webhookData = await req.json();
    console.log('Webhook data:', JSON.stringify(webhookData, null, 2));

    // DocuSign sends envelope status information
    const { envelopeId, status, envelopeSummary } = webhookData.data || {};
    
    if (!envelopeId) {
      console.error('No envelope ID found in webhook');
      return new Response('No envelope ID', { status: 400, headers: corsHeaders });
    }

    console.log(`Envelope ${envelopeId} status: ${status}`);

    // Only process completed documents
    if (status === 'completed') {
      console.log('Processing completed envelope:', envelopeId);

      // Find the estimate document by DocuSign envelope ID
      const { data: estimateDoc, error: docError } = await supabase
        .from('estimate_documents')
        .select('estimate_id')
        .eq('docusign_envelope_id', envelopeId)
        .single();

      if (docError) {
        console.error('Error finding estimate document:', docError);
        return new Response('Document not found', { status: 404, headers: corsHeaders });
      }

      if (!estimateDoc) {
        console.error('No estimate document found for envelope:', envelopeId);
        return new Response('Document not found', { status: 404, headers: corsHeaders });
      }

      console.log('Found estimate:', estimateDoc.estimate_id);

      // Update the estimate document status
      const { error: updateDocError } = await supabase
        .from('estimate_documents')
        .update({ 
          status: 'completed',
          signed_at: new Date().toISOString()
        })
        .eq('docusign_envelope_id', envelopeId);

      if (updateDocError) {
        console.error('Error updating document status:', updateDocError);
      }

      // Call the approve_estimate function to convert estimate to invoice
      console.log('Calling approve_estimate function for:', estimateDoc.estimate_id);
      
      const { data: invoiceId, error: approvalError } = await supabase
        .rpc('approve_estimate', { estimate_uuid: estimateDoc.estimate_id });

      if (approvalError) {
        console.error('Error approving estimate:', approvalError);
        return new Response(JSON.stringify({ error: 'Failed to approve estimate', details: approvalError }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('Successfully approved estimate and created invoice:', invoiceId);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Estimate approved and invoice created',
        invoiceId 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For other statuses, just acknowledge receipt
    console.log('Received webhook for status:', status, '- no action needed');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Webhook received',
      status 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});