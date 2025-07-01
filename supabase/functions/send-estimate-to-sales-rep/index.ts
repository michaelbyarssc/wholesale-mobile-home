
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
    const { cart_items, total_amount, sales_rep_email, user_id } = await req.json()

    console.log('🔍 send-estimate-to-sales-rep: Received request:', {
      cart_items: cart_items?.length || 0,
      total_amount,
      sales_rep_email,
      user_id
    })

    if (!cart_items || cart_items.length === 0) {
      throw new Error('No cart items provided')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get customer information
    let customerInfo = { name: 'N/A', email: 'N/A', phone: 'N/A' }
    if (user_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone_number')
        .eq('user_id', user_id)
        .single()

      if (profile && !profileError) {
        customerInfo = {
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
          email: profile.email || 'N/A',
          phone: profile.phone_number || 'N/A'
        }
      }
    }

    // Get all service IDs from cart items
    const allServiceIds = cart_items.reduce((acc: string[], item: any) => {
      return [...acc, ...(item.selectedServices || [])]
    }, [])

    // Get all home option IDs from cart items
    const allHomeOptionIds = cart_items.reduce((acc: string[], item: any) => {
      return [...acc, ...(item.selectedHomeOptions || []).map((ho: any) => ho.option.id)]
    }, [])

    // Fetch services data
    let servicesData: any[] = []
    if (allServiceIds.length > 0) {
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .in('id', allServiceIds)

      if (servicesError) {
        console.error('Error fetching services:', servicesError)
      } else {
        servicesData = services || []
      }
    }

    // Fetch home options data
    let homeOptionsData: any[] = []
    if (allHomeOptionIds.length > 0) {
      const { data: homeOptions, error: homeOptionsError } = await supabase
        .from('home_options')
        .select('*')
        .in('id', allHomeOptionIds)

      if (homeOptionsError) {
        console.error('Error fetching home options:', homeOptionsError)
      } else {
        homeOptionsData = homeOptions || []
      }
    }

    // Build email content
    let emailContent = `
<h2>New Cart Estimate Request</h2>

<h3>Customer Information:</h3>
<ul>
  <li><strong>Name:</strong> ${customerInfo.name}</li>
  <li><strong>Email:</strong> ${customerInfo.email}</li>
  <li><strong>Phone:</strong> ${customerInfo.phone}</li>
</ul>

<h3>Cart Details:</h3>
`

    // Process each cart item
    cart_items.forEach((item: any, index: number) => {
      const home = item.mobileHome
      const homeName = home.display_name || `${home.manufacturer} ${home.series} ${home.model}`
      const homeSize = home.square_footage ? `${home.square_footage} sq ft` : 'N/A'
      const bedBath = `${home.bedrooms || 0} bed / ${home.bathrooms || 0} bath`
      const homePrice = home.cost || home.price || 0

      emailContent += `
<div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0;">
  <h4>Item ${index + 1}: ${homeName}</h4>
  <ul>
    <li><strong>Size:</strong> ${homeSize}</li>
    <li><strong>Bed/Bath:</strong> ${bedBath}</li>
    <li><strong>Home Price:</strong> $${homePrice.toLocaleString()}</li>
  </ul>
`

      // Add selected services with proper pricing
      if (item.selectedServices && item.selectedServices.length > 0) {
        emailContent += `<h5>Selected Services:</h5><ul>`
        item.selectedServices.forEach((serviceId: string) => {
          const service = servicesData.find(s => s.id === serviceId)
          if (service) {
            // Calculate service price based on home width
            const homeWidth = home.width_feet || 0
            const isDoubleWide = homeWidth > 16
            const servicePrice = isDoubleWide ? (service.double_wide_price || service.price) : (service.single_wide_price || service.price)
            
            emailContent += `<li><strong>${service.name}:</strong> $${servicePrice.toLocaleString()}</li>`
          }
        })
        emailContent += `</ul>`
      }

      // Add selected home options with proper pricing
      if (item.selectedHomeOptions && item.selectedHomeOptions.length > 0) {
        emailContent += `<h5>Selected Options:</h5><ul>`
        item.selectedHomeOptions.forEach((selectedOption: any) => {
          const option = selectedOption.option
          const quantity = selectedOption.quantity || 1
          
          // Calculate option price based on pricing type
          let optionPrice = 0
          if (option.pricing_type === 'per_sqft' && home.square_footage) {
            optionPrice = (option.price_per_sqft || 0) * home.square_footage
          } else {
            // Fixed pricing
            optionPrice = option.cost_price || 0
          }
          
          const totalOptionPrice = optionPrice * quantity
          const displayText = quantity > 1 
            ? `<strong>${option.name}</strong> (x${quantity}): $${totalOptionPrice.toLocaleString()}` 
            : `<strong>${option.name}:</strong> $${totalOptionPrice.toLocaleString()}`
          
          emailContent += `<li>${displayText}</li>`
        })
        emailContent += `</ul>`
      }

      emailContent += `</div>`
    })

    emailContent += `
<h3>Total Amount: $${total_amount.toLocaleString()}</h3>

<p>This estimate was generated from the customer's shopping cart and requires your review.</p>
<p>Please contact the customer to discuss next steps.</p>
`

    console.log('🔍 send-estimate-to-sales-rep: Sending email to:', sales_rep_email)

    // Send email to sales representative
    const { data, error } = await resend.emails.send({
      from: 'Wholesale Homes of the Carolinas <onboarding@resend.dev>',
      to: [sales_rep_email],
      subject: `New Cart Estimate Request - ${customerInfo.name}`,
      html: emailContent,
    })

    if (error) {
      console.error('🔍 send-estimate-to-sales-rep: Resend error:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('🔍 send-estimate-to-sales-rep: Email sent successfully:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Estimate sent to sales representative successfully',
        email_id: data?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('🔍 send-estimate-to-sales-rep: Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send estimate' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
