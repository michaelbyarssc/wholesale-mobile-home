
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the requesting user is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Invalid authentication");
    }

    // Check if user is admin or super admin
    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin'])
      .single();

    if (!adminCheck) {
      throw new Error("Unauthorized - admin access required");
    }

    console.log('Bulk approving users by:', user.email);

    // Get all pending users (not approved and not denied)
    const { data: pendingUsers, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, email')
      .eq('approved', false)
      .eq('denied', false);

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No pending users to approve",
        approved_count: 0
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log(`Found ${pendingUsers.length} pending users to approve`);

    // Update all pending users to approved
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id
      })
      .eq('approved', false)
      .eq('denied', false);

    if (updateError) {
      throw updateError;
    }

    // Assign user role to all approved users
    const userRoleInserts = pendingUsers.map(pendingUser => ({
      user_id: pendingUser.user_id,
      role: 'user'
    }));

    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert(userRoleInserts, { onConflict: 'user_id' });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      // Don't throw here as approval is more important
    }

    // Assign default markup to all approved users
    const markupInserts = pendingUsers.map(pendingUser => ({
      user_id: pendingUser.user_id,
      markup_percentage: 30
    }));

    const { error: markupError } = await supabase
      .from('customer_markups')
      .upsert(markupInserts, { onConflict: 'user_id' });

    if (markupError) {
      console.error('Markup assignment error:', markupError);
      // Don't throw here as approval is more important
    }

    console.log(`Successfully approved ${pendingUsers.length} users`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully approved ${pendingUsers.length} users`,
      approved_count: pendingUsers.length,
      approved_users: pendingUsers.map(u => u.email)
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error bulk approving users:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
