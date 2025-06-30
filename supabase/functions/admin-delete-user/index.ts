
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
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.log('Auth verification failed:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('User authenticated:', user.id)

    // Check if user is admin using the is_admin function
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

    const { user_id } = await req.json()

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Prevent admin from deleting themselves
    if (user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Processing deletion for user:', user_id)

    // Check if user exists in auth system first
    const { data: targetUser, error: userCheckError } = await supabaseAdmin.auth.admin.getUserById(user_id)
    const userExistsInAuth = !userCheckError && targetUser

    console.log('User exists in auth system:', userExistsInAuth)

    // Always clean up user data from public tables first
    try {
      // Delete from profiles table
      const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('user_id', user_id)
      if (profileError) console.error('Error deleting profile:', profileError)
      
      // Delete from user_roles table
      const { error: roleError } = await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id)
      if (roleError) console.error('Error deleting user role:', roleError)
      
      // Delete from customer_markups table
      const { error: markupError } = await supabaseAdmin.from('customer_markups').delete().eq('user_id', user_id)
      if (markupError) console.error('Error deleting customer markup:', markupError)
      
      console.log('Cleaned up user data from public tables')
    } catch (dbError) {
      console.error('Error deleting user data from public tables:', dbError)
      // Continue with auth user deletion even if some public table deletions fail
    }

    // Only try to delete from auth if user exists there
    if (userExistsInAuth) {
      const { data, error } = await supabaseAdmin.auth.admin.deleteUser(user_id)

      if (error) {
        console.error('User deletion error from auth:', error)
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log('User deleted successfully from auth system:', user_id)
    } else {
      console.log('User was already deleted from auth system, only cleaned up profile data')
    }

    // Log admin action
    try {
      await supabaseAdmin.from('admin_audit_log').insert({
        admin_user_id: user.id,
        action: 'USER_DELETE',
        table_name: 'auth.users',
        record_id: user_id,
        new_values: { 
          deleted: true,
          auth_user_existed: userExistsInAuth 
        }
      })
    } catch (auditError) {
      console.error('Failed to log admin action:', auditError)
      // Don't fail the request if audit logging fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: userExistsInAuth 
        ? 'User deleted successfully' 
        : 'User profile data cleaned up (user was already deleted from auth system)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Admin delete user error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
