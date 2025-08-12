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

  // Initialize Supabase clients and authenticate the caller (JWT enforced at gateway)
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const authHeader = headers.get('authorization') || headers.get('Authorization') || '';
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let authedUserId: string | null = null;
  let isAdminUser = false;
  try {
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      socket.close(1008, 'Unauthorized');
    } else {
      authedUserId = user.id;
      const [{ data: hasAdmin }, { data: hasSuper }] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'super_admin' }),
      ]);
      isAdminUser = Boolean(hasAdmin) || Boolean(hasSuper);
    }
  } catch (e) {
    console.error('Auth error:', e);
    socket.close(1008, 'Unauthorized');
  }

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

            // Authorization: only admins or assigned drivers can track this delivery
            if (!authedUserId) {
              socket.send(JSON.stringify({ type: 'error', error: 'Unauthorized' }));
              break;
            }

            const { data: isDriver } = await supabase.rpc('is_driver_for_delivery', {
              _user_id: authedUserId,
              _delivery_id: deliveryId
            });

            if (!isAdminUser && !isDriver) {
              socket.send(JSON.stringify({ type: 'error', error: 'Forbidden' }));
              break;
            }
            
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