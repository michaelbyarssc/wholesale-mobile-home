
/*
 * ⚠️ CRITICAL WARNING - DO NOT MODIFY ⚠️
 * 
 * This approve-estimate function is WORKING CORRECTLY.
 * DO NOT change the estimate approval logic, database function calls,
 * or invoice creation process. These have been debugged and are stable.
 * 
 * Last fixed: 2024-07-19 - Fixed delivery status enum issue
 * If you need to modify this, create a new function instead.
 */

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
          .maybeSingle()

        if (estimateError) {
          console.error('Admin approval error:', estimateError);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Database error retrieving estimate', 
            details: estimateError 
          }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        if (!estimateData) {
          console.error('Estimate not found with ID:', estimateUuid);
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Estimate not found' 
          }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
    const { data: approvalResult, error: approvalError } = await supabase
      .rpc('approve_estimate', { estimate_uuid: estimateUuid })

    console.log('approve_estimate result:', { approvalResult, approvalError });

    if (approvalError) {
      console.error('Approval error:', approvalError)
      return new Response(JSON.stringify({ error: 'Failed to approve estimate', details: approvalError }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!approvalResult || !approvalResult.success) {
      console.error('Approval failed:', approvalResult)
      return new Response(JSON.stringify({ error: approvalResult?.error || 'Failed to approve estimate' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get the created invoice details
    console.log('Looking for invoice with ID:', approvalResult.invoice_id);
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', approvalResult.invoice_id)
      .maybeSingle()

    console.log('Invoice query result:', { invoice, invoiceError });

    if (invoiceError) {
      console.error('Invoice retrieval error:', invoiceError)
      return new Response(JSON.stringify({ 
        error: 'Invoice created but could not retrieve details', 
        details: invoiceError 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!invoice) {
      console.error('Invoice not found with ID:', approvalResult.invoice_id)
      // Return success anyway since the approval worked, just skip the email
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Estimate approved successfully (email sending skipped)',
          invoiceNumber: approvalResult.invoice_number,
          invoiceId: approvalResult.invoice_id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    // Send invoice email to customer
    try {
      await resend.emails.send({
        from: 'Wholesale Homes of the Carolinas <noreply@invoice.wholesalemobilehome.com>',
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
