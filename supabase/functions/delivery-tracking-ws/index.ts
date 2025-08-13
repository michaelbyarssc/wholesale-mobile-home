import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let deliveryId: string | null = null;
  let trackingInterval: number | null = null;
  let deliveryChannel: any = null;

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'start_tracking':
          if (message.deliveryId) {
            deliveryId = message.deliveryId;
            
            // Subscribe to real-time updates for this delivery
            deliveryChannel = supabase
              .channel('delivery-updates')
              .on(
                'postgres_changes',
                {
                  event: '*',
                  schema: 'public',
                  table: 'deliveries',
                  filter: `id=eq.${deliveryId}`
                },
                (payload) => {
                  socket.send(JSON.stringify({
                    type: 'delivery_update',
                    data: payload.new
                  }));
                }
              )
              .subscribe();

            // Get initial data with optimized queries
            const [deliveryResult, gpsResult] = await Promise.all([
              supabase
                .from('deliveries')
                .select('*, mobile_homes (display_name)')
                .eq('id', deliveryId)
                .maybeSingle(),
              supabase
                .from('delivery_gps_tracking')
                .select('latitude,longitude,speed_mph,heading,timestamp')
                .eq('delivery_id', deliveryId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .maybeSingle()
            ]);

            if (!deliveryResult.error) {
              socket.send(JSON.stringify({
                type: 'initial_data',
                data: {
                  ...deliveryResult.data,
                  current_location: gpsResult.data
                }
              }));
            }

            // Start periodic GPS tracking updates
            trackingInterval = setInterval(async () => {
              const { data: gpsData } = await supabase
                .from('delivery_gps_tracking')
                .select('latitude,longitude,speed_mph,heading,timestamp')
                .eq('delivery_id', deliveryId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (gpsData) {
                socket.send(JSON.stringify({
                  type: 'gps_update',
                  data: gpsData
                }));
              }
            }, 10000) as unknown as number;
          }
          break;

        case 'stop_tracking':
          if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
          }
          if (deliveryChannel) {
            await deliveryChannel.unsubscribe();
            deliveryChannel = null;
          }
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      socket.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  };

  socket.onclose = () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
    }
    if (deliveryChannel) {
      deliveryChannel.unsubscribe();
    }
  };

  return response;
});