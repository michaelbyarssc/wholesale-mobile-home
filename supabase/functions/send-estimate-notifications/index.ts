
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'
import React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { EstimateEmail } from './_templates/estimate-email.tsx'
import { AdminNotificationEmail } from './_templates/admin-notification.tsx'

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
    const {
      customer_name,
      customer_email,
      customer_phone,
      delivery_address,
      mobile_home_id,
      selected_services,
      selected_home_options,
      additional_requirements,
      total_amount
    } = await req.json()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Generate approval token
    const approvalToken = crypto.randomUUID()
    
    // First, create the estimate record
    const { data: estimate, error: createError } = await supabase
      .from('estimates')
      .insert({
        customer_name,
        customer_email,
        customer_phone,
        delivery_address,
        mobile_home_id,
        selected_services: selected_services || [],
        selected_home_options: selected_home_options || [],
        additional_requirements: additional_requirements || '',
        total_amount,
        approval_token: approvalToken,
        status: 'pending'
      })
      .select(`
        *,
        mobile_homes (
          manufacturer,
          series,
          model,
          display_name
        )
      `)
      .single()

    if (createError) {
      throw new Error(`Failed to create estimate: ${createError.message}`)
    }

    // Fetch selected services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')
      .in('id', estimate.selected_services || [])

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

    const approvalUrl = `${supabaseUrl.replace('.supabase.co', '.app')}/approve?token=${approvalToken}`

    console.log('Estimate details prepared for notifications:', {
      estimateId: estimate.id,
      customerEmail: estimate.customer_email,
      adminCount: adminUsers?.length || 0,
      adminUsers: adminUsers?.map(u => u.email),
      approvalUrl
    })

    let emailsSent = 0
    const emailResults = []

    // Get business settings for email branding
    const { data: businessSettings } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['business_name', 'business_logo', 'business_address', 'business_phone', 'business_email'])

    const settings = businessSettings?.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {} as Record<string, string>) || {}

    try {
      // Render professional email template for customer
      const customerEmailHtml = await renderAsync(
        React.createElement(EstimateEmail, {
          customerName: estimate.customer_name,
          estimateDetails,
          totalAmount: estimate.total_amount,
          approvalUrl,
          businessName: settings.business_name || 'Wholesale Homes of the Carolinas',
          businessLogo: settings.business_logo,
          businessAddress: settings.business_address,
          businessPhone: settings.business_phone,
          businessEmail: settings.business_email,
        })
      )

      // Send email to customer with professional template
      const customerEmailResult = await resend.emails.send({
        from: `${settings.business_name || 'Wholesale Homes of the Carolinas'} <onboarding@resend.dev>`,
        to: [estimate.customer_email],
        subject: `Your Mobile Home Estimate #${estimate.id} - Ready for Review`,
        html: customerEmailHtml,
      })

      console.log('Customer email sent:', customerEmailResult)
      emailsSent++
      emailResults.push({ to: estimate.customer_email, status: 'sent', id: customerEmailResult.data?.id })
    } catch (error) {
      console.error('Failed to send customer email:', error)
      emailResults.push({ to: estimate.customer_email, status: 'failed', error: error.message })
    }

    // Get SMS settings
    const { data: smsSettings } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['sms_enabled', 'sms_template', 'fallback_phone'])

    const smsConfig = smsSettings?.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {} as Record<string, any>) || {}

    const isSmsEnabled = smsConfig.sms_enabled === true
    const smsTemplate = smsConfig.sms_template || 'New estimate submitted for {customer_name}. Total: ${total_amount}. Review: {approval_url}'

    // Send emails and SMS to admin users
    if (adminUsers && adminUsers.length > 0) {
      for (const admin of adminUsers) {
        if (admin.email) {
          try {
            // Render professional admin notification email
            const adminEmailHtml = await renderAsync(
              React.createElement(AdminNotificationEmail, {
                customerName: estimate.customer_name,
                customerEmail: estimate.customer_email,
                customerPhone: estimate.customer_phone,
                estimateDetails,
                totalAmount: estimate.total_amount,
                approvalUrl,
                businessName: settings.business_name || 'Wholesale Homes of the Carolinas',
                businessLogo: settings.business_logo,
              })
            )

            const adminEmailResult = await resend.emails.send({
              from: `${settings.business_name || 'Wholesale Homes of the Carolinas'} Admin <onboarding@resend.dev>`,
              to: [admin.email],
              subject: `New Estimate Submitted #${estimate.id}`,
              html: adminEmailHtml,
            })

            console.log(`Admin email sent to ${admin.email}:`, adminEmailResult)
            emailsSent++
            emailResults.push({ to: admin.email, status: 'sent', id: adminEmailResult.data?.id })
          } catch (error) {
            console.error(`Failed to send admin email to ${admin.email}:`, error)
            emailResults.push({ to: admin.email, status: 'failed', error: error.message })
          }
        }

        // Send SMS if enabled and admin has SMS preferences
        if (isSmsEnabled && admin.user_id) {
          try {
            // Get admin SMS preferences
            const { data: smsPrefs } = await supabase
              .from('notification_preferences')
              .select('sms_enabled, phone_number')
              .eq('user_id', admin.user_id)
              .single()

            if (smsPrefs?.sms_enabled && smsPrefs?.phone_number) {
              // Format SMS message
              const smsMessage = smsTemplate
                .replace('{customer_name}', estimate.customer_name)
                .replace('{total_amount}', estimate.total_amount.toString())
                .replace('{approval_url}', approvalUrl)

              // Send SMS
              const smsResult = await supabase.functions.invoke('send-sms-notification', {
                body: {
                  to: smsPrefs.phone_number,
                  message: smsMessage,
                  notification_rule_id: null
                }
              })

              if (smsResult.error) {
                console.error(`Failed to send SMS to ${admin.email}:`, smsResult.error)
              } else {
                console.log(`SMS sent to ${admin.email} at ${smsPrefs.phone_number}`)
              }
            }
          } catch (error) {
            console.error(`Error sending SMS to admin ${admin.email}:`, error)
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
        estimateId: estimate.id,
        customerEmail: estimate.customer_email,
        adminEmailsSent: adminUsers?.length || 0,
        adminEmails: adminUsers?.map(u => u.email) || [],
        totalEmailsSent: emailsSent,
        emailResults,
        approvalUrl
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
