
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const token = url.searchParams.get('token')
    
    let estimate;
    let estimateUuid;
    
    console.log('Request method:', req.method);
    console.log('Token from URL:', token);
    
    // Check if this is a customer approval (with token) or admin approval (with estimate_uuid in body)
    if (token) {
      console.log('Processing customer approval with token');
      // Customer approval via email link
      const { data: estimateData, error: estimateError } = await supabase
        .from('estimates')
        .select('*')
        .eq('approval_token', token)
        .is('approved_at', null)
        .single()

      if (estimateError || !estimateData) {
        console.error('Customer approval error:', estimateError);
        return new Response('Invalid or expired approval token', { 
          status: 404, 
          headers: corsHeaders 
        })
      }
      estimate = estimateData;
      estimateUuid = estimate.id;
    } else {
      console.log('Processing admin approval with estimate_uuid');
      // Admin approval via API call
      try {
        const body = await req.json()
        console.log('Request body:', body);
        
        estimateUuid = body.estimate_uuid;
        
        if (!estimateUuid) {
          console.error('Missing estimate_uuid in request body');
          return new Response('Missing estimate_uuid', { 
            status: 400, 
            headers: corsHeaders 
          })
        }

        const { data: estimateData, error: estimateError } = await supabase
          .from('estimates')
          .select('*')
          .eq('id', estimateUuid)
          .is('approved_at', null)
          .single()

        if (estimateError || !estimateData) {
          console.error('Admin approval error:', estimateError);
          return new Response('Estimate not found or already approved', { 
            status: 404, 
            headers: corsHeaders 
          })
        }
        estimate = estimateData;
      } catch (jsonError) {
        console.error('Error parsing JSON:', jsonError);
        return new Response('Invalid JSON in request body', { 
          status: 400, 
          headers: corsHeaders 
        })
      }
    }

    // Add debugging to see what we're passing to the function
    console.log('About to approve estimate with ID:', estimateUuid, 'Type:', typeof estimateUuid);
    
    // Call the approve_estimate function
    const { data: invoiceId, error: approvalError } = await supabase
      .rpc('approve_estimate', { estimate_uuid: estimateUuid })

    console.log('approve_estimate result:', { invoiceId, approvalError });

    if (approvalError) {
      console.error('Approval error:', approvalError)
      return new Response(JSON.stringify({ error: 'Failed to approve estimate', details: approvalError }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get the created invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      console.error('Invoice retrieval error:', invoiceError)
      return new Response('Invoice created but could not retrieve details', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    // Send invoice email to customer
    try {
      await resend.emails.send({
        from: 'Wholesale Homes of the Carolinas <onboarding@resend.dev>',
        to: [estimate.customer_email],
        subject: `Invoice ${invoice.invoice_number} - Due on Receipt`,
        html: `
          <h2>Your Estimate Has Been Approved!</h2>
          <p>Thank you for approving your estimate. Here is your invoice:</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Invoice ${invoice.invoice_number}</h3>
            <p><strong>Customer:</strong> ${invoice.customer_name}</p>
            <p><strong>Email:</strong> ${invoice.customer_email}</p>
            <p><strong>Phone:</strong> ${invoice.customer_phone}</p>
            ${invoice.delivery_address ? `<p><strong>Delivery Address:</strong> ${invoice.delivery_address}</p>` : ''}
            <p><strong>Total Amount:</strong> $${invoice.total_amount}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> Due on Receipt</p>
          </div>
          
          <p>Please contact us to arrange payment and delivery.</p>
          <p>Best regards,<br>Wholesale Homes of the Carolinas</p>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Estimate approved successfully',
        invoiceNumber: invoice.invoice_number,
        invoiceId: invoice.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error in approve-estimate:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
