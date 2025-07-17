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

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'start_tracking':
          if (message.deliveryId) {
            deliveryId = message.deliveryId;
            
            // Subscribe to real-time updates for this delivery
            const deliveryChannel = supabase
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

            // Start periodic GPS tracking updates
            trackingInterval = setInterval(async () => {
              const { data: gpsData, error: gpsError } = await supabase
                .from('delivery_gps_tracking')
                .select('*')
                .eq('delivery_id', deliveryId)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

              if (!gpsError && gpsData) {
                socket.send(JSON.stringify({
                  type: 'gps_update',
                  data: gpsData
                }));
              }
            }, 10000) as unknown as number;

            // Send initial data
            const { data: delivery, error: deliveryError } = await supabase
              .from('deliveries')
               .select(`
                 *,
                 mobile_homes (
                   display_name
                 ),
                 delivery_gps_tracking (
                   latitude,
                   longitude,
                   speed_mph,
                   heading,
                   timestamp
                 )
               `)
               .eq('id', deliveryId)
               .maybeSingle();

            if (!deliveryError) {
              socket.send(JSON.stringify({
                type: 'initial_data',
                data: delivery
              }));
            }
          }
          break;

        case 'stop_tracking':
          if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
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
  };

  return response;
});