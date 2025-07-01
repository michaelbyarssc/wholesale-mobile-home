
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role?: 'admin' | 'user';
  markup_percentage?: number;
  created_by?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin user authenticated:', user.id);

    // Check requesting user's role - get all roles for the user
    const { data: requestingUserRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Error fetching user roles:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify user role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Requesting user roles:', requestingUserRoles);

    if (!requestingUserRoles || requestingUserRoles.length === 0) {
      console.error('User has no roles assigned');
      return new Response(
        JSON.stringify({ error: 'User has no admin privileges' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRoles = requestingUserRoles.map(r => r.role);
    console.log('User roles:', userRoles);

    // Check if requesting user has admin privileges
    if (!userRoles.some(role => ['admin', 'super_admin'].includes(role))) {
      console.error('User does not have admin privileges');
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSuperAdmin = userRoles.includes('super_admin');
    console.log('User is super admin:', isSuperAdmin);

    const { email, password, first_name, last_name, phone_number, role, markup_percentage, created_by }: CreateUserRequest = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent regular admins from creating other admins
    if (role === 'admin' && !isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can create admin users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the authenticated admin user's ID as created_by (this is the key fix)
    const createdByUserId = user.id;
    console.log('Creating user with details:', { 
      email, 
      first_name, 
      last_name, 
      phone_number, 
      role: role || 'user', 
      markup_percentage: markup_percentage || 30, 
      created_by: createdByUserId 
    });

    // Create user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        first_name: first_name || '',
        last_name: last_name || '',
        phone_number: phone_number || ''
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newUser.user) {
      console.error('User creation failed - no user returned');
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created successfully:', newUser.user.id);

    // CRITICAL FIX: Create profile with explicit approved: true (not null)
    // This ensures the user is auto-approved and won't appear in pending approvals
    console.log('Creating profile with created_by:', createdByUserId, 'and EXPLICIT auto-approval (approved: true)');
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        email: email,
        first_name: first_name || '',
        last_name: last_name || '',
        phone_number: phone_number || '',
        approved: true, // EXPLICIT true, not null - this is the key fix
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        created_by: createdByUserId
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail the entire request, but log the error
    } else {
      console.log('Profile created successfully with EXPLICIT auto-approval (approved: true) and correct created_by');
    }

    // Assign role - default to 'user' if not specified
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: role || 'user'
      });

    if (roleInsertError) {
      console.error('Error assigning role:', roleInsertError);
    } else {
      console.log('Role assigned successfully:', role || 'user');
    }

    // Create customer markup - default to 30% if not specified
    const { error: markupError } = await supabaseAdmin
      .from('customer_markups')
      .insert({
        user_id: newUser.user.id,
        markup_percentage: markup_percentage || 30,
        created_by: createdByUserId
      });

    if (markupError) {
      console.error('Error creating markup:', markupError);
    } else {
      console.log('Markup created successfully:', markup_percentage || 30);
    }

    // Log admin action
    try {
      await supabaseAdmin.from('admin_audit_log').insert({
        admin_user_id: user.id,
        action: 'USER_CREATED',
        table_name: 'auth.users',
        record_id: newUser.user.id,
        new_values: { 
          email, 
          first_name: first_name || '', 
          last_name: last_name || '', 
          phone_number: phone_number || '', 
          role: role || 'user', 
          markup_percentage: markup_percentage || 30, 
          created_by: createdByUserId, 
          approved: true // Log that it was auto-approved
        }
      });
      console.log('Admin action logged successfully');
    } catch (auditError) {
      console.error('Failed to log admin action:', auditError);
    }

    console.log('User setup completed successfully with EXPLICIT auto-approval');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          first_name: first_name || '',
          last_name: last_name || '',
          phone_number: phone_number || '',
          role: role || 'user',
          markup_percentage: markup_percentage || 30,
          created_by: createdByUserId,
          approved: true // Confirm it's auto-approved
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in admin-create-user function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
