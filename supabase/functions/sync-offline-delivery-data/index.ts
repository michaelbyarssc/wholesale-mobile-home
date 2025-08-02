import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OfflineSyncRequest {
  deliveryId: string;
  driverId: string;
  gpsData?: Array<{
    latitude: number;
    longitude: number;
    accuracy: number;
    speed?: number;
    heading?: number;
    timestamp: string;
  }>;
  photos?: Array<{
    id: string;
    photoData: string;
    category: string;
    caption?: string;
    latitude?: number;
    longitude?: number;
    timestamp: string;
  }>;
  statusUpdates?: Array<{
    status: string;
    latitude?: number;
    longitude?: number;
    timestamp: string;
  }>;
  issues?: Array<{
    issueType: string;
    description: string;
    severity: string;
    latitude?: number;
    longitude?: number;
    timestamp: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      deliveryId, 
      driverId, 
      gpsData = [], 
      photos = [], 
      statusUpdates = [], 
      issues = [] 
    }: OfflineSyncRequest = await req.json();

    const syncResults = {
      gps: { success: 0, failed: 0, errors: [] as string[] },
      photos: { success: 0, failed: 0, errors: [] as string[] },
      statusUpdates: { success: 0, failed: 0, errors: [] as string[] },
      issues: { success: 0, failed: 0, errors: [] as string[] }
    };

    // Sync GPS data
    if (gpsData.length > 0) {
      console.log(`Syncing ${gpsData.length} GPS points for delivery ${deliveryId}`);
      
      for (const gps of gpsData) {
        try {
          const { error } = await supabase
            .from('delivery_gps_tracking')
            .insert({
              delivery_id: deliveryId,
              driver_id: driverId,
              latitude: gps.latitude,
              longitude: gps.longitude,
              accuracy_meters: gps.accuracy,
              speed_mph: gps.speed,
              heading: gps.heading,
              timestamp: gps.timestamp,
              meets_accuracy_requirement: gps.accuracy <= 50
            });

          if (error) {
            syncResults.gps.failed++;
            syncResults.gps.errors.push(`GPS sync error: ${error.message}`);
          } else {
            syncResults.gps.success++;
          }
        } catch (error: any) {
          syncResults.gps.failed++;
          syncResults.gps.errors.push(`GPS sync exception: ${error.message}`);
        }
      }
    }

    // Sync photos
    if (photos.length > 0) {
      console.log(`Syncing ${photos.length} photos for delivery ${deliveryId}`);
      
      for (const photo of photos) {
        try {
          // Upload photo via existing function
          const { data: photoResult, error: photoError } = await supabase.functions.invoke('upload-delivery-photo', {
            body: {
              deliveryId,
              driverId,
              photoType: photo.category,
              photoData: photo.photoData,
              caption: photo.caption,
              latitude: photo.latitude,
              longitude: photo.longitude
            }
          });

          if (photoError) {
            syncResults.photos.failed++;
            syncResults.photos.errors.push(`Photo sync error: ${photoError.message}`);
          } else {
            syncResults.photos.success++;
          }
        } catch (error: any) {
          syncResults.photos.failed++;
          syncResults.photos.errors.push(`Photo sync exception: ${error.message}`);
        }
      }
    }

    // Sync status updates
    if (statusUpdates.length > 0) {
      console.log(`Syncing ${statusUpdates.length} status updates for delivery ${deliveryId}`);
      
      for (const status of statusUpdates) {
        try {
          // Update delivery status
          const { error: deliveryError } = await supabase
            .from('deliveries')
            .update({ status: status.status })
            .eq('id', deliveryId);

          if (deliveryError) {
            syncResults.statusUpdates.failed++;
            syncResults.statusUpdates.errors.push(`Status update error: ${deliveryError.message}`);
            continue;
          }

          // Log status history
          const { error: historyError } = await supabase
            .from('delivery_status_history')
            .insert({
              delivery_id: deliveryId,
              new_status: status.status,
              changed_by: driverId,
              driver_id: driverId,
              location_lat: status.latitude,
              location_lng: status.longitude,
              notes: `Status synced from offline - ${status.status}`,
              created_at: status.timestamp
            });

          if (historyError) {
            syncResults.statusUpdates.failed++;
            syncResults.statusUpdates.errors.push(`Status history error: ${historyError.message}`);
          } else {
            syncResults.statusUpdates.success++;
          }
        } catch (error: any) {
          syncResults.statusUpdates.failed++;
          syncResults.statusUpdates.errors.push(`Status sync exception: ${error.message}`);
        }
      }
    }

    // Sync issues
    if (issues.length > 0) {
      console.log(`Syncing ${issues.length} issues for delivery ${deliveryId}`);
      
      for (const issue of issues) {
        try {
          const { error } = await supabase
            .from('delivery_issues')
            .insert({
              delivery_id: deliveryId,
              driver_id: driverId,
              issue_type: issue.issueType,
              description: issue.description,
              severity: issue.severity,
              location_lat: issue.latitude,
              location_lng: issue.longitude,
              reported_at: issue.timestamp,
              created_by: driverId
            });

          if (error) {
            syncResults.issues.failed++;
            syncResults.issues.errors.push(`Issue sync error: ${error.message}`);
          } else {
            syncResults.issues.success++;
          }
        } catch (error: any) {
          syncResults.issues.failed++;
          syncResults.issues.errors.push(`Issue sync exception: ${error.message}`);
        }
      }
    }

    // Calculate totals
    const totalSuccess = Object.values(syncResults).reduce((sum, result) => sum + result.success, 0);
    const totalFailed = Object.values(syncResults).reduce((sum, result) => sum + result.failed, 0);
    const allErrors = Object.values(syncResults).flatMap(result => result.errors);

    console.log(`Sync completed: ${totalSuccess} successful, ${totalFailed} failed`);

    // Update delivery sync status
    if (totalSuccess > 0) {
      await supabase
        .from('delivery_status_history')
        .insert({
          delivery_id: deliveryId,
          new_status: 'data_synced',
          changed_by: driverId,
          driver_id: driverId,
          notes: `Offline data synced: ${totalSuccess} items successful, ${totalFailed} failed`
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync completed: ${totalSuccess} successful, ${totalFailed} failed`,
        results: syncResults,
        summary: {
          totalSuccess,
          totalFailed,
          totalErrors: allErrors.length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in sync-offline-delivery-data function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
        message: 'Failed to sync offline data'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);