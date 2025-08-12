import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Initialize Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: delivery, error: deliveryError } = await supabaseAdmin
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

    // Authenticate caller and authorize action
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if user is admin or assigned driver for this delivery
    const [{ data: isAdmin }, { data: isSuperAdmin }] = await Promise.all([
      supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
      supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'super_admin' }),
    ]);

    const { data: isDriverForDelivery } = await supabaseAdmin.rpc('is_driver_for_delivery', {
      _user_id: user.id,
      _delivery_id: deliveryId,
    });

    const isAuthorized = Boolean(isAdmin) || Boolean(isSuperAdmin) || Boolean(isDriverForDelivery);
    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Resolve driver id if not provided
    let driverIdToUse = driverId;
    if (!driverIdToUse) {
      const { data: resolvedDriverId } = await supabaseAdmin.rpc('get_driver_id_for_user', {
        _user_id: user.id,
      });
      if (resolvedDriverId) driverIdToUse = resolvedDriverId as string;
    }

    // Process the base64 image data
    const base64Data = photoData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Generate a unique filename
    const timestamp = new Date().getTime();
    const filename = `${deliveryId}/${photoType}_${timestamp}.jpg`;
    
    // Upload to Supabase Storage
    const { data: fileData, error: uploadError } = await supabaseAdmin
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
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('delivery-photos')
      .getPublicUrl(filename);

    // Create a record in the delivery_photos table
    const { data: photoRecord, error: recordError } = await supabaseAdmin
      .from('delivery_photos')
      .insert({
        delivery_id: deliveryId,
        driver_id: driverIdToUse,
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
      await supabaseAdmin
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
      const { error: updateError } = await supabaseAdmin
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