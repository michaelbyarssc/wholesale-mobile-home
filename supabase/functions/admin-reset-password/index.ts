
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create admin client for user operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('No authorization header found')
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token extracted, length:', token.length)
    
    // Verify the JWT token by creating a client with the token
    const supabaseWithToken = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Get the user using the token-authenticated client
    const { data: { user }, error: authError } = await supabaseWithToken.auth.getUser()
    if (authError || !user) {
      console.log('Auth verification failed:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('User authenticated:', user.id)

    // Check if user is admin using the is_admin function with admin client
    const { data: isAdmin, error: adminError } = await supabaseAdmin.rpc('is_admin', { user_id: user.id })
    if (adminError) {
      console.log('Admin check error:', adminError)
      return new Response(JSON.stringify({ error: 'Error checking admin status: ' + adminError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!isAdmin) {
      console.log('User is not admin:', user.id)
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Admin verified, processing request')

    const { user_id, new_password } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if user exists in auth system first
    const { data: targetUser, error: userCheckError } = await supabaseAdmin.auth.admin.getUserById(user_id)
    if (userCheckError || !targetUser) {
      console.log('Target user not found in auth system:', userCheckError)
      
      // Clean up profile data for non-existent user
      try {
        await supabaseAdmin.from('profiles').delete().eq('user_id', user_id)
        await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id)
        await supabaseAdmin.from('customer_markups').delete().eq('user_id', user_id)
        console.log('Cleaned up profile data for non-existent user:', user_id)
      } catch (cleanupError) {
        console.error('Error cleaning up profile data:', cleanupError)
      }
      
      return new Response(JSON.stringify({ 
        error: 'User not found in authentication system. Profile data has been cleaned up.',
        user_deleted: true
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use provided password or default to Wholesale2025!
    const password = new_password || 'Wholesale2025!'

    console.log('Updating password for user:', user_id)

    // Update user password using admin client
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password }
    )

    if (error) {
      console.error('Password reset error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Password updated successfully for user:', data.user?.id)

    // Log admin action
    try {
      await supabaseAdmin.from('admin_audit_log').insert({
        admin_user_id: user.id,
        action: 'PASSWORD_RESET',
        table_name: 'auth.users',
        record_id: data.user?.id,
        new_values: { password_reset: true }
      })
    } catch (auditError) {
      console.error('Failed to log admin action:', auditError)
      // Don't fail the request if audit logging fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      temporaryPassword: password,
      message: 'Password reset successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Admin reset password error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
