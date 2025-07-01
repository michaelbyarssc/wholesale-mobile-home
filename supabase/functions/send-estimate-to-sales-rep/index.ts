
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Processing estimate request...')
    
    const requestBody = await req.json()
    console.log('Request body received:', JSON.stringify(requestBody, null, 2))

    const {
      cart_items,
      total_amount,
      sales_rep_email,
      user_id
    } = requestBody

    if (!cart_items || !Array.isArray(cart_items) || cart_items.length === 0) {
      throw new Error('No cart items provided')
    }

    if (!total_amount) {
      throw new Error('No total amount provided')
    }

    if (!sales_rep_email) {
      throw new Error('No sales rep email provided')
    }

    console.log('Processing estimate for sales rep:', {
      itemCount: cart_items.length,
      totalAmount: total_amount,
      salesRepEmail: sales_rep_email,
      userId: user_id
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get customer profile information
    let customerInfo = {
      name: 'Customer',
      email: '',
      phone: ''
    }

    if (user_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user_id)
        .single()

      if (!profileError && profile) {
        customerInfo.name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Customer'
        customerInfo.email = profile.email || ''
      }

      // Get user's phone from auth.users metadata if available
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user_id)
      if (!authError && authUser?.user?.user_metadata?.phone) {
        customerInfo.phone = authUser.user.user_metadata.phone
      }
    }

    // Fetch services and home options for detailed descriptions
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('*')

    const { data: homeOptions, error: homeOptionsError } = await supabase
      .from('home_options')
      .select('*')

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
    }
    if (homeOptionsError) {
      console.error('Error fetching home options:', homeOptionsError)
    }

    // Check if Resend API key is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const resend = new Resend(resendApiKey)

    // Format cart items for email with detailed descriptions
    let cartSummary = ''
    let cartTotal = 0
    
    for (const item of cart_items) {
      const homeName = item.mobileHome?.display_name || 
                      item.mobileHome?.model || 
                      `${item.mobileHome?.manufacturer || ''} ${item.mobileHome?.series || ''} ${item.mobileHome?.model || ''}`.trim()
      
      const homePrice = item.mobileHome?.price || item.mobileHome?.cost || 0
      cartTotal += homePrice
      
      cartSummary += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      cartSummary += `📱 MOBILE HOME: ${homeName}\n`
      cartSummary += `💰 Base Price: $${homePrice.toLocaleString()}\n`
      
      if (item.mobileHome?.description) {
        cartSummary += `📝 Description: ${item.mobileHome.description}\n`
      }
      
      if (item.mobileHome?.square_footage) {
        cartSummary += `📐 Square Footage: ${item.mobileHome.square_footage} sq ft\n`
      }
      
      if (item.mobileHome?.bedrooms && item.mobileHome?.bathrooms) {
        cartSummary += `🛏️ Layout: ${item.mobileHome.bedrooms} bed / ${item.mobileHome.bathrooms} bath\n`
      }
      
      if (item.mobileHome?.features && Array.isArray(item.mobileHome.features) && item.mobileHome.features.length > 0) {
        cartSummary += `✨ Features:\n`
        item.mobileHome.features.forEach(feature => {
          cartSummary += `   • ${feature}\n`
        })
      }
      
      // Add selected services with detailed descriptions
      if (item.selectedServices && item.selectedServices.length > 0) {
        cartSummary += `\n🔧 SELECTED SERVICES:\n`
        for (const serviceId of item.selectedServices) {
          const service = services?.find(s => s.id === serviceId)
          if (service) {
            let servicePrice = 0
            const homeWidth = item.mobileHome?.width_feet || 0
            const isDoubleWide = homeWidth > 16
            servicePrice = isDoubleWide ? (service.double_wide_price || 0) : (service.single_wide_price || 0)
            
            cartTotal += servicePrice
            cartSummary += `   • ${service.name} - $${servicePrice.toLocaleString()}\n`
            if (service.description) {
              cartSummary += `     Description: ${service.description}\n`
            }
          }
        }
      }
      
      // Add selected home options with detailed descriptions
      if (item.selectedHomeOptions && item.selectedHomeOptions.length > 0) {
        cartSummary += `\n🏠 SELECTED HOME OPTIONS:\n`
        for (const selectedOption of item.selectedHomeOptions) {
          const homeOption = homeOptions?.find(ho => ho.id === selectedOption.option.id) || selectedOption.option
          if (homeOption) {
            let optionPrice = 0
            const quantity = selectedOption.quantity || 1
            
            if (homeOption.pricing_type === 'per_sqft' && item.mobileHome?.square_footage) {
              optionPrice = (homeOption.price_per_sqft || 0) * item.mobileHome.square_footage * quantity
            } else {
              optionPrice = (homeOption.calculated_price || homeOption.cost_price || 0) * quantity
            }
            
            cartTotal += optionPrice
            cartSummary += `   • ${homeOption.name}`
            if (quantity > 1) {
              cartSummary += ` (Qty: ${quantity})`
            }
            cartSummary += ` - $${optionPrice.toLocaleString()}\n`
            
            if (homeOption.description) {
              cartSummary += `     Description: ${homeOption.description}\n`
            }
            
            if (homeOption.pricing_type === 'per_sqft') {
              cartSummary += `     Pricing: $${(homeOption.price_per_sqft || 0).toFixed(2)} per sq ft\n`
            }
          }
        }
      }
      
      cartSummary += `\n`
    }

    // Customer information section
    let customerSection = `👤 CUSTOMER INFORMATION:\n`
    customerSection += `Name: ${customerInfo.name}\n`
    if (customerInfo.email) {
      customerSection += `Email: ${customerInfo.email}\n`
    }
    if (customerInfo.phone) {
      customerSection += `Phone: ${customerInfo.phone}\n`
    }

    const emailContent = `
New Estimate Request from Customer

${customerSection}

${cartSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 TOTAL ESTIMATE: $${total_amount.toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 ACTION REQUIRED: Please contact the customer as soon as possible to discuss this estimate.

Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
    `

    console.log('Sending detailed email with customer and pricing information')

    // Send email to sales representative
    const emailResult = await resend.emails.send({
      from: 'Wholesale Homes of the Carolinas <onboarding@resend.dev>',
      to: [sales_rep_email],
      subject: `New Customer Estimate Request - ${customerInfo.name} - $${total_amount.toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">New Estimate Request from Customer</h2>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e40af; margin-top: 0;">👤 Customer Information</h3>
            <p><strong>Name:</strong> ${customerInfo.name}</p>
            ${customerInfo.email ? `<p><strong>Email:</strong> ${customerInfo.email}</p>` : ''}
            ${customerInfo.phone ? `<p><strong>Phone:</strong> ${customerInfo.phone}</p>` : ''}
          </div>

          <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <pre style="white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.5; margin: 0;">${cartSummary}</pre>
          </div>

          <div style="background-color: #059669; color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; font-size: 24px;">💰 TOTAL ESTIMATE: $${total_amount.toLocaleString()}</h3>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;"><strong>📞 ACTION REQUIRED:</strong> Please contact the customer as soon as possible to discuss this estimate.</p>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; text-align: center;">
            Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
            Wholesale Homes of the Carolinas System
          </p>
        </div>
      `,
    })

    console.log('Email sent successfully:', emailResult)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Estimate sent to sales representative successfully',
        emailId: emailResult.data?.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in send-estimate-to-sales-rep function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
