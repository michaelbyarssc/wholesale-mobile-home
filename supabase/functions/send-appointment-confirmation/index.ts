import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'
import React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { AppointmentConfirmationEmail } from './_templates/appointment-confirmation.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { appointmentId } = await req.json()

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get appointment details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        *,
        appointment_slots!slot_id (*),
        mobile_homes:mobile_home_id (model, manufacturer, display_name)
      `)
      .eq('id', appointmentId)
      .single()

    if (appointmentError || !appointment) {
      throw new Error('Appointment not found')
    }

    // Create confirmation notification record
    const { error: notificationError } = await supabase
      .from('appointment_notifications')
      .insert({
        appointment_id: appointmentId,
        notification_type: 'confirmation',
        sent_at: new Date().toISOString(),
        email_sent: true
      })

    if (notificationError) {
      console.error('Error creating notification record:', notificationError)
    }

    // Format appointment details for email
    const appointmentDate = new Date(appointment.appointment_slots.date)
    const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    const formattedTime = `${appointment.appointment_slots.start_time} - ${appointment.appointment_slots.end_time}`
    
    const locationAddress = appointment.appointment_slots.location_type === 'showroom' 
      ? 'Our Showroom - 123 Mobile Home Blvd, Your City, ST 12345'
      : appointment.appointment_slots.location_address || 'On-site location'

    const mobileHomeName = appointment.mobile_homes 
      ? `${appointment.mobile_homes.manufacturer} ${appointment.mobile_homes.model}${appointment.mobile_homes.display_name ? ` (${appointment.mobile_homes.display_name})` : ''}`
      : undefined

    console.log('Sending appointment confirmation email to:', appointment.customer_email)

    // Get business settings for email branding
    const { data: businessSettings } = await supabase
      .from('admin_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['business_name', 'business_logo', 'business_phone', 'business_email'])

    const settings = businessSettings?.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {} as Record<string, string>) || {}

    // Render professional appointment confirmation email
    const emailHtml = await renderAsync(
      React.createElement(AppointmentConfirmationEmail, {
        customerName: appointment.customer_name,
        appointmentDate: formattedDate,
        appointmentTime: formattedTime,
        appointmentType: appointment.appointment_type,
        locationType: appointment.appointment_slots.location_type,
        locationAddress,
        mobileHomeName,
        specialRequests: appointment.special_requests,
        confirmationToken: appointment.confirmation_token,
        businessName: settings.business_name || 'Wholesale Homes of the Carolinas',
        businessLogo: settings.business_logo,
        businessPhone: settings.business_phone || '(864) 680-4030',
        businessEmail: settings.business_email || 'Info@WholesaleMobileHome.com',
      })
    )

    const emailResponse = await resend.emails.send({
      from: `${settings.business_name || 'Wholesale Homes of the Carolinas'} <onboarding@resend.dev>`,
      to: [appointment.customer_email],
      subject: 'Appointment Confirmed - Mobile Home Solutions',
      html: emailHtml,
    })

    console.log('Email sent successfully:', emailResponse)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Confirmation sent successfully',
        appointmentId 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in send-appointment-confirmation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})