
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
    const {
      cart_items,
      total_amount,
      sales_rep_email
    } = await req.json()

    console.log('Processing estimate for sales rep:', {
      itemCount: cart_items?.length,
      totalAmount: total_amount,
      salesRepEmail: sales_rep_email
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Format cart items for email
    let cartSummary = 'Cart Items:\n\n'
    
    for (const item of cart_items) {
      const homeName = item.mobileHome.display_name || `${item.mobileHome.manufacturer} ${item.mobileHome.series} ${item.mobileHome.model}`
      cartSummary += `Mobile Home: ${homeName}\n`
      cartSummary += `Price: $${item.mobileHome.price || item.mobileHome.cost}\n`
      
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

Total Amount: $${total_amount}

Customer is ready to discuss this estimate. Please contact them as soon as possible.

Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
    `

    // Send email to sales representative
    const emailResult = await resend.emails.send({
      from: 'Wholesale Homes of the Carolinas <onboarding@resend.dev>',
      to: [sales_rep_email],
      subject: `New Customer Estimate Request - $${total_amount}`,
      html: `
        <h2>New Estimate Request from Customer</h2>
        <pre style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace;">${emailContent}</pre>
        <p><strong>Action Required:</strong> Please contact the customer as soon as possible to discuss this estimate.</p>
        <p>Best regards,<br>Wholesale Homes of the Carolinas System</p>
      `,
    })

    console.log('Email sent to sales rep:', emailResult)

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
    console.error('Error in send-estimate-to-sales-rep:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
