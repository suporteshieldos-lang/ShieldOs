import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type IncomingPayload = {
  company_id?: string;
  companyId?: string;
  order_id?: string;
  orderId?: string;
  customer_phone?: string;
  customerPhone?: string;
  customer_name?: string;
  customerName?: string;
  body?: string;
  message?: string;
  text?: string;
  provider_message_id?: string;
  providerMessageId?: string;
  provider?: string;
  [key: string]: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-token",
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const only = value.replace(/\D/g, "");
  return only || null;
}

function extract(payload: IncomingPayload) {
  const companyId =
    readString(payload.company_id) ||
    readString(payload.companyId);

  const phone =
    normalizePhone(readString(payload.customer_phone)) ||
    normalizePhone(readString(payload.customerPhone));

  const body =
    readString(payload.body) ||
    readString(payload.message) ||
    readString(payload.text);

  const orderId =
    readString(payload.order_id) ||
    readString(payload.orderId);

  const customerName =
    readString(payload.customer_name) ||
    readString(payload.customerName);

  const providerMessageId =
    readString(payload.provider_message_id) ||
    readString(payload.providerMessageId);

  const provider = readString(payload.provider) || "whatsapp";

  return { companyId, phone, body, orderId, customerName, providerMessageId, provider };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const secret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
    const headerToken = req.headers.get("x-webhook-token");
    const urlToken = new URL(req.url).searchParams.get("token");
    if (!secret || (headerToken !== secret && urlToken !== secret)) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json().catch(() => ({}))) as IncomingPayload;
    const parsed = extract(payload);
    if (!parsed.companyId || !parsed.phone || !parsed.body) {
      return new Response(JSON.stringify({ error: "invalid_payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.from("whatsapp_messages").insert([
      {
        company_id: parsed.companyId,
        order_id: parsed.orderId || null,
        customer_phone: parsed.phone,
        customer_name: parsed.customerName || null,
        direction: "inbound",
        body: parsed.body,
        status: "received",
        provider: parsed.provider,
        provider_message_id: parsed.providerMessageId || null,
        raw_payload: payload,
      },
    ]);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

