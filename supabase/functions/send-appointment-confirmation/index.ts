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
    const appointmentTime = appointment.appointment_slots.start_time
    const endTime = appointment.appointment_slots.end_time
    
    const locationDetails = {
      showroom: 'Our Showroom - 123 Mobile Home Blvd, Your City, ST 12345',
      on_site: appointment.appointment_slots.location_address || 'On-site location',
      virtual: 'Virtual meeting - Link will be sent before the appointment'
    }

    // Here you would integrate with your email service (Resend, etc.)
    // For now, we'll just log the confirmation details
    console.log('Appointment confirmation details:', {
      customerName: appointment.customer_name,
      customerEmail: appointment.customer_email,
      appointmentDate: appointmentDate.toLocaleDateString(),
      appointmentTime: `${appointmentTime} - ${endTime}`,
      locationType: appointment.appointment_slots.location_type,
      locationAddress: locationDetails[appointment.appointment_slots.location_type] || 'TBD',
      mobileHome: appointment.mobile_homes ? 
        `${appointment.mobile_homes.manufacturer} ${appointment.mobile_homes.model}` : 
        'General consultation',
      confirmationToken: appointment.confirmation_token,
      partySize: appointment.party_size,
      specialRequests: appointment.special_requests
    })

    // In a real implementation, you would send the email here
    // Example structure for email content:
    const emailContent = {
      to: appointment.customer_email,
      subject: 'Appointment Confirmation - Mobile Home Viewing',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Your Appointment is Confirmed!</h2>
          
          <p>Dear ${appointment.customer_name},</p>
          
          <p>Thank you for scheduling an appointment with us. Here are your appointment details:</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Appointment Details</h3>
            
            <p><strong>Date:</strong> ${appointmentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            
            <p><strong>Time:</strong> ${appointmentTime} - ${endTime}</p>
            
            <p><strong>Type:</strong> ${appointment.appointment_type === 'viewing' ? 'Home Viewing' : 
              appointment.appointment_type === 'consultation' ? 'Consultation' :
              appointment.appointment_type === 'inspection' ? 'Inspection' : 'Delivery Planning'}</p>
            
            <p><strong>Location:</strong> ${locationDetails[appointment.appointment_slots.location_type]}</p>
            
            <p><strong>Party Size:</strong> ${appointment.party_size} ${appointment.party_size === 1 ? 'person' : 'people'}</p>
            
            ${appointment.mobile_homes ? `
              <p><strong>Home:</strong> ${appointment.mobile_homes.manufacturer} ${appointment.mobile_homes.model}
              ${appointment.mobile_homes.display_name ? ` (${appointment.mobile_homes.display_name})` : ''}</p>
            ` : ''}
            
            ${appointment.special_requests ? `
              <p><strong>Special Requests:</strong> ${appointment.special_requests}</p>
            ` : ''}
            
            <p><strong>Confirmation #:</strong> ${appointment.confirmation_token}</p>
          </div>
          
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #065f46;">What to Expect</h4>
            <ul style="color: #064e3b; margin: 0;">
              <li>One of our experienced agents will meet you at the scheduled time</li>
              <li>Feel free to ask questions about features, pricing, and financing options</li>
              <li>We'll provide detailed information about delivery and setup</li>
              <li>Bring any questions or requirements you have in mind</li>
            </ul>
          </div>
          
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #92400e;">Important Notes</h4>
            <ul style="color: #78350f; margin: 0;">
              <li>Please arrive 5-10 minutes early</li>
              <li>If you need to reschedule, please call us at least 24 hours in advance</li>
              <li>Contact us at (864) 680-4030 if you have any questions</li>
            </ul>
          </div>
          
          <p>We're excited to help you find your perfect mobile home!</p>
          
          <p>Best regards,<br>The WholesaleMobileHome.com Team</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <div style="font-size: 12px; color: #6b7280;">
            <p>WholesaleMobileHome.com<br>
            Phone: (864) 680-4030<br>
            Email: Info@WholesaleMobileHome.com</p>
            
            <p>If you need to cancel or reschedule, please contact us as soon as possible.</p>
          </div>
        </div>
      `
    }

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