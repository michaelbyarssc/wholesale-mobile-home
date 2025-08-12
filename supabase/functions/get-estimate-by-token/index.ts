import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token") || url.searchParams.get("approval_token");

    if (!token) {
      try {
        const body = await req.json();
        token = body?.token || body?.approval_token || null;
      } catch (_) {
        // no body
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing approval token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch estimate by approval_token with limited fields and joined mobile home
    const { data: estimate, error: estimateError } = await supabase
      .from("estimates")
      .select(`
        id,
        approved_at,
        customer_name,
        customer_email,
        customer_phone,
        delivery_address,
        mobile_home_id,
        selected_services,
        selected_home_options,
        total_amount,
        additional_requirements,
        transaction_number,
        mobile_homes:mobile_homes (
          manufacturer,
          series,
          model,
          display_name,
          price,
          bedrooms,
          bathrooms,
          square_footage
        )
      `)
      .eq("approval_token", token)
      .maybeSingle();

    if (estimateError) {
      console.error("Error fetching estimate:", estimateError);
      return new Response(JSON.stringify({ error: "Failed to fetch estimate" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!estimate) {
      return new Response(JSON.stringify({ error: "Estimate not found or link has expired" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const alreadyApproved = !!estimate.approved_at;

    // Fetch selected services if any
    let services: any[] = [];
    const selectedServices = Array.isArray(estimate.selected_services)
      ? estimate.selected_services
      : [];

    if (selectedServices.length > 0) {
      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("id, name, price, description")
        .in("id", selectedServices);

      if (servicesError) {
        console.error("Error fetching services:", servicesError);
      } else if (servicesData) {
        services = servicesData;
      }
    }

    return new Response(
      JSON.stringify({ estimate, services, alreadyApproved }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-estimate-by-token unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
