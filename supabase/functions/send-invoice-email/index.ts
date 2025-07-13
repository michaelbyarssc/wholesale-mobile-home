import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendInvoiceEmailRequest {
  invoiceId: string;
  customerEmail: string;
  customerName: string;
}

const generateInvoiceEmailHtml = (invoice: any, estimate: any, services: any[], homeOptions: any[], shippingCost: number = 0) => {
  const businessName = "Mobile Home Sales"; // This could come from settings
  const currentDate = new Date().toLocaleDateString();
  
  // Calculate subtotals
  const mobileHomePrice = estimate?.mobile_homes?.final_customer_price || 0;
  const servicesTotal = services.reduce((sum, service) => sum + (service.final_customer_price || 0), 0);
  const optionsTotal = homeOptions.reduce((sum, option) => sum + (option.final_customer_price || 0), 0);
  const subtotal = mobileHomePrice + servicesTotal + optionsTotal;
  const grandTotal = subtotal + shippingCost;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; }
            .company-name { font-size: 28px; font-weight: bold; color: #333; margin: 0; }
            .invoice-title { font-size: 24px; color: #666; margin: 10px 0 0 0; }
            .info-section { display: flex; justify-content: space-between; margin: 30px 0; }
            .info-box { flex: 1; margin-right: 20px; }
            .info-box:last-child { margin-right: 0; }
            .info-title { font-weight: bold; color: #333; margin-bottom: 10px; font-size: 16px; }
            .info-content { color: #666; line-height: 1.6; }
            .mobile-home-section { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .mobile-home-title { font-weight: bold; color: #333; margin-bottom: 15px; font-size: 18px; }
            .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .spec-item { padding: 8px 0; border-bottom: 1px solid #e0e0e0; }
            .spec-label { font-weight: bold; color: #555; }
            .spec-value { color: #333; }
            .itemized-section { margin: 30px 0; }
            .itemized-title { font-weight: bold; color: #333; margin-bottom: 15px; font-size: 18px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
            .line-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
            .line-item:last-child { border-bottom: none; }
            .item-name { font-weight: 500; color: #333; }
            .item-description { font-size: 14px; color: #666; margin-top: 4px; }
            .item-price { font-weight: bold; color: #333; font-size: 16px; }
            .subtotal-section { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .subtotal-line { display: flex; justify-content: space-between; margin: 8px 0; }
            .subtotal-label { color: #666; }
            .subtotal-value { font-weight: bold; color: #333; }
            .total-section { background: #e8f4fd; padding: 20px; border-radius: 6px; text-align: center; margin: 30px 0; }
            .total-amount { font-size: 32px; font-weight: bold; color: #1976d2; margin: 0; }
            .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; text-transform: uppercase; }
            .status-pending { background: #fff3cd; color: #856404; }
            .status-paid { background: #d4edda; color: #155724; }
            .status-sent { background: #cce5ff; color: #004085; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; }
            .contact-info { margin-top: 15px; }
            @media (max-width: 600px) {
                .info-section { flex-direction: column; }
                .info-box { margin-right: 0; margin-bottom: 20px; }
                .specs-grid { grid-template-columns: 1fr; }
                .line-item { flex-direction: column; align-items: flex-start; }
                .item-price { margin-top: 8px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="company-name">${businessName}</h1>
                <h2 class="invoice-title">Invoice</h2>
            </div>
            
            <div class="info-section">
                <div class="info-box">
                    <div class="info-title">Invoice Details</div>
                    <div class="info-content">
                        <strong>Invoice #:</strong> ${invoice.invoice_number}<br>
                        <strong>Date:</strong> ${currentDate}<br>
                        ${invoice.due_date ? `<strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString()}<br>` : ''}
                        <strong>Status:</strong> <span class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</span>
                    </div>
                </div>
                
                <div class="info-box">
                    <div class="info-title">Bill To</div>
                    <div class="info-content">
                        <strong>${invoice.customer_name}</strong><br>
                        ${invoice.customer_email}<br>
                        ${invoice.customer_phone}<br>
                        ${invoice.delivery_address || ''}
                    </div>
                </div>
            </div>
            
            ${estimate?.mobile_homes ? `
            <div class="mobile-home-section">
                <div class="mobile-home-title">Mobile Home Details</div>
                <div class="specs-grid">
                    <div class="spec-item">
                        <div class="spec-label">Manufacturer:</div>
                        <div class="spec-value">${estimate.mobile_homes.manufacturer || 'N/A'}</div>
                    </div>
                    <div class="spec-item">
                        <div class="spec-label">Model:</div>
                        <div class="spec-value">${estimate.mobile_homes.model || 'N/A'}</div>
                    </div>
                    <div class="spec-item">
                        <div class="spec-label">Series:</div>
                        <div class="spec-value">${estimate.mobile_homes.series || 'N/A'}</div>
                    </div>
                    <div class="spec-item">
                        <div class="spec-label">Dimensions:</div>
                        <div class="spec-value">${estimate.mobile_homes.width_feet || 'N/A'} x ${estimate.mobile_homes.length_feet || 'N/A'} ft</div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <div class="itemized-section">
                <div class="itemized-title">Itemized Charges</div>
                
                ${estimate?.mobile_homes ? `
                <div class="line-item">
                    <div>
                        <div class="item-name">${estimate.mobile_homes.manufacturer} ${estimate.mobile_homes.model}</div>
                        <div class="item-description">${estimate.mobile_homes.series ? `${estimate.mobile_homes.series} Series - ` : ''}${estimate.mobile_homes.width_feet}' x ${estimate.mobile_homes.length_feet}' Mobile Home</div>
                    </div>
                    <div class="item-price">$${mobileHomePrice.toLocaleString()}</div>
                </div>
                ` : ''}
                
                ${services.length > 0 ? services.map(service => `
                <div class="line-item">
                    <div>
                        <div class="item-name">${service.name}</div>
                        ${service.description ? `<div class="item-description">${service.description}</div>` : ''}
                    </div>
                    <div class="item-price">$${(service.final_customer_price || 0).toLocaleString()}</div>
                </div>
                `).join('') : ''}
                
                ${homeOptions.length > 0 ? homeOptions.map(option => `
                <div class="line-item">
                    <div>
                        <div class="item-name">${option.name}</div>
                        ${option.description ? `<div class="item-description">${option.description}</div>` : ''}
                    </div>
                    <div class="item-price">$${(option.final_customer_price || 0).toLocaleString()}</div>
                </div>
                `).join('') : ''}
                
                ${shippingCost > 0 ? `
                <div class="line-item">
                    <div>
                        <div class="item-name">Shipping & Delivery</div>
                        <div class="item-description">Transportation and setup costs</div>
                    </div>
                    <div class="item-price">$${shippingCost.toLocaleString()}</div>
                </div>
                ` : ''}
            </div>
            
            <div class="subtotal-section">
                <div class="subtotal-line">
                    <span class="subtotal-label">Subtotal:</span>
                    <span class="subtotal-value">$${subtotal.toLocaleString()}</span>
                </div>
                ${shippingCost > 0 ? `
                <div class="subtotal-line">
                    <span class="subtotal-label">Shipping & Delivery:</span>
                    <span class="subtotal-value">$${shippingCost.toLocaleString()}</span>
                </div>
                ` : ''}
                <div class="subtotal-line" style="border-top: 2px solid #ddd; padding-top: 8px; margin-top: 8px;">
                    <span class="subtotal-label" style="font-weight: bold; color: #333;">Total:</span>
                    <span class="subtotal-value" style="font-size: 18px; color: #1976d2;">$${invoice.total_amount.toLocaleString()}</span>
                </div>
                ${invoice.balance_due > 0 ? `
                <div class="subtotal-line">
                    <span class="subtotal-label" style="color: #d32f2f;">Balance Due:</span>
                    <span class="subtotal-value" style="color: #d32f2f;">$${invoice.balance_due.toLocaleString()}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="total-section">
                <h3 style="margin: 0 0 10px 0; color: #333;">Total Amount</h3>
                <div class="total-amount">$${invoice.total_amount.toLocaleString()}</div>
            </div>
            
            <div class="footer">
                <p>Thank you for your business!</p>
                <div class="contact-info">
                    <p>If you have any questions about this invoice, please contact us.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoiceId, customerEmail, customerName }: SendInvoiceEmailRequest = await req.json();

    console.log('Sending invoice email for invoice:', invoiceId);

    // Fetch invoice details with related data
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select(`
        *,
        estimates!invoices_estimate_id_fkey (
          *,
          mobile_homes (
            manufacturer,
            model,
            series,
            width_feet,
            length_feet,
            final_customer_price
          )
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      console.error('Error fetching invoice:', invoiceError);
      throw new Error(`Database error: ${invoiceError.message}`);
    }

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Fetch detailed services and home options
    let services: any[] = [];
    let homeOptions: any[] = [];
    let shippingCost = 0;

    if (invoice.selected_services && invoice.selected_services.length > 0) {
      const { data: servicesData } = await supabaseClient
        .from('services')
        .select('*')
        .in('id', invoice.selected_services);
      services = servicesData || [];
    }

    if (invoice.selected_home_options && Array.isArray(invoice.selected_home_options) && invoice.selected_home_options.length > 0) {
      const optionIds = invoice.selected_home_options.map((opt: any) => opt.id).filter(Boolean);
      if (optionIds.length > 0) {
        const { data: optionsData } = await supabaseClient
          .from('home_options')
          .select('*')
          .in('id', optionIds);
        homeOptions = optionsData || [];
      }
    }

    // Calculate shipping cost from the estimate if available
    if (invoice.estimates?.mobile_homes && invoice.delivery_address) {
      // For now, we'll extract shipping from the total - (home + services + options)
      const mobileHomePrice = invoice.estimates.mobile_homes.final_customer_price || 0;
      const servicesTotal = services.reduce((sum, service) => sum + (service.final_customer_price || 0), 0);
      const optionsTotal = homeOptions.reduce((sum, option) => sum + (option.final_customer_price || 0), 0);
      const itemsTotal = mobileHomePrice + servicesTotal + optionsTotal;
      shippingCost = Math.max(0, invoice.total_amount - itemsTotal);
    }

    const htmlContent = generateInvoiceEmailHtml(invoice, invoice.estimates, services, homeOptions, shippingCost);

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Mobile Home Sales <onboarding@resend.dev>', // Use Resend's verified domain
        to: [customerEmail],
        subject: `Invoice ${invoice.invoice_number} from Mobile Home Sales`,
        html: htmlContent,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('Resend API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    console.log('Email sent successfully:', emailData.id);

    // Update invoice status to 'sent' if it was 'draft'
    if (invoice.status === 'draft') {
      await supabaseClient
        .from('invoices')
        .update({ 
          status: 'sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailData.id,
        message: `Invoice sent successfully to ${customerEmail}`,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in send-invoice-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});