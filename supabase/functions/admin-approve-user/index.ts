
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApproveUserRequest {
  userId: string;
}

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

    // Check if user has admin privileges (admin or super_admin)
    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin']);

    if (!adminCheck || adminCheck.length === 0) {
      throw new Error("Unauthorized - admin access required");
    }

    const { userId }: ApproveUserRequest = await req.json();

    console.log('Approving user:', userId, 'by admin:', user.id);

    // Update user profile to explicitly approved: true
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        approved: true, // EXPLICIT true, not null
        approved_at: new Date().toISOString(),
        approved_by: user.id
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      throw updateError;
    }

    console.log('Profile updated to approved: true');

    // Assign user role if they don't have one
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: 'user'
        });

      if (roleError) {
        console.error('Role assignment error:', roleError);
      } else {
        console.log('User role assigned successfully');
      }
    }

    // Assign default markup if they don't have one
    const { data: existingMarkup } = await supabase
      .from('customer_markups')
      .select('markup_percentage')
      .eq('user_id', userId)
      .single();

    if (!existingMarkup) {
      const { error: markupError } = await supabase
        .from('customer_markups')
        .insert({
          user_id: userId,
          markup_percentage: 30
        });

      if (markupError) {
        console.error('Markup assignment error:', markupError);
      } else {
        console.log('Default markup assigned successfully');
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error approving user:", error);
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
