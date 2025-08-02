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
    const { cart_items, delivery_address, total_amount, shipping_cost, sales_tax, sales_rep_email, user_id, customer_info } = await req.json()

    console.log('🔍 send-estimate-to-sales-rep: Received request:', {
      cart_items: cart_items?.length || 0,
      delivery_address: !!delivery_address,
      total_amount,
      shipping_cost,
      sales_tax,
      sales_rep_email,
      user_id,
      customer_info
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
    
    // First, try to use customer_info passed from the frontend (for anonymous users)
    if (customer_info && (customer_info.name || customer_info.email || customer_info.phone)) {
      customerInfo = {
        name: customer_info.name || 'N/A',
        email: customer_info.email || 'N/A',
        phone: customer_info.phone || 'N/A'
      }
      console.log('🔍 send-estimate-to-sales-rep: Using customer info from form:', customerInfo)
    } else if (user_id) {
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
        console.log('🔍 send-estimate-to-sales-rep: Customer info populated from profile:', customerInfo)
      } else {
        console.log('🔍 send-estimate-to-sales-rep: No profile found or error occurred:', profileError)
      }
    } else {
      console.log('🔍 send-estimate-to-sales-rep: No user_id or customer_info provided, using default customer info')
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

    // Use the actual shipping cost passed from the cart instead of recalculating
    const actualShippingCost = shipping_cost || 0
    
    // Use the actual sales tax passed from the cart instead of recalculating  
    const actualSalesTax = sales_tax || 0
    
    // Calculate total using actual values from cart
    const calculatedTotal = subtotal + actualShippingCost + actualSalesTax

    console.log('🔍 send-estimate-to-sales-rep: Using actual cart values:', {
      subtotal,
      actualShippingCost,
      actualSalesTax,
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
      
      ${actualShippingCost > 0 ? `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280;">
        <span>🚛 Shipping:</span>
        <span>$${actualShippingCost.toLocaleString()}</span>
      </div>
      ` : ''}
      
      ${actualSalesTax > 0 && deliveryAddress ? `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; color: #6b7280;">
        <span>${deliveryAddress.state.toUpperCase()} Sales Tax:</span>
        <span>$${actualSalesTax.toLocaleString()}</span>
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

    // Get the user's assigned admin (account owner)
    let assignedAdminId = null
    if (user_id) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('assigned_admin_id')
        .eq('user_id', user_id)
        .maybeSingle()

      if (profileData && !profileError) {
        assignedAdminId = profileData.assigned_admin_id
        console.log('🔍 send-estimate-to-sales-rep: Found assigned admin:', assignedAdminId)
      } else {
        console.log('🔍 send-estimate-to-sales-rep: No assigned admin found for user')
      }
    }

    // Send SMS notification to assigned admin if configured
    if (assignedAdminId) {
      try {
        // Check if admin has SMS notifications enabled
        const { data: notificationPrefs, error: prefsError } = await supabase
          .from('notification_preferences')
          .select('sms_enabled, phone_number')
          .eq('user_id', assignedAdminId)
          .maybeSingle()

        if (notificationPrefs && !prefsError && notificationPrefs.sms_enabled && notificationPrefs.phone_number) {
          // Get SMS template from admin settings
          const { data: smsSettings, error: smsError } = await supabase
            .from('admin_settings')
            .select('setting_value')
            .eq('setting_key', 'sms_template_estimate_request')
            .maybeSingle()

          let smsMessage = `New estimate request from ${customerInfo.name} for $${Math.floor(finalTotal).toLocaleString()}. Mobile: ${customerInfo.phone}`
          
          if (smsSettings && !smsError && smsSettings.setting_value) {
            // Replace template variables
            smsMessage = smsSettings.setting_value
              .replace('{{customer_name}}', customerInfo.name)
              .replace('{{mobile_home_model}}', cart_items[0]?.mobileHome?.model || 'N/A')
              .replace('{{total_amount}}', `$${Math.floor(finalTotal).toLocaleString()}`)
              .replace('{{customer_phone}}', customerInfo.phone)
          }

          console.log('🔍 send-estimate-to-sales-rep: Sending SMS to admin phone:', notificationPrefs.phone_number)

          // Send SMS notification
          const { data: smsData, error: smsError2 } = await supabase.functions.invoke('send-sms-notification', {
            body: {
              to: notificationPrefs.phone_number,
              message: smsMessage
            }
          })

          if (smsError2) {
            console.error('🔍 send-estimate-to-sales-rep: SMS notification failed:', smsError2)
            // Don't fail the entire process if SMS fails
          } else {
            console.log('🔍 send-estimate-to-sales-rep: SMS notification sent successfully:', smsData)
          }
        } else {
          console.log('🔍 send-estimate-to-sales-rep: Admin SMS not enabled or phone number missing')
        }
      } catch (smsError) {
        console.error('🔍 send-estimate-to-sales-rep: Error sending SMS notification:', smsError)
        // Don't fail the entire process if SMS fails
      }
    }

    // Create estimate record in database
    const estimateData = {
      customer_name: customerInfo.name,
      customer_email: customerInfo.email,
      customer_phone: customerInfo.phone,
      delivery_address: deliveryAddress ? 
        `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}` : 
        null,
      mobile_home_id: cart_items[0]?.mobileHome?.id || null,
      selected_services: allServiceIds,
      selected_home_options: cart_items.reduce((acc: any[], item: any) => {
        return [...acc, ...(item.selectedHomeOptions || []).map((ho: any) => ({
          option_id: ho.option.id,
          quantity: ho.quantity || 1
        }))]
      }, []),
      total_amount: Math.floor(calculatedTotal),
      status: 'pending_review',
      user_id: user_id
    }

    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .insert(estimateData)
      .select()
      .single()

    if (estimateError) {
      console.error('🔍 send-estimate-to-sales-rep: Error creating estimate:', estimateError)
      throw new Error(`Failed to create estimate: ${estimateError.message}`)
    }

    console.log('🔍 send-estimate-to-sales-rep: Estimate created successfully:', estimate.id)

    console.log('🔍 send-estimate-to-sales-rep: Estimate created successfully with transaction number:', estimate.transaction_number)

    // Create detailed line items for the estimate
    const lineItems = []
    let displayOrder = 1

    // Process each cart item to create line items
    cart_items.forEach((item: any) => {
      const home = item.mobileHome
      const displayHomePrice = calculateMobileHomePrice(home)

      // Add mobile home as line item
      lineItems.push({
        estimate_id: estimate.id,
        item_type: 'mobile_home',
        item_id: home.id,
        name: home.display_name || `${home.manufacturer} ${home.series} ${home.model}`,
        description: `${home.width_feet}'x${home.length_feet}' mobile home, ${home.bedrooms} bed/${home.bathrooms} bath, ${home.square_footage} sq ft`,
        quantity: 1,
        unit_price: displayHomePrice,
        total_price: displayHomePrice,
        category: 'Mobile Home',
        display_order: displayOrder++,
        metadata: {
          internal_price: home.price,
          width: home.width_feet,
          length: home.length_feet,
          bedrooms: home.bedrooms,
          bathrooms: home.bathrooms,
          square_footage: home.square_footage,
          year: home.year,
          manufacturer: home.manufacturer,
          series: home.series,
          model: home.model
        }
      })

      // Add selected services as line items
      if (item.selectedServices && item.selectedServices.length > 0) {
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
            
            lineItems.push({
              estimate_id: estimate.id,
              item_type: 'service',
              item_id: service.id,
              name: service.name,
              description: service.description || '',
              quantity: 1,
              unit_price: finalServicePrice,
              total_price: finalServicePrice,
              category: 'Services',
              display_order: displayOrder++,
              metadata: {
                internal_price: baseServicePrice,
                service_type: service.service_type,
                delivery_required: service.delivery_required,
                customer_markup: customerMarkup,
                is_double_wide: isDoubleWide
              }
            })
          }
        })
      }

      // Add selected home options as line items
      if (item.selectedHomeOptions && item.selectedHomeOptions.length > 0) {
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
          const totalOptionPrice = finalOptionPrice * quantity
          
          lineItems.push({
            estimate_id: estimate.id,
            item_type: 'option',
            item_id: option.id,
            name: option.name,
            description: option.description || '',
            quantity: quantity,
            unit_price: finalOptionPrice,
            total_price: totalOptionPrice,
            category: option.category || 'Options',
            display_order: displayOrder++,
            metadata: {
              internal_price: option.cost_price,
              pricing_type: option.pricing_type,
              price_per_sqft: option.price_per_sqft,
              option_type: option.option_type,
              installation_required: option.installation_required,
              customer_markup: customerMarkup
            }
          })
        })
      }
    })

    // Add shipping as line item if applicable
    if (actualShippingCost > 0) {
      lineItems.push({
        estimate_id: estimate.id,
        item_type: 'shipping',
        item_id: null,
        name: 'Shipping & Delivery',
        description: deliveryAddress ? `Delivery to ${deliveryAddress.city}, ${deliveryAddress.state}` : 'Shipping & Delivery',
        quantity: 1,
        unit_price: actualShippingCost,
        total_price: actualShippingCost,
        category: 'Shipping',
        display_order: displayOrder++,
        metadata: {
          delivery_address: deliveryAddress
        }
      })
    }

    // Add sales tax as line item if applicable
    if (actualSalesTax > 0) {
      lineItems.push({
        estimate_id: estimate.id,
        item_type: 'tax',
        item_id: null,
        name: `${deliveryAddress?.state?.toUpperCase()} Sales Tax`,
        description: `Sales tax for ${deliveryAddress?.state?.toUpperCase()}`,
        quantity: 1,
        unit_price: actualSalesTax,
        total_price: actualSalesTax,
        category: 'Tax',
        display_order: displayOrder++,
        metadata: {
          tax_rate: deliveryAddress?.state,
          subtotal: subtotal,
          shipping: actualShippingCost
        }
      })
    }

    // Insert all line items
    if (lineItems.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('estimate_line_items')
        .insert(lineItems)

      if (lineItemsError) {
        console.error('🔍 send-estimate-to-sales-rep: Error creating estimate line items:', lineItemsError)
        // Continue execution - line items are supplementary but log the error
      } else {
        console.log('🔍 send-estimate-to-sales-rep: Created', lineItems.length, 'line items for estimate')
      }
    }

    // Send notifications to the account owner (assigned admin)
    if (assignedAdminId) {
      try {
        // Send in-app notification
        await supabase.rpc('create_notification', {
          p_user_id: assignedAdminId,
          p_title: 'New Estimate Request',
          p_message: `${customerInfo.name} has submitted a new estimate request for review. Total: $${Math.floor(calculatedTotal).toLocaleString()}`,
          p_type: 'estimate_request',
          p_category: 'sales',
          p_data: {
            estimate_id: estimate.id,
            customer_name: customerInfo.name,
            total_amount: Math.floor(calculatedTotal)
          }
        })

        // Send email notification to admin
        const { error: emailNotifyError } = await supabase.functions.invoke('send-email-notification', {
          body: {
            recipient_id: assignedAdminId,
            subject: `New Estimate Request - ${customerInfo.name}`,
            message: `A new estimate request has been submitted by ${customerInfo.name} for $${Math.floor(calculatedTotal).toLocaleString()}.`,
            type: 'estimate_request'
          }
        })

        if (emailNotifyError) {
          console.error('🔍 send-estimate-to-sales-rep: Error sending email notification:', emailNotifyError)
        }

        // Send push notification
        const { error: pushNotifyError } = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: assignedAdminId,
            title: 'New Estimate Request',
            body: `${customerInfo.name} submitted an estimate request for $${Math.floor(calculatedTotal).toLocaleString()}`,
            data: {
              type: 'estimate_request',
              estimate_id: estimate.id
            }
          }
        })

        if (pushNotifyError) {
          console.error('🔍 send-estimate-to-sales-rep: Error sending push notification:', pushNotifyError)
        }

        console.log('🔍 send-estimate-to-sales-rep: Notifications sent to admin:', assignedAdminId)
      } catch (notificationError) {
        console.error('🔍 send-estimate-to-sales-rep: Error sending notifications:', notificationError)
        // Don't fail the entire request if notifications fail
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Estimate created and sent for review successfully',
        estimate_id: estimate.id,
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
