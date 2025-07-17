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

interface UpdateStatusRequest {
  deliveryId: string;
  newStatus: string;
  notes?: string;
  sendNotification?: boolean;
  latitude?: number;
  longitude?: number;
  updatedBy?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      deliveryId, 
      newStatus, 
      notes,
      sendNotification = true,
      latitude,
      longitude,
      updatedBy
    } = await req.json() as UpdateStatusRequest;

    if (!deliveryId || !newStatus) {
      return new Response(
        JSON.stringify({ error: 'deliveryId and newStatus are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get current status
    const { data: currentDelivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('status')
      .eq('id', deliveryId)
      .single();

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch delivery', details: fetchError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const previousStatus = currentDelivery.status;

    // Build update object based on the new status
    const updateObject: any = { status: newStatus };
    
    // Add timestamps based on status
    switch (newStatus) {
      case 'factory_pickup_in_progress':
        updateObject.actual_pickup_date = new Date().toISOString();
        break;
      case 'factory_pickup_completed':
        // No specific timestamp, just status
        break;
      case 'in_transit':
        // No specific timestamp, just status
        break;
      case 'delivery_in_progress':
        updateObject.actual_delivery_date = new Date().toISOString();
        break;
      case 'delivered':
        updateObject.completed_at = new Date().toISOString();
        break;
      case 'completed':
        updateObject.completed_at = new Date().toISOString();
        break;
    }

    // Update the delivery status
    const { data: updatedDelivery, error: updateError } = await supabase
      .from('deliveries')
      .update(updateObject)
      .eq('id', deliveryId)
      .select()
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update delivery status', details: updateError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create a status history entry
    const { data: historyEntry, error: historyError } = await supabase
      .from('delivery_status_history')
      .insert({
        delivery_id: deliveryId,
        previous_status: previousStatus,
        new_status: newStatus,
        notes: notes || `Status updated from ${previousStatus} to ${newStatus}`,
        changed_by: updatedBy
      })
      .select()
      .single();

    if (historyError) {
      console.error('Failed to create status history entry:', historyError);
      // Continue even if this fails, as the delivery status is already updated
    }

    // If GPS coordinates provided, log them
    if (latitude && longitude) {
      const { error: gpsError } = await supabase
        .from('delivery_gps_tracking')
        .insert({
          delivery_id: deliveryId,
          latitude,
          longitude,
          is_active: true,
          timestamp: new Date().toISOString()
        });

      if (gpsError) {
        console.error('Failed to log GPS coordinates:', gpsError);
        // Continue even if this fails
      }
    }

    // Send notification if requested
    if (sendNotification) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-delivery-tracking`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            deliveryId,
            notificationType: 'status_update',
            customMessage: notes
          })
        });
      } catch (notificationError) {
        console.error('Failed to send status update notification:', notificationError);
        // Continue even if notification fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        delivery: updatedDelivery,
        historyEntry,
        previousStatus,
        newStatus
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Error in update-delivery-status function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});