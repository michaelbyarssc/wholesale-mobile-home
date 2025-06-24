
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { estimateId } = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch the estimate details with related data
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select(`
        *,
        mobile_homes (
          manufacturer,
          series,
          model,
          display_name
        )
      `)
      .eq('id', estimateId)
      .single()

    if (estimateError) {
      throw new Error(`Failed to fetch estimate: ${estimateError.message}`)
    }

    // Fetch selected services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .in('id', estimate.selected_services)

    if (servicesError) {
      throw new Error(`Failed to fetch services: ${servicesError.message}`)
    }

    // Fetch admin users - fix the relationship issue
    const { data: adminRoles, error: adminRolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    if (adminRolesError) {
      console.error('Failed to fetch admin roles:', adminRolesError)
    }

    let adminUsers = []
    if (adminRoles && adminRoles.length > 0) {
      const adminUserIds = adminRoles.map(role => role.user_id)
      
      // Fetch profiles for admin users
      const { data: adminProfiles, error: adminProfilesError } = await supabase
        .from('profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', adminUserIds)

      if (adminProfilesError) {
        console.error('Failed to fetch admin profiles:', adminProfilesError)
      } else {
        adminUsers = adminProfiles || []
      }
    }

    // Format the estimate data for email
    const mobileHome = estimate.mobile_homes
    const homeDisplayName = mobileHome?.display_name || `${mobileHome?.manufacturer} ${mobileHome?.series} ${mobileHome?.model}`
    
    const servicesList = services?.map(service => 
      `• ${service.name}: $${service.price}`
    ).join('\n') || 'No services selected'

    const estimateDetails = `
Estimate #${estimate.id}

Customer Information:
Name: ${estimate.customer_name}
Phone: ${estimate.customer_phone}
Email: ${estimate.customer_email}
Delivery Address: ${estimate.delivery_address || 'Not provided'}
Preferred Contact: ${estimate.preferred_contact || 'Not specified'}
Timeline: ${estimate.timeline || 'Not specified'}

Mobile Home:
${homeDisplayName}

Selected Services:
${servicesList}

Additional Requirements:
${estimate.additional_requirements || 'None specified'}

Total Amount: $${estimate.total_amount}

Status: ${estimate.status}
Created: ${new Date(estimate.created_at).toLocaleDateString()}
    `

    console.log('Estimate details prepared for notifications:', {
      estimateId,
      customerEmail: estimate.customer_email,
      adminCount: adminUsers?.length || 0,
      adminUsers: adminUsers?.map(u => u.email)
    })

    let emailsSent = 0
    const emailResults = []

    try {
      // Send email to customer
      const customerEmailResult = await resend.emails.send({
        from: 'Wholesale Homes of the Carolinas <onboarding@resend.dev>',
        to: [estimate.customer_email],
        subject: `Your Mobile Home Estimate #${estimate.id}`,
        html: `
          <h2>Thank you for your interest!</h2>
          <p>Here are your estimate details:</p>
          <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace;">${estimateDetails}</pre>
          <p>We will contact you soon to discuss your mobile home purchase.</p>
          <p>Best regards,<br>Wholesale Homes of the Carolinas</p>
        `,
      })

      console.log('Customer email sent:', customerEmailResult)
      emailsSent++
      emailResults.push({ to: estimate.customer_email, status: 'sent', id: customerEmailResult.data?.id })
    } catch (error) {
      console.error('Failed to send customer email:', error)
      emailResults.push({ to: estimate.customer_email, status: 'failed', error: error.message })
    }

    // Send emails to admin users
    if (adminUsers && adminUsers.length > 0) {
      for (const admin of adminUsers) {
        if (admin.email) {
          try {
            const adminEmailResult = await resend.emails.send({
              from: 'Wholesale Homes of the Carolinas <onboarding@resend.dev>',
              to: [admin.email],
              subject: `New Estimate Submitted #${estimate.id}`,
              html: `
                <h2>New Estimate Submitted</h2>
                <p>A new estimate has been submitted and requires your attention:</p>
                <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace;">${estimateDetails}</pre>
                <p>Please review this estimate in the admin dashboard.</p>
              `,
            })

            console.log(`Admin email sent to ${admin.email}:`, adminEmailResult)
            emailsSent++
            emailResults.push({ to: admin.email, status: 'sent', id: adminEmailResult.data?.id })
          } catch (error) {
            console.error(`Failed to send admin email to ${admin.email}:`, error)
            emailResults.push({ to: admin.email, status: 'failed', error: error.message })
          }
        }
      }
    } else {
      console.log('No admin users found or no emails available')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Estimate notifications processed',
        estimateId,
        customerEmail: estimate.customer_email,
        adminEmailsSent: adminUsers?.length || 0,
        adminEmails: adminUsers?.map(u => u.email) || [],
        totalEmailsSent: emailsSent,
        emailResults
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in send-estimate-notifications:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
