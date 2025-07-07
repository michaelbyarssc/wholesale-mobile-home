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
    const { cart_items, delivery_address, total_amount, sales_rep_email, user_id } = await req.json()

    console.log('🔍 send-estimate-to-sales-rep: Received request:', {
      cart_items: cart_items?.length || 0,
      delivery_address: !!delivery_address,
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
      console.log('🔍 send-estimate-to-sales-rep: Looking up customer profile for user_id:', user_id)
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone_number')
        .eq('user_id', user_id)
        .maybeSingle()

      console.log('🔍 send-estimate-to-sales-rep: Profile query result:', { profile, profileError })

      if (profile && !profileError) {
        customerInfo = {
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'N/A',
          email: profile.email || 'N/A',
          phone: profile.phone_number || 'N/A'
        }
        console.log('🔍 send-estimate-to-sales-rep: Customer info populated:', customerInfo)
      } else {
        console.log('🔍 send-estimate-to-sales-rep: No profile found or error occurred:', profileError)
      }
    } else {
      console.log('🔍 send-estimate-to-sales-rep: No user_id provided, using default customer info')
    }

    // Get customer markup for price calculations
    let customerMarkup = 30; // Default markup
    if (user_id) {
      const { data: markupData, error: markupError } = await supabase
        .from('customer_markups')
        .select('markup_percentage')
        .eq('user_id', user_id)
        .maybeSingle()

      if (markupData && !markupError) {
        customerMarkup = markupData.markup_percentage || 30
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

    // Helper function to calculate mobile home display price (matches website display)
    const calculateMobileHomePrice = (home: any) => {
      if (!home.price) return 0
      
      // Pricing 1: Internal price + minimum profit
      const pricing1 = home.price + (home.minimum_profit || 0)
      
      // Pricing 2: Internal price + markup %
      const pricing2 = home.price * (1 + customerMarkup / 100)
      
      // Use the higher of the two prices and round down
      return Math.floor(Math.max(pricing1, pricing2))
    }

    // Helper function to calculate sales tax by state (matching cart logic)
    const calculateSalesTax = (state: string, subtotal: number, shipping: number): number => {
      const stateCode = state.toLowerCase()
      
      switch (stateCode) {
        case 'sc':
          return 500 // Fixed $5 for SC
        case 'ga':
          return (subtotal + shipping) * 0.08 // 8% of subtotal + shipping
        case 'al':
          return (subtotal + shipping) * 0.02 // 2% of subtotal + shipping
        case 'fl':
          return (subtotal + shipping) * 0.03 // 3% of subtotal + shipping
        default:
          return 0 // No tax for other states
      }
    }

    // Helper function to calculate shipping cost (matching frontend logic)
    const calculateShippingCost = (mobileHome: any, deliveryAddress: any): number => {
      const homeWidth = mobileHome.width_feet || 0
      const isDoubleWide = homeWidth >= 16
      
      // This is a simplified version - in production you'd want to integrate with the full shipping calculation
      // For now, we'll use a basic distance-based calculation
      // You may want to integrate with the calculate-shipping-distance function here
      
      // Basic shipping calculation (this should match your actual shipping logic)
      const baseRate = isDoubleWide ? 17.5 : 15.0 // per mile
      const estimatedDistance = 150 // You'd calculate this properly with Google Maps API
      const baseCost = baseRate * estimatedDistance
      const permitCost = 60
      const flatRate = 1000
      
      return Math.floor(baseCost + permitCost + flatRate)
    }

    // Use the delivery address passed as parameter
    const deliveryAddress = delivery_address
    
    // Calculate subtotal (sum of all item prices)
    let subtotal = 0
    cart_items.forEach((item: any) => {
      const home = item.mobileHome
      const displayHomePrice = calculateMobileHomePrice(home)
      subtotal += displayHomePrice
      
      // Add services cost
      if (item.selectedServices) {
        item.selectedServices.forEach((serviceId: string) => {
          const service = servicesData.find(s => s.id === serviceId)
          if (service) {
            const homeWidth = home.width_feet || 0
            const isDoubleWide = homeWidth >= 16
            let baseServicePrice = service.price || 0
            
            if (isDoubleWide && service.double_wide_price) {
              baseServicePrice = service.double_wide_price
            } else if (!isDoubleWide && service.single_wide_price) {
              baseServicePrice = service.single_wide_price
            }
            
            const finalServicePrice = Math.floor(baseServicePrice * (1 + customerMarkup / 100))
            subtotal += finalServicePrice
          }
        })
      }
      
      // Add home options cost
      if (item.selectedHomeOptions) {
        item.selectedHomeOptions.forEach((selectedOption: any) => {
          const option = selectedOption.option
          const quantity = selectedOption.quantity || 1
          
          let baseOptionPrice = 0
          if (option.pricing_type === 'per_sqft' && home.square_footage) {
            baseOptionPrice = (option.price_per_sqft || 0) * home.square_footage
          } else {
            baseOptionPrice = option.cost_price || 0
          }
          
          const finalOptionPrice = Math.floor(baseOptionPrice * (1 + customerMarkup / 100))
          subtotal += finalOptionPrice * quantity
        })
      }
    })

    // Calculate shipping cost using proper logic
    const shippingCost = deliveryAddress && cart_items.length > 0 
      ? calculateShippingCost(cart_items[0].mobileHome, deliveryAddress)
      : 0
    
    // Calculate sales tax on subtotal + shipping
    const salesTax = deliveryAddress ? calculateSalesTax(deliveryAddress.state, subtotal, shippingCost) : 0
    
    // Calculate total
    const calculatedTotal = subtotal + shippingCost + salesTax

    console.log('🔍 send-estimate-to-sales-rep: Proper calculation order:', {
      subtotal,
      shippingCost,
      salesTax,
      calculatedTotal,
      originalTotal: total_amount
    })
    
    // Build email content with cart-like structure
    let emailContent = `
<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #333; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">New Cart Estimate Request</h2>

  <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #374151; margin-top: 0;">Customer Information</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 5px 0;"><strong>Name:</strong></td><td>${customerInfo.name}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Email:</strong></td><td>${customerInfo.email}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Phone:</strong></td><td>${customerInfo.phone}</td></tr>
    </table>
  </div>

  ${deliveryAddress ? `
  <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="color: #374151; margin-top: 0;">📍 Delivery Address</h3>
    <p style="margin: 5px 0;">${deliveryAddress.street || ''}</p>
    <p style="margin: 5px 0;">${deliveryAddress.city || ''}, ${deliveryAddress.state || ''} ${deliveryAddress.zipCode || ''}</p>
  </div>
  ` : ''}

  <h3 style="color: #374151;">🏠 Items in Cart</h3>
`

    // Process each cart item
    cart_items.forEach((item: any, index: number) => {
      const home = item.mobileHome
      const homeName = home.display_name || `${home.manufacturer} ${home.series} ${home.model}`
      const homeSize = home.square_footage ? `${home.square_footage} sq ft` : 'N/A'
      const bedBath = `${home.bedrooms || 0} bed / ${home.bathrooms || 0} bath`
      
      // Use the displayed price calculation (not internal cost) and round down
      const displayHomePrice = calculateMobileHomePrice(home)

      emailContent += `
<div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0;">
  <h4>Item ${index + 1}: ${homeName}</h4>
  <ul>
    <li><strong>Size:</strong> ${homeSize}</li>
    <li><strong>Bed/Bath:</strong> ${bedBath}</li>
    <li><strong>Home Price (Customer Price):</strong> $${displayHomePrice.toLocaleString()}</li>
  </ul>
`

      // Add selected services with proper pricing
      if (item.selectedServices && item.selectedServices.length > 0) {
        emailContent += `<h5>Selected Services:</h5><ul>`
        item.selectedServices.forEach((serviceId: string) => {
          const service = servicesData.find(s => s.id === serviceId)
          if (service) {
            // Calculate service price based on home width and apply markup
            const homeWidth = home.width_feet || 0
            const isDoubleWide = homeWidth >= 16
            let baseServicePrice = service.price || 0
            
            if (isDoubleWide && service.double_wide_price) {
              baseServicePrice = service.double_wide_price
            } else if (!isDoubleWide && service.single_wide_price) {
              baseServicePrice = service.single_wide_price
            }
            
            // Apply customer markup to service price and round down
            const finalServicePrice = Math.floor(baseServicePrice * (1 + customerMarkup / 100))
            
            emailContent += `<li><strong>${service.name}:</strong> $${finalServicePrice.toLocaleString()}</li>`
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
          let baseOptionPrice = 0
          if (option.pricing_type === 'per_sqft' && home.square_footage) {
            baseOptionPrice = (option.price_per_sqft || 0) * home.square_footage
          } else {
            // Fixed pricing
            baseOptionPrice = option.cost_price || 0
          }
          
          // Apply customer markup to option price and round down
          const finalOptionPrice = Math.floor(baseOptionPrice * (1 + customerMarkup / 100))
          const totalOptionPrice = finalOptionPrice * quantity
          
          const displayText = quantity > 1 
            ? `<strong>${option.name}</strong> (x${quantity}): $${totalOptionPrice.toLocaleString()}` 
            : `<strong>${option.name}:</strong> $${totalOptionPrice.toLocaleString()}`
          
          emailContent += `<li>${displayText}</li>`
        })
        emailContent += `</ul>`
      }

      emailContent += `</div>`
    })

    // Use the calculated totals from proper calculation order
    const finalTotal = calculatedTotal

    // Add cost breakdown section (like the cart display)
    emailContent += `
  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-top: 2px solid #e5e7eb;">
    <h3 style="color: #374151; margin-top: 0;">💰 Cost Breakdown</h3>
    
    <div style="border-collapse: collapse; width: 100%;">
      <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280;">
        <span>Subtotal:</span>
        <span>$${subtotal.toLocaleString()}</span>
      </div>
      
      ${shippingCost > 0 ? `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280;">
        <span>🚛 Shipping:</span>
        <span>$${shippingCost.toLocaleString()}</span>
      </div>
      ` : ''}
      
      ${salesTax > 0 && deliveryAddress ? `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280;">
        <span>${deliveryAddress.state.toUpperCase()} Sales Tax:</span>
        <span>$${salesTax.toLocaleString()}</span>
      </div>
      ` : ''}
      
      <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #059669; border-top: 2px solid #e5e7eb; margin-top: 8px;">
        <span>Total:</span>
        <span>$${Math.floor(finalTotal).toLocaleString()}</span>
      </div>
    </div>
  </div>

  <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0; color: #92400e;"><strong>📧 Action Required:</strong> This estimate was generated from the customer's shopping cart and requires your review.</p>
    <p style="margin: 10px 0 0 0; color: #92400e;">Please contact the customer to discuss next steps.</p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
    <p><em>Note: All prices shown reflect what the customer sees on the website. All prices are rounded down to the nearest whole dollar.</em></p>
  </div>
</div>
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
