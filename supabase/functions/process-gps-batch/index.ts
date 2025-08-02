// Enhanced Edge Function for GPS batch processing
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GPSPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  batteryLevel?: number;
}

interface GPSBatch {
  points: GPSPoint[];
  deliveryId: string;
  driverId: string;
  batchStartTime: string;
  batchEndTime: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const batch: GPSBatch = await req.json();
    
    console.log(`Processing GPS batch: ${batch.points.length} points for delivery ${batch.deliveryId}`);

    // Validate batch data
    if (!batch.points || !Array.isArray(batch.points) || batch.points.length === 0) {
      throw new Error("Invalid batch data");
    }

    let insertedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process points in smaller chunks for better performance
    const chunkSize = 25;
    for (let i = 0; i < batch.points.length; i += chunkSize) {
      const chunk = batch.points.slice(i, i + chunkSize);
      
      try {
        const { error } = await supabase
          .from('delivery_gps_tracking')
          .insert(
            chunk.map(point => ({
              delivery_id: batch.deliveryId,
              driver_id: batch.driverId,
              latitude: point.latitude,
              longitude: point.longitude,
              accuracy_meters: point.accuracy,
              speed_mph: point.speed,
              heading: point.heading,
              battery_level: point.batteryLevel,
              timestamp: point.timestamp,
              meets_accuracy_requirement: point.accuracy <= 50,
              is_active: true
            }))
          );

        if (error) {
          console.error(`Chunk insert error:`, error);
          errorCount += chunk.length;
          errors.push(error.message);
        } else {
          insertedCount += chunk.length;
        }
      } catch (chunkError) {
        console.error(`Chunk processing error:`, chunkError);
        errorCount += chunk.length;
        errors.push(chunkError.message);
      }
    }

    // Update delivery status to indicate active tracking
    if (insertedCount > 0) {
      await supabase
        .from('deliveries')
        .update({ 
          updated_at: new Date().toISOString(),
          last_gps_update: batch.batchEndTime
        })
        .eq('id', batch.deliveryId);
    }

    const result = {
      success: true,
      inserted_count: insertedCount,
      error_count: errorCount,
      batch_size: batch.points.length,
      processing_rate: Math.round((insertedCount / batch.points.length) * 100),
      errors: errors.length > 0 ? errors.slice(0, 3) : undefined, // Limit error messages
      processed_at: new Date().toISOString()
    };

    console.log(`Batch processing complete:`, result);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("GPS batch processing error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);