import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuickBooksInvoice {
  Line: Array<{
    Amount: number;
    DetailType: string;
    SalesItemLineDetail: {
      ItemRef: { value: string; name: string };
      UnitPrice: number;
      Qty: number;
    };
  }>;
  CustomerRef: { value: string; name: string };
  DueDate: string;
  TotalAmt: number;
  DocNumber: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoiceId, action } = await req.json();
    
    const quickbooksClientId = Deno.env.get('QUICKBOOKS_CLIENT_ID');
    const quickbooksClientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET');
    const quickbooksAccessToken = Deno.env.get('QUICKBOOKS_ACCESS_TOKEN');
    const quickbooksRealmId = Deno.env.get('QUICKBOOKS_REALM_ID');
    const quickbooksBaseUrl = Deno.env.get('QUICKBOOKS_BASE_URL') || 'https://sandbox-quickbooks.api.intuit.com';

    if (!quickbooksAccessToken || !quickbooksRealmId) {
      return new Response(
        JSON.stringify({ error: 'QuickBooks not configured. Please set up OAuth connection.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync') {
      // Get invoice details
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          invoice_line_items (
            quantity,
            unit_price,
            total_amount,
            description,
            mobile_homes (manufacturer, model)
          )
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError || !invoice) {
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create QuickBooks customer if needed
      let customerId = '1'; // Default customer
      
      // Try to find existing customer
      const customerResponse = await fetch(
        `${quickbooksBaseUrl}/v3/company/${quickbooksRealmId}/query?query=SELECT * FROM Customer WHERE Name = '${invoice.customer_name}'`,
        {
          headers: {
            'Authorization': `Bearer ${quickbooksAccessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      if (customerResponse.ok) {
        const customerData = await customerResponse.json();
        if (customerData.QueryResponse?.Customer?.length > 0) {
          customerId = customerData.QueryResponse.Customer[0].Id;
        } else {
          // Create new customer
          const newCustomer = {
            Name: invoice.customer_name,
            CompanyName: invoice.customer_name,
            BillAddr: {
              Line1: invoice.delivery_address || '',
            },
            PrimaryEmailAddr: {
              Address: invoice.customer_email,
            },
            PrimaryPhone: {
              FreeFormNumber: invoice.customer_phone || '',
            },
          };

          const createCustomerResponse = await fetch(
            `${quickbooksBaseUrl}/v3/company/${quickbooksRealmId}/customer`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${quickbooksAccessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(newCustomer),
            }
          );

          if (createCustomerResponse.ok) {
            const newCustomerData = await createCustomerResponse.json();
            customerId = newCustomerData.Customer.Id;
          }
        }
      }

      // Create QuickBooks invoice
      const qbInvoice: QuickBooksInvoice = {
        Line: invoice.invoice_line_items.map((item: any, index: number) => ({
          Amount: item.total_amount,
          DetailType: 'SalesItemLineDetail',
          SalesItemLineDetail: {
            ItemRef: { value: '1', name: item.description || 'Mobile Home' },
            UnitPrice: item.unit_price,
            Qty: item.quantity,
          },
        })),
        CustomerRef: { value: customerId, name: invoice.customer_name },
        DueDate: invoice.due_date,
        TotalAmt: invoice.total_amount,
        DocNumber: invoice.invoice_number,
      };

      const createInvoiceResponse = await fetch(
        `${quickbooksBaseUrl}/v3/company/${quickbooksRealmId}/invoice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${quickbooksAccessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(qbInvoice),
        }
      );

      if (!createInvoiceResponse.ok) {
        const errorText = await createInvoiceResponse.text();
        console.error('QuickBooks API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to sync with QuickBooks', details: errorText }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const qbInvoiceData = await createInvoiceResponse.json();
      const qbInvoiceId = qbInvoiceData.Invoice.Id;

      // Update invoice with QuickBooks ID
      await supabase
        .from('invoices')
        .update({ 
          quickbooks_id: qbInvoiceId,
          quickbooks_synced_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          quickbooks_id: qbInvoiceId,
          message: 'Invoice synced to QuickBooks successfully' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in quickbooks-sync function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});