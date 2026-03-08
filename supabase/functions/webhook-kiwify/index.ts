import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const KIWIFY_WEBHOOK_SECRET = Deno.env.get("KIWIFY_WEBHOOK_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function getHeaderToken(req: Request): string {
  return (
    req.headers.get("x-kiwify-token") ||
    req.headers.get("x-webhook-token") ||
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    ""
  );
}

async function hmacSha1Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type KiwifyPayload = Record<string, unknown> & {
  event?: string;
  type?: string;
  status?: string;
  email?: string;
  name?: string;
  company_name?: string;
  nome_empresa?: string;
  customer_id?: string;
  subscription_id?: string;
  customer?: {
    email?: string;
    name?: string;
    id?: string;
  };
  subscriber?: {
    email?: string;
    name?: string;
    id?: string;
  };
};

function pickEvent(payload: KiwifyPayload): string {
  return String(payload.event || payload.type || payload.status || "").toLowerCase();
}

function pickCustomer(payload: KiwifyPayload) {
  const customer = payload.customer || payload.subscriber || {};
  return {
    email: customer.email || payload.email || "",
    name: customer.name || payload.name || "Cliente",
    customerId: customer.id || payload.customer_id || payload.subscription_id || null,
    companyName: payload.company_name || payload.nome_empresa || `Empresa ${customer.name || ""}`.trim(),
  };
}

async function upsertCompanyActive(customer: ReturnType<typeof pickCustomer>) {
  const now = new Date();
  const vencimento = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  let existingCompanyId: string | null = null;

  if (customer.customerId) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("kiwify_customer_id", customer.customerId)
      .maybeSingle();
    existingCompanyId = data?.id ?? null;
  }

  if (!existingCompanyId && customer.email) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("email_principal", customer.email)
      .maybeSingle();
    existingCompanyId = data?.id ?? null;
  }

  if (existingCompanyId) {
    await supabase
      .from("companies")
      .update({
        nome_empresa: customer.companyName,
        email_principal: customer.email || null,
        plano: "elite",
        status_assinatura: "ativa",
        vencimento,
        data_expiracao: vencimento,
        kiwify_customer_id: customer.customerId,
      })
      .eq("id", existingCompanyId);
    return existingCompanyId;
  }

  const { data: inserted, error } = await supabase
    .from("companies")
    .insert({
      nome_empresa: customer.companyName,
      email_principal: customer.email || null,
      plano: "elite",
      status_assinatura: "ativa",
      vencimento,
      data_expiracao: vencimento,
      kiwify_customer_id: customer.customerId,
    })
    .select("id")
    .single();

  if (error || !inserted?.id) {
    throw new Error(error?.message || "Falha ao criar company.");
  }

  return inserted.id as string;
}

async function blockCompanyByCustomer(customer: ReturnType<typeof pickCustomer>) {
  if (customer.customerId) {
    await supabase
      .from("companies")
      .update({ status_assinatura: "bloqueada" })
      .eq("kiwify_customer_id", customer.customerId);
    return;
  }

  if (customer.email) {
    await supabase
      .from("companies")
      .update({ status_assinatura: "bloqueada" })
      .eq("email_principal", customer.email);
  }
}

async function inviteAdminIfNeeded(companyId: string, customer: ReturnType<typeof pickCustomer>) {
  if (!customer.email) return;

  const { data: users } = await supabase
    .from("users")
    .select("id")
    .eq("company_id", companyId)
    .eq("role", "admin")
    .limit(1);

  if (users && users.length > 0) return;

  await supabase.auth.admin.inviteUserByEmail(customer.email, {
    data: {
      nome: customer.name,
      company_id: companyId,
      role: "admin",
      role_base: "admin",
      role_system: "company_user",
      nome_empresa: customer.companyName,
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), { status: 405 });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Function misconfigured" }), { status: 500 });
    }

    const rawBody = await req.text();
    const url = new URL(req.url);
    const querySignature = (url.searchParams.get("signature") || "").toLowerCase();
    const headerToken = getHeaderToken(req);

    const tokenOk = !!headerToken && headerToken === KIWIFY_WEBHOOK_SECRET;
    const computedSignature = querySignature ? await hmacSha1Hex(KIWIFY_WEBHOOK_SECRET, rawBody) : "";
    const signatureOk = !!querySignature && querySignature === computedSignature.toLowerCase();

    if (!KIWIFY_WEBHOOK_SECRET || (!tokenOk && !signatureOk)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Unauthorized webhook",
          token_ok: tokenOk,
          signature_ok: signatureOk,
        }),
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody) as KiwifyPayload;
    const event = pickEvent(payload);
    const customer = pickCustomer(payload);

    const approvedEvents = [
      "payment_approved",
      "subscription_approved",
      "approved",
      "pedido_aprovado",
      "recurring_payment_approved",
    ];
    const renewedEvents = ["subscription_renewed", "renewed", "renovado", "recurring_payment_approved"];
    const blockedEvents = [
      "subscription_canceled",
      "subscription_cancelled",
      "chargeback",
      "overdue",
      "inadimplente",
      "canceled",
      "cancelled",
    ];

    if (approvedEvents.includes(event) || renewedEvents.includes(event)) {
      const companyId = await upsertCompanyActive(customer);
      await inviteAdminIfNeeded(companyId, customer);
      return new Response(JSON.stringify({ ok: true, action: "company_activated", companyId }), { status: 200 });
    }

    if (blockedEvents.includes(event)) {
      await blockCompanyByCustomer(customer);
      return new Response(JSON.stringify({ ok: true, action: "company_blocked" }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true, action: "ignored", event }), { status: 200 });
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Unexpected error" }),
      { status: 500 }
    );
  }
});
