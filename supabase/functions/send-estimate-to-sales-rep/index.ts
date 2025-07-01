
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
      sales_rep_email
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
      salesRepEmail: sales_rep_email
    })

    // Check if Resend API key is available
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const resend = new Resend(resendApiKey)

    // Format cart items for email
    let cartSummary = 'Cart Items:\n\n'
    
    for (const item of cart_items) {
      const homeName = item.mobileHome?.display_name || 
                      item.mobileHome?.model || 
                      `${item.mobileHome?.manufacturer || ''} ${item.mobileHome?.series || ''} ${item.mobileHome?.model || ''}`.trim()
      
      cartSummary += `Mobile Home: ${homeName}\n`
      cartSummary += `Price: $${(item.mobileHome?.price || item.mobileHome?.cost || 0).toLocaleString()}\n`
      
      if (item.selectedServices && item.selectedServices.length > 0) {
        cartSummary += `Selected Services: ${item.selectedServices.length} service(s)\n`
      }
      
      if (item.selectedHomeOptions && item.selectedHomeOptions.length > 0) {
        cartSummary += `Selected Options: ${item.selectedHomeOptions.length} option(s)\n`
      }
      
      cartSummary += '\n'
    }

    const emailContent = `
New Estimate Request from Customer

${cartSummary}

Total Amount: $${total_amount.toLocaleString()}

Customer is ready to discuss this estimate. Please contact them as soon as possible.

Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
    `

    console.log('Sending email with content:', emailContent)

    // Send email to sales representative
    const emailResult = await resend.emails.send({
      from: 'Wholesale Homes of the Carolinas <onboarding@resend.dev>',
      to: [sales_rep_email],
      subject: `New Customer Estimate Request - $${total_amount.toLocaleString()}`,
      html: `
        <h2>New Estimate Request from Customer</h2>
        <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace; white-space: pre-wrap;">${emailContent}</pre>
        <p><strong>Action Required:</strong> Please contact the customer as soon as possible to discuss this estimate.</p>
        <p>Best regards,<br>Wholesale Homes of the Carolinas System</p>
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
