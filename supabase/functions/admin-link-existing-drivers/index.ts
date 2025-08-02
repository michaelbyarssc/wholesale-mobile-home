import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LinkDriverRequest {
  driver_id?: string; // If provided, link only this driver
}

interface LinkResult {
  success: boolean;
  driver_id: string;
  driver_name: string;
  email: string;
  temporary_password?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key
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

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid token')
    }

    // Check if user has admin role
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (roleError) {
      throw new Error('Failed to check user roles')
    }

    const isAdmin = roles?.some(r => r.role === 'admin' || r.role === 'super_admin')
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required')
    }

    const { driver_id } = await req.json() as LinkDriverRequest

    // Fetch drivers that need user accounts
    let driversQuery = supabaseAdmin
      .from('drivers')
      .select('id, first_name, last_name, email, phone, user_id')
      .is('user_id', null)

    if (driver_id) {
      driversQuery = driversQuery.eq('id', driver_id)
    }

    const { data: unlinkedDrivers, error: driversError } = await driversQuery

    if (driversError) {
      throw new Error(`Failed to fetch drivers: ${driversError.message}`)
    }

    if (!unlinkedDrivers || unlinkedDrivers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No drivers need linking',
          results: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const results: LinkResult[] = []

    // Process each driver
    for (const driver of unlinkedDrivers) {
      try {
        console.log(`Processing driver: ${driver.first_name} ${driver.last_name} (${driver.email})`)

        // Generate a secure temporary password
        const temporaryPassword = 'Wholesale2025!'

        // Create user account
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: driver.email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            first_name: driver.first_name,
            last_name: driver.last_name,
            phone: driver.phone
          }
        })

        if (createUserError) {
          console.error(`Failed to create user for driver ${driver.id}:`, createUserError)
          results.push({
            success: false,
            driver_id: driver.id,
            driver_name: `${driver.first_name} ${driver.last_name}`,
            email: driver.email,
            error: `Failed to create user account: ${createUserError.message}`
          })
          continue
        }

        if (!newUser.user) {
          results.push({
            success: false,
            driver_id: driver.id,
            driver_name: `${driver.first_name} ${driver.last_name}`,
            email: driver.email,
            error: 'User creation returned no user data'
          })
          continue
        }

        console.log(`Created user account for driver ${driver.id}:`, newUser.user.id)

        // Create profile record
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            user_id: newUser.user.id,
            first_name: driver.first_name,
            last_name: driver.last_name,
            phone: driver.phone,
            created_by: user.id
          })

        if (profileError) {
          console.error(`Failed to create profile for driver ${driver.id}:`, profileError)
          // Don't fail here, profile creation is not critical for driver functionality
        }

        // Add driver role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: newUser.user.id,
            role: 'driver'
          })

        if (roleError) {
          console.error(`Failed to assign driver role for driver ${driver.id}:`, roleError)
          results.push({
            success: false,
            driver_id: driver.id,
            driver_name: `${driver.first_name} ${driver.last_name}`,
            email: driver.email,
            error: `Failed to assign driver role: ${roleError.message}`
          })
          continue
        }

        // Update driver record with user_id
        const { error: updateDriverError } = await supabaseAdmin
          .from('drivers')
          .update({ user_id: newUser.user.id })
          .eq('id', driver.id)

        if (updateDriverError) {
          console.error(`Failed to update driver ${driver.id} with user_id:`, updateDriverError)
          results.push({
            success: false,
            driver_id: driver.id,
            driver_name: `${driver.first_name} ${driver.last_name}`,
            email: driver.email,
            error: `Failed to link driver to user account: ${updateDriverError.message}`
          })
          continue
        }

        // Log the action in audit log
        await supabaseAdmin
          .from('admin_audit_log')
          .insert({
            admin_user_id: user.id,
            action: 'create_driver_user_account',
            table_name: 'drivers',
            record_id: driver.id,
            new_values: {
              driver_id: driver.id,
              user_id: newUser.user.id,
              email: driver.email,
              temporary_password_set: true
            }
          })

        results.push({
          success: true,
          driver_id: driver.id,
          driver_name: `${driver.first_name} ${driver.last_name}`,
          email: driver.email,
          temporary_password: temporaryPassword
        })

        console.log(`Successfully linked driver ${driver.id} to user ${newUser.user.id}`)

      } catch (error) {
        console.error(`Error processing driver ${driver.id}:`, error)
        results.push({
          success: false,
          driver_id: driver.id,
          driver_name: `${driver.first_name} ${driver.last_name}`,
          email: driver.email,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} drivers: ${successCount} successful, ${errorCount} failed`,
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: errorCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in admin-link-existing-drivers function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})