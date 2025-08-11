import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AutomationEvent = {
  id: string;
  event_name: string;
  entity_type: string;
  entity_id: string;
  user_id: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payload: Record<string, unknown>;
  occurred_at: string;
  processed: boolean;
  processed_at: string | null;
  error: string | null;
};

type ProcessResult = {
  id: string;
  event_name: string;
  smsSent: boolean;
  emailSent: boolean;
  error?: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(resendApiKey);

// Helper: resolve email "from" using business settings, fallback if missing
async function getBusinessFrom() {
  const { data } = await supabaseAdmin
    .from("admin_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["business_name", "business_email"]);

  const businessName =
    data?.find((s: any) => s.setting_key === "business_name")?.setting_value ||
    "Wholesale Mobile Home";
  const businessEmail =
    data?.find((s: any) => s.setting_key === "business_email")?.setting_value ||
    "noreply@invoice.wholesalemobilehome.com";

  return { businessName, businessEmail };
}

// Helper: Compose message templates by event type
function composeTemplates(ev: AutomationEvent, extraData?: any) {
  const txNum =
    (ev.payload?.["transaction_number"] as string) ??
    (extraData?.transaction_number as string) ??
    "";
  const invoiceNum =
    (ev.payload?.["invoice_number"] as string) ??
    (extraData?.invoice_number as string) ??
    "";
  const customerName =
    (ev.payload?.["customer_name"] as string) ??
    (extraData?.customer_name as string) ??
    "Customer";

  const amount =
    (ev.payload?.["amount"] as number) ??
    (ev.payload?.["total_amount"] as number) ??
    (extraData?.amount as number);

  const deliveryStatus =
    (ev.payload?.["status"] as string) ??
    (extraData?.status as string) ??
    "";

  const eventName = ev.event_name;

  let sms = "";
  let subject = "";
  let html = "";

  const baseIntro = `Hello ${customerName},`;

  switch (eventName) {
    case "estimate_sent":
      subject = `Your Estimate ${txNum}`;
      sms = `Your estimate ${txNum} has been created and sent. Please review and let us know if you have questions.`;
      html = `
        <p>${baseIntro}</p>
        <p>Your estimate <strong>${txNum}</strong> has been created and sent.</p>
        <p>Please review it and let us know if you have any questions.</p>
      `;
      break;

    case "estimate_approved":
      subject = `Estimate Approved - ${txNum}`;
      sms = `Great news! Your estimate ${txNum} has been approved. We'll generate your invoice shortly.`;
      html = `
        <p>${baseIntro}</p>
        <p>Great news! Your estimate <strong>${txNum}</strong> has been approved.</p>
        <p>We'll generate your invoice and follow up with next steps.</p>
      `;
      break;

    case "invoice_created":
      subject = invoiceNum
        ? `Invoice Created - ${invoiceNum}`
        : `Invoice Created - ${txNum}`;
      sms = invoiceNum
        ? `Your invoice ${invoiceNum} has been created.`
        : `Your invoice for ${txNum} has been created.`;
      html = `
        <p>${baseIntro}</p>
        <p>Your invoice <strong>${invoiceNum || txNum}</strong> has been created.</p>
        <p>You can review it in your customer portal.</p>
      `;
      break;

    case "payment_made":
      subject = `Payment Received - ${txNum}`;
      sms = amount
        ? `Payment of $${Number(amount).toFixed(2)} received for ${txNum}. Thank you!`
        : `Payment received for ${txNum}. Thank you!`;
      html = `
        <p>${baseIntro}</p>
        <p>Thank you for your payment${
          amount ? ` of <strong>$${Number(amount).toFixed(2)}</strong>` : ""
        } for <strong>${txNum}</strong>.</p>
      `;
      break;

    case "delivery_scheduled":
      subject = `Delivery Scheduled - ${txNum}`;
      sms = `Your delivery for ${txNum} has been scheduled. We'll keep you updated.`;
      html = `
        <p>${baseIntro}</p>
        <p>Your delivery for <strong>${txNum}</strong> has been scheduled.</p>
        <p>We'll keep you updated as your home is on the move.</p>
      `;
      break;

    case "delivery_in_progress":
      subject = `Delivery In Progress - ${txNum}`;
      sms = `Your home delivery for ${txNum} is in progress.${deliveryStatus ? " Status: " + deliveryStatus : ""}`;
      html = `
        <p>${baseIntro}</p>
        <p>Your home delivery for <strong>${txNum}</strong> is in progress.</p>
        ${
          deliveryStatus
            ? `<p>Current status: <strong>${deliveryStatus}</strong></p>`
            : ""
        }
      `;
      break;

    case "delivery_arrived":
      subject = `Delivery Arrived - ${txNum}`;
      sms = `Your delivery for ${txNum} has arrived on site.`;
      html = `
        <p>${baseIntro}</p>
        <p>Your delivery for <strong>${txNum}</strong> has arrived on site.</p>
      `;
      break;

    case "delivery_finished":
      subject = `Delivery Completed - ${txNum}`;
      sms = `Delivery for ${txNum} has been completed. We appreciate your business!`;
      html = `
        <p>${baseIntro}</p>
        <p>Your delivery for <strong>${txNum}</strong> has been completed.</p>
        <p>We appreciate your business!</p>
      `;
      break;

    case "home_ready_for_delivery":
      subject = `Home Ready to Schedule Delivery`;
      sms = `Your home is ready to be scheduled for delivery. We'll reach out to coordinate times.`;
      html = `
        <p>${baseIntro}</p>
        <p>Your home is ready to be scheduled for delivery.</p>
        <p>We'll reach out to coordinate the best time for you.</p>
      `;
      break;

    case "transaction_completed":
      subject = `Transaction Completed - ${txNum}`;
      sms = `Your transaction ${txNum} is complete. Thank you!`;
      html = `
        <p>${baseIntro}</p>
        <p>Your transaction <strong>${txNum}</strong> is complete. Thank you!</p>
      `;
      break;

    default:
      subject = `Update - ${txNum || "Your Order"}`;
      sms = `There is an update regarding your order ${txNum}.`;
      html = `
        <p>${baseIntro}</p>
        <p>There is an update regarding your order <strong>${txNum || ""}</strong>.</p>
      `;
      break;
  }

  // Basic HTML wrapper
  const wrappedHtml = `
    <!doctype html>
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family: Arial, sans-serif; color: #222;">
        ${html}
        <hr />
        <p style="font-size:12px;color:#666;">You received this email because of a recent activity on your order/transaction.</p>
      </body>
    </html>
  `;

  return { subject, sms, html: wrappedHtml };
}

async function sendSms(to: string, message: string, delivery_id?: string) {
  // Call existing send-sms-notification function
  const { data, error } = await supabaseAdmin.functions.invoke("send-sms-notification", {
    body: {
      to,
      message,
      delivery_id,
    },
  });

  if (error) {
    throw new Error(`SMS function error: ${error.message || JSON.stringify(error)}`);
  }
  return data;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!resendApiKey) throw new Error("RESEND_API_KEY is not configured");
  const { businessName, businessEmail } = await getBusinessFrom();

  const emailResponse = await resend.emails.send({
    from: `${businessName} <${businessEmail}>`,
    to: [to],
    subject,
    html,
  });

  if ((emailResponse as any)?.error) {
    throw new Error(`Resend error: ${JSON.stringify((emailResponse as any).error)}`);
  }

  return emailResponse.data;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { max = 50, dryRun = false, eventId, onlyNames, onlyEntities } = await req.json().catch(() => ({}));

    // Basic auth: function likely has verify_jwt enabled; the SDK caller will pass JWT automatically.
    // We additionally accept service key internal calls, but no extra checks here to keep it simple.

    // Select events to process
    let query = supabaseAdmin
      .from("automation_events")
      .select("*")
      .order("occurred_at", { ascending: true })
      .limit(max);

    if (eventId) {
      query = supabaseAdmin.from("automation_events").select("*").eq("id", eventId).limit(1);
    } else {
      query = query.eq("processed", false);
      if (Array.isArray(onlyNames) && onlyNames.length > 0) {
        query = query.in("event_name", onlyNames);
      }
      if (Array.isArray(onlyEntities) && onlyEntities.length > 0) {
        // onlyEntities = [{entity_type, entity_id?}] would be more complex; keep simple for now.
      }
    }

    const { data: events, error: fetchError } = await query;
    if (fetchError) {
      throw new Error(`Failed to fetch automation events: ${fetchError.message}`);
    }

    const results: ProcessResult[] = [];

    for (const ev of (events || []) as AutomationEvent[]) {
      let smsSent = false;
      let emailSent = false;
      let err: string | undefined;

      try {
        // Hydrate optional extras based on entity type if needed
        let extraData: any = {};

        if (ev.entity_type === "transaction") {
          const { data: tx } = await supabaseAdmin
            .from("transactions")
            .select("transaction_number, customer_name, customer_email, customer_phone, balance_due, total_amount")
            .eq("id", ev.entity_id)
            .maybeSingle();
          extraData = tx || {};
        } else if (ev.entity_type === "invoice") {
          const { data: inv } = await supabaseAdmin
            .from("invoices")
            .select("invoice_number, customer_name, customer_email, customer_phone, total_amount")
            .eq("id", ev.entity_id)
            .maybeSingle();
          extraData = inv || {};
        } else if (ev.entity_type === "delivery") {
          const { data: del } = await supabaseAdmin
            .from("deliveries")
            .select("id, transaction_number, customer_name, customer_email, customer_phone")
            .eq("id", ev.entity_id)
            .maybeSingle();
          extraData = del || {};
        }

        // Build templates
        const { subject, sms, html } = composeTemplates(ev, extraData);

        // SMS
        if (!dryRun && (ev.customer_phone || extraData.customer_phone)) {
          const to = (ev.customer_phone || extraData.customer_phone) as string;
          if (to) {
            try {
              await sendSms(to, sms, ev.entity_type === "delivery" ? ev.entity_id : undefined);
              smsSent = true;
            } catch (smsErr) {
              console.error("SMS send error:", smsErr);
              // keep processing email even if SMS fails
            }
          }
        }

        // Email
        if (!dryRun && (ev.customer_email || extraData.customer_email)) {
          const toEmail = (ev.customer_email || extraData.customer_email) as string;
          if (toEmail) {
            try {
              await sendEmail(toEmail, subject, html);
              emailSent = true;
            } catch (emailErr) {
              console.error("Email send error:", emailErr);
            }
          }
        }

        // Mark processed
        if (!dryRun) {
          await supabaseAdmin
            .from("automation_events")
            .update({
              processed: true,
              processed_at: new Date().toISOString(),
              error: null,
            })
            .eq("id", ev.id);
        }
      } catch (e: any) {
        const msg = e?.message || String(e);
        err = msg;
        console.error("Automation event processing error:", ev.id, msg);

        // Persist error on the event record (don't mark as processed)
        if (!dryRun) {
          await supabaseAdmin
            .from("automation_events")
            .update({
              error: msg,
            })
            .eq("id", ev.id);
        }
      }

      results.push({
        id: ev.id,
        event_name: ev.event_name,
        smsSent,
        emailSent,
        error: err,
      });
    }

    const processedCount = results.filter((r) => !r.error).length;

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        total: results.length,
        dryRun,
        results,
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 },
    );
  } catch (error: any) {
    console.error("automation-processor error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Unknown error" }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 500,
    });
  }
});
