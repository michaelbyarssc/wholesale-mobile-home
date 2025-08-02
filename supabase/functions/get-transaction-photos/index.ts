import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PhotoRequest {
  transactionNumber: string;
  userId?: string;
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

    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const transactionNumber = url.searchParams.get('transactionNumber');
    const userId = url.searchParams.get('userId');

    if (!transactionNumber) {
      return new Response(
        JSON.stringify({ error: 'Transaction number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find delivery by transaction number
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select(`
        id,
        transaction_number,
        customer_name,
        customer_email,
        delivery_assignments!inner (
          driver_id,
          drivers (id, created_by, full_name)
        )
      `)
      .eq('transaction_number', transactionNumber)
      .single();

    if (deliveryError || !delivery) {
      console.error('Error finding delivery:', deliveryError);
      return new Response(
        JSON.stringify({ error: 'Delivery not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user access permissions
    if (userId) {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const isAdmin = userRoles?.some(ur => ur.role === 'admin' || ur.role === 'super_admin');
      const isDriver = delivery.delivery_assignments.some((da: any) => 
        da.drivers.id === userId || da.drivers.created_by === userId
      );

      if (!isAdmin && !isDriver) {
        // Check if user is the customer
        const { data: customerProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', userId)
          .single();

        if (customerProfile?.email !== delivery.customer_email) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Get all photos for this delivery
    const { data: photos, error: photosError } = await supabase
      .from('delivery_photos')
      .select(`
        id,
        photo_url,
        photo_category,
        caption,
        latitude,
        longitude,
        uploaded_at,
        drivers (full_name)
      `)
      .eq('delivery_id', delivery.id)
      .order('uploaded_at', { ascending: true });

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch photos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group photos by category
    const photosByCategory = photos?.reduce((acc, photo) => {
      const category = photo.photo_category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(photo);
      return acc;
    }, {} as Record<string, any[]>) || {};

    // Get photo counts
    const photoCounts = {
      pickup: (photos?.filter(p => p.photo_category?.startsWith('pickup_')) || []).length,
      delivery: (photos?.filter(p => p.photo_category?.startsWith('delivery_')) || []).length,
      issues: (photos?.filter(p => p.photo_category === 'issue') || []).length,
      signature: (photos?.filter(p => p.photo_category === 'signature') || []).length,
      total: photos?.length || 0
    };

    const response = {
      success: true,
      delivery: {
        id: delivery.id,
        transactionNumber: delivery.transaction_number,
        customerName: delivery.customer_name
      },
      photos: photos || [],
      photosByCategory,
      photoCounts,
      drivers: delivery.delivery_assignments.map((da: any) => da.drivers)
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in get-transaction-photos function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);