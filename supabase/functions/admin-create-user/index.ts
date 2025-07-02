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

    const isSuperAdmin = userRoles.some(role => role === 'super_admin');
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

    // Get the creating admin's markup info for tiered pricing
    const { data: creatingAdminMarkup } = await supabaseAdmin
      .from('customer_markups')
      .select('markup_percentage, tier_level')
      .eq('user_id', user.id)
      .maybeSingle();

    // CRITICAL FIX: Use the authenticated admin user's ID as created_by
    const createdByUserId = user.id;
    console.log('Creating user with created_by field properly set to:', createdByUserId);
    console.log('Creating user with tiered pricing - Admin markup:', creatingAdminMarkup?.markup_percentage);

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

    // CRITICAL FIX: Use UPSERT instead of INSERT to handle cases where profile might already exist from triggers
    console.log('Creating/updating profile with created_by field properly set to:', createdByUserId);
    
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: newUser.user.id,
        email: email,
        first_name: first_name || '',
        last_name: last_name || '',
        phone_number: phone_number || '',
        approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
        created_by: createdByUserId // CRITICAL: This ensures the creator is properly logged
      }, {
        onConflict: 'user_id'
      });

    if (profileError) {
      console.error('Error creating/updating profile:', profileError);
      // Don't return error immediately - log it but continue with user creation
      console.log('Profile error occurred but continuing with user creation process');
    } else {
      console.log('Profile created/updated successfully with created_by field set to:', createdByUserId);
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
      // Don't return error - log it but continue
      console.log('Role assignment error occurred but continuing');
    } else {
      console.log('Role assigned successfully:', role || 'user');
    }

    // Create tiered customer markup based on creating admin's pricing
    let tierLevel = 'user';
    let parentMarkup = 30; // Default fallback

    if (creatingAdminMarkup) {
      // If created by admin, inherit their tier structure
      if (creatingAdminMarkup.tier_level === 'super_admin') {
        tierLevel = 'admin';
        parentMarkup = creatingAdminMarkup.markup_percentage;
      } else if (creatingAdminMarkup.tier_level === 'admin') {
        tierLevel = 'user';
        parentMarkup = creatingAdminMarkup.markup_percentage;
      }
    }

    console.log('Setting up tiered pricing - Tier:', tierLevel, 'Parent markup:', parentMarkup);

    const { error: markupError } = await supabaseAdmin
      .from('customer_markups')
      .insert({
        user_id: newUser.user.id,
        markup_percentage: markup_percentage || 30,
        tier_level: tierLevel,
        created_by: createdByUserId,
        // Store reference to parent admin's markup for tiered pricing
        super_admin_markup_percentage: parentMarkup
      });

    if (markupError) {
      console.error('Error creating markup:', markupError);
    } else {
      console.log('Tiered markup created successfully - User markup:', markup_percentage || 30, 'Base markup:', parentMarkup);
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
          approved: true
        }
      });
      console.log('Admin action logged successfully');
    } catch (auditError) {
      console.error('Failed to log admin action:', auditError);
    }

    console.log('User setup completed successfully with proper created_by tracking');

    // ENSURE we return a proper success response
    const successResponse = {
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
        approved: true
      }
    };

    console.log('Returning success response:', successResponse);

    return new Response(
      JSON.stringify(successResponse),
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
