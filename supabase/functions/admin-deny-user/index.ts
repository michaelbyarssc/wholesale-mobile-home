
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DenyUserRequest {
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

    // Check if user is admin
    const { data: adminCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminCheck) {
      throw new Error("Unauthorized - admin access required");
    }

    const { userId }: DenyUserRequest = await req.json();

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      throw new Error("Cannot deny your own account");
    }

    console.log('Processing denial/deletion for user:', userId);

    // Check if user exists in auth system first
    const { data: targetUser, error: userCheckError } = await supabase.auth.admin.getUserById(userId);
    const userExistsInAuth = !userCheckError && targetUser;

    console.log('User exists in auth system:', userExistsInAuth);

    // Always clean up user data from public tables first
    try {
      // Delete from profiles table
      const { error: profileError } = await supabase.from('profiles').delete().eq('user_id', userId);
      if (profileError) console.error('Error deleting profile:', profileError);
      
      // Delete from user_roles table
      const { error: roleError } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (roleError) console.error('Error deleting user role:', roleError);
      
      // Delete from customer_markups table
      const { error: markupError } = await supabase.from('customer_markups').delete().eq('user_id', userId);
      if (markupError) console.error('Error deleting customer markup:', markupError);
      
      // Delete from estimates table
      const { error: estimatesError } = await supabase.from('estimates').delete().eq('user_id', userId);
      if (estimatesError) console.error('Error deleting estimates:', estimatesError);
      
      // Delete from invoices table
      const { error: invoicesError } = await supabase.from('invoices').delete().eq('user_id', userId);
      if (invoicesError) console.error('Error deleting invoices:', invoicesError);
      
      console.log('Cleaned up user data from public tables');
    } catch (dbError) {
      console.error('Error deleting user data from public tables:', dbError);
      // Continue with auth user deletion even if some public table deletions fail
    }

    // Only try to delete from auth if user exists there
    if (userExistsInAuth) {
      const { data, error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        console.error('User deletion error from auth:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      console.log('User deleted successfully from auth system:', userId);
    } else {
      console.log('User was already deleted from auth system, only cleaned up profile data');
    }

    // Log admin action
    try {
      await supabase.from('admin_audit_log').insert({
        admin_user_id: user.id,
        action: 'USER_DENIED_AND_DELETED',
        table_name: 'auth.users',
        record_id: userId,
        new_values: { 
          deleted: true,
          auth_user_existed: userExistsInAuth 
        }
      });
    } catch (auditError) {
      console.error('Failed to log admin action:', auditError);
      // Don't fail the request if audit logging fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: userExistsInAuth 
        ? 'User denied and completely deleted from the system' 
        : 'User profile data cleaned up (user was already deleted from auth system)'
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error denying/deleting user:", error);
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
