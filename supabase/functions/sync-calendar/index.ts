import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { google } from "npm:googleapis@126";

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Calendar API credentials
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const REDIRECT_URI = `${supabaseUrl}/functions/v1/sync-calendar/callback`;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a new OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

interface CalendarSyncRequest {
  action: 'auth' | 'add_delivery' | 'update_delivery' | 'remove_delivery';
  deliveryId?: string;
  calendarId?: string;
  tokens?: {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
  };
  userId?: string;
}

// Function to create or update a calendar event for a delivery
async function syncDeliveryToCalendar(deliveryId: string, calendarId: string, tokens: any) {
  // Set the tokens to the OAuth client
  oauth2Client.setCredentials(tokens);

  // Create a Google Calendar API instance
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Get the delivery details
  const { data: delivery, error: deliveryError } = await supabase
    .from('deliveries')
    .select(`
      *,
      mobile_homes(display_name)
    `)
    .eq('id', deliveryId)
    .single();

  if (deliveryError) {
    throw new Error(`Error fetching delivery: ${deliveryError.message}`);
  }

  // Check if an event already exists for this delivery
  const { data: existingEvents, error: eventsError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('delivery_id', deliveryId)
    .eq('calendar_integration_id', calendarId);

  if (eventsError) {
    throw new Error(`Error checking existing events: ${eventsError.message}`);
  }

  // Prepare the event data
  const homeName = delivery.mobile_homes?.display_name || 'Mobile Home Delivery';
  const eventSummary = `Delivery: ${delivery.delivery_number} - ${homeName}`;
  const pickupDate = delivery.scheduled_pickup_date ? new Date(delivery.scheduled_pickup_date) : null;
  const deliveryDate = delivery.scheduled_delivery_date ? new Date(delivery.scheduled_delivery_date) : new Date();
  
  let eventData = {
    summary: eventSummary,
    location: delivery.delivery_address,
    description: `
      Delivery Number: ${delivery.delivery_number}
      Customer: ${delivery.customer_name}
      Phone: ${delivery.customer_phone}
      Email: ${delivery.customer_email}
      Status: ${delivery.status}
      Pickup Address: ${delivery.pickup_address}
      Delivery Address: ${delivery.delivery_address}
    `,
    start: {
      dateTime: deliveryDate.toISOString(),
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: new Date(deliveryDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours after start
      timeZone: 'America/New_York',
    },
    colorId: '5', // A color to indicate this is a delivery event
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 * 24 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
  };

  let calendarResult;
  let externalEventId;

  if (existingEvents && existingEvents.length > 0) {
    // Update existing event
    externalEventId = existingEvents[0].external_event_id;
    calendarResult = await calendar.events.update({
      calendarId: 'primary',
      eventId: externalEventId,
      requestBody: eventData,
    });
  } else {
    // Create new event
    calendarResult = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventData,
    });
    externalEventId = calendarResult.data.id;

    // Store the event mapping
    await supabase
      .from('calendar_events')
      .insert({
        calendar_integration_id: calendarId,
        delivery_id: deliveryId,
        external_event_id: externalEventId,
        event_type: 'delivery',
        sync_status: 'synced'
      });
  }

  // If there's a pickup date, also create a pickup event
  if (pickupDate && (!existingEvents || existingEvents.filter(e => e.event_type === 'pickup').length === 0)) {
    const pickupEventData = {
      ...eventData,
      summary: `Pickup: ${delivery.delivery_number} - ${homeName}`,
      location: delivery.pickup_address,
      start: {
        dateTime: pickupDate.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(pickupDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours after start
        timeZone: 'America/New_York',
      },
      colorId: '9', // Different color for pickup events
    };

    const pickupResult = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: pickupEventData,
    });

    // Store the pickup event mapping
    await supabase
      .from('calendar_events')
      .insert({
        calendar_integration_id: calendarId,
        delivery_id: deliveryId,
        external_event_id: pickupResult.data.id,
        event_type: 'pickup',
        sync_status: 'synced'
      });
  }

  return {
    success: true,
    deliveryEvent: externalEventId,
  };
}

// Function to remove a calendar event
async function removeDeliveryFromCalendar(deliveryId: string, calendarId: string, tokens: any) {
  // Set the tokens to the OAuth client
  oauth2Client.setCredentials(tokens);

  // Create a Google Calendar API instance
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  // Get the events for this delivery
  const { data: events, error: eventsError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('delivery_id', deliveryId)
    .eq('calendar_integration_id', calendarId);

  if (eventsError) {
    throw new Error(`Error fetching calendar events: ${eventsError.message}`);
  }

  if (!events || events.length === 0) {
    return { success: true, message: 'No events found to remove' };
  }

  // Delete each event from Google Calendar
  for (const event of events) {
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: event.external_event_id,
      });
    } catch (error) {
      console.error(`Failed to delete event ${event.external_event_id}:`, error);
      // Continue with other events even if one fails
    }
  }

  // Delete the event mappings from our database
  const { error: deleteError } = await supabase
    .from('calendar_events')
    .delete()
    .in('id', events.map(e => e.id));

  if (deleteError) {
    throw new Error(`Error deleting event mappings: ${deleteError.message}`);
  }

  return { success: true };
}

// Function to get the authorization URL
function getAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Always prompt for consent to ensure we get a refresh token
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle OAuth callback
  const url = new URL(req.url);
  if (url.pathname.endsWith('/callback')) {
    const code = url.searchParams.get('code');
    const userId = url.searchParams.get('state'); // Using state parameter to pass userId

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'No authorization code provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    try {
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      // Store the tokens in the database
      const { data: integrationData, error: integrationError } = await supabase
        .from('calendar_integrations')
        .upsert({
          user_id: userId,
          calendar_type: 'google',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          calendar_id: 'primary', // Default to primary calendar
          sync_enabled: true,
          last_sync: new Date().toISOString()
        })
        .select()
        .single();

      if (integrationError) {
        return new Response(
          JSON.stringify({ error: 'Failed to store calendar integration', details: integrationError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Redirect to a success page
      return new Response(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Calendar Integration Successful</title>
            <script>
              window.onload = function() {
                window.opener.postMessage({ type: 'calendar_auth_success', integration: ${JSON.stringify(integrationData)} }, '*');
                window.close();
              }
            </script>
          </head>
          <body>
            <h1>Calendar Integration Successful!</h1>
            <p>You can close this window and return to the application.</p>
          </body>
        </html>
        `,
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'text/html',
            ...corsHeaders 
          } 
        }
      );
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to authenticate with Google Calendar', details: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
  }

  // Handle API requests
  try {
    const { 
      action, 
      deliveryId, 
      calendarId,
      tokens,
      userId
    } = await req.json() as CalendarSyncRequest;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'action is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    switch (action) {
      case 'auth':
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required for auth action' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        const authUrl = getAuthUrl();
        return new Response(
          JSON.stringify({ authUrl, state: userId }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );

      case 'add_delivery':
      case 'update_delivery':
        if (!deliveryId || !calendarId || !tokens) {
          return new Response(
            JSON.stringify({ error: 'deliveryId, calendarId, and tokens are required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        const syncResult = await syncDeliveryToCalendar(deliveryId, calendarId, tokens);
        return new Response(
          JSON.stringify(syncResult),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );

      case 'remove_delivery':
        if (!deliveryId || !calendarId || !tokens) {
          return new Response(
            JSON.stringify({ error: 'deliveryId, calendarId, and tokens are required' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        const removeResult = await removeDeliveryFromCalendar(deliveryId, calendarId, tokens);
        return new Response(
          JSON.stringify(removeResult),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
    }
  } catch (error) {
    console.error('Error in sync-calendar function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});