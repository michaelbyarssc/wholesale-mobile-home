import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CaptureSignatureRequest {
  deliveryId: string;
  signatureData: string; // Base64 encoded signature image
  notes?: string;
  completionNotes?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      deliveryId, 
      signatureData,
      notes,
      completionNotes
    } = await req.json() as CaptureSignatureRequest;

    if (!deliveryId || !signatureData) {
      return new Response(
        JSON.stringify({ error: 'deliveryId and signatureData are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Process the base64 signature data
    const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const filename = `signatures/${deliveryId}_${timestamp}.png`;
    
    // Upload to Supabase Storage
    const { data: fileData, error: uploadError } = await supabase
      .storage
      .from('delivery-documents')
      .upload(filename, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload signature', details: uploadError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get the public URL for the uploaded signature
    const { data: { publicUrl } } = supabase
      .storage
      .from('delivery-documents')
      .getPublicUrl(filename);

    // Update delivery record with signature and complete the delivery
    const { data: updatedDelivery, error: updateError } = await supabase
      .from('deliveries')
      .update({
        status: 'delivered',
        customer_signature_url: publicUrl,
        actual_delivery_date: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        completion_notes: completionNotes || notes || 'Delivery completed and signed by customer.'
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateError) {
      // If we fail to update the delivery, try to delete the uploaded signature
      await supabase
        .storage
        .from('delivery-documents')
        .remove([filename]);

      return new Response(
        JSON.stringify({ error: 'Failed to update delivery with signature', details: updateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create a status history entry
    const { error: historyError } = await supabase
      .from('delivery_status_history')
      .insert({
        delivery_id: deliveryId,
        previous_status: 'delivery_in_progress',
        new_status: 'delivered',
        notes: notes || 'Delivery completed and signed by customer.'
      });

    if (historyError) {
      console.error('Failed to create status history entry:', historyError);
      // Continue even if this fails, as the delivery is already updated
    }

    // Try to send a delivery completion notification
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-delivery-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          deliveryId,
          notificationType: 'delivery_complete',
          customMessage: 'Your signature has been captured and your delivery is now complete.'
        })
      });
    } catch (notificationError) {
      console.error('Failed to send delivery completion notification:', notificationError);
      // Continue even if notification fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        delivery: updatedDelivery,
        signatureUrl: publicUrl
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Error in capture-signature function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});