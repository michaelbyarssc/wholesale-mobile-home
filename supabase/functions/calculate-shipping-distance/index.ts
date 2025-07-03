import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DistanceCalculationRequest {
  mobileHomeId: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface GoogleMapsDistanceResponse {
  destination_addresses: string[];
  origin_addresses: string[];
  rows: Array<{
    elements: Array<{
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      status: string;
    }>;
  }>;
  status: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting shipping distance calculation...');
    
    const { mobileHomeId, deliveryAddress }: DistanceCalculationRequest = await req.json();
    
    if (!mobileHomeId || !deliveryAddress) {
      throw new Error('Missing required parameters: mobileHomeId and deliveryAddress');
    }

    console.log(`Calculating distance for mobile home: ${mobileHomeId}`);
    console.log(`Delivery address: ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}`);

    // Get the factory assigned to this mobile home
    const { data: factoryAssignment, error: assignmentError } = await supabase
      .from('mobile_home_factories')
      .select(`
        *,
        factories (*)
      `)
      .eq('mobile_home_id', mobileHomeId)
      .single();

    if (assignmentError || !factoryAssignment) {
      console.error('Factory assignment error:', assignmentError);
      throw new Error('No factory assigned to this mobile home');
    }

    const factory = factoryAssignment.factories as any;
    console.log(`Factory found: ${factory.name} in ${factory.city}, ${factory.state}`);

    // Check if we already have a cached calculation for this route
    const { data: existingCalculation } = await supabase
      .from('shipping_calculations')
      .select('*')
      .eq('factory_id', factory.id)
      .eq('delivery_state', deliveryAddress.state.toUpperCase())
      .eq('delivery_city', deliveryAddress.city.toLowerCase())
      .eq('delivery_zip', deliveryAddress.zipCode)
      .single();

    if (existingCalculation) {
      console.log('Using cached distance calculation');
      return new Response(JSON.stringify({
        success: true,
        cached: true,
        distance_miles: existingCalculation.distance_miles,
        travel_time_minutes: existingCalculation.estimated_travel_time_minutes,
        factory: {
          id: factory.id,
          name: factory.name,
          address: `${factory.street_address}, ${factory.city}, ${factory.state} ${factory.zip_code}`
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare addresses for Google Maps API
    const factoryAddress = `${factory.street_address}, ${factory.city}, ${factory.state} ${factory.zip_code}`;
    const customerAddress = `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}`;

    console.log(`Calculating distance from: ${factoryAddress}`);
    console.log(`To: ${customerAddress}`);

    // Call Google Maps Distance Matrix API
    const googleMapsUrl = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    googleMapsUrl.searchParams.set('origins', factoryAddress);
    googleMapsUrl.searchParams.set('destinations', customerAddress);
    googleMapsUrl.searchParams.set('units', 'imperial');
    googleMapsUrl.searchParams.set('mode', 'driving');
    googleMapsUrl.searchParams.set('avoid', 'tolls'); // Avoid tolls for cost efficiency
    googleMapsUrl.searchParams.set('key', googleMapsApiKey);

    console.log('Calling Google Maps Distance Matrix API...');
    
    const response = await fetch(googleMapsUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status} ${response.statusText}`);
    }

    const data: GoogleMapsDistanceResponse = await response.json();
    
    console.log('Google Maps API response status:', data.status);

    if (data.status !== 'OK') {
      throw new Error(`Google Maps API returned status: ${data.status}`);
    }

    const element = data.rows[0]?.elements[0];
    
    if (!element || element.status !== 'OK') {
      throw new Error(`Route calculation failed: ${element?.status || 'Unknown error'}`);
    }

    // Convert distance from meters to miles (Google returns meters)
    const distanceMiles = Math.round((element.distance.value * 0.000621371) * 100) / 100;
    const travelTimeMinutes = Math.round(element.duration.value / 60);

    console.log(`Distance calculated: ${distanceMiles} miles, ${travelTimeMinutes} minutes`);

    // Cache the calculation result
    const { error: insertError } = await supabase
      .from('shipping_calculations')
      .insert({
        factory_id: factory.id,
        delivery_state: deliveryAddress.state.toUpperCase(),
        delivery_city: deliveryAddress.city.toLowerCase(),
        delivery_zip: deliveryAddress.zipCode,
        distance_miles: distanceMiles,
        estimated_travel_time_minutes: travelTimeMinutes,
        google_maps_response: data
      });

    if (insertError) {
      console.error('Error caching calculation:', insertError);
      // Don't throw here, we can still return the result
    } else {
      console.log('Distance calculation cached successfully');
    }

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      distance_miles: distanceMiles,
      travel_time_minutes: travelTimeMinutes,
      factory: {
        id: factory.id,
        name: factory.name,
        address: factoryAddress
      },
      google_maps_data: {
        origin: data.origin_addresses[0],
        destination: data.destination_addresses[0],
        distance_text: element.distance.text,
        duration_text: element.duration.text
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-shipping-distance function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'Check the function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});