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

interface UploadPhotoRequest {
  deliveryId: string;
  driverId?: string;
  photoType: 'pre_delivery' | 'post_delivery' | 'damage' | 'documentation' | 'signature';
  photoData: string; // Base64 encoded image
  caption?: string;
  latitude?: number;
  longitude?: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      deliveryId, 
      driverId, 
      photoType, 
      photoData,
      caption,
      latitude,
      longitude
    } = await req.json() as UploadPhotoRequest;

    if (!deliveryId || !photoType || !photoData) {
      return new Response(
        JSON.stringify({ error: 'deliveryId, photoType, and photoData are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate the delivery exists
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('id')
      .eq('id', deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return new Response(
        JSON.stringify({ error: 'Delivery not found', details: deliveryError?.message }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Process the base64 image data
    const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const filename = `${deliveryId}/${photoType}_${timestamp}.jpg`;
    
    // Upload to Supabase Storage
    const { data: fileData, error: uploadError } = await supabase
      .storage
      .from('delivery-photos')
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: 'Failed to upload photo', details: uploadError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from('delivery-photos')
      .getPublicUrl(filename);

    // Create a record in the delivery_photos table
    const { data: photoRecord, error: recordError } = await supabase
      .from('delivery_photos')
      .insert({
        delivery_id: deliveryId,
        driver_id: driverId,
        photo_type: photoType,
        photo_url: publicUrl,
        caption: caption,
        latitude: latitude,
        longitude: longitude,
        taken_at: new Date().toISOString()
      })
      .select()
      .single();

    if (recordError) {
      // If we fail to create the record, try to delete the uploaded file
      await supabase
        .storage
        .from('delivery-photos')
        .remove([filename]);

      return new Response(
        JSON.stringify({ error: 'Failed to create photo record', details: recordError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // If it's a signature photo, update the delivery record
    if (photoType === 'signature') {
      const { error: updateError } = await supabase
        .from('deliveries')
        .update({ 
          customer_signature_url: publicUrl,
          status: 'delivered', // Update status to delivered when signature is captured
          actual_delivery_date: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (updateError) {
        console.error('Failed to update delivery with signature:', updateError);
        // Continue even if this fails, as the photo is already saved
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        photo: photoRecord,
        url: publicUrl
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Error in upload-delivery-photo function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});