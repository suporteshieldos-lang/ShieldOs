// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type RoleInput = "admin" | "atendente" | "tecnico";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function parseJwtSub(authorizationHeader: string): string | null {
  try {
    const token = authorizationHeader.replace(/^Bearer\s+/i, "").trim();
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = atob(padded);
    const payload = JSON.parse(payloadJson) as { sub?: string };
    return payload?.sub || null;
  } catch {
    return null;
  }
}

function randomPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const random = crypto.getRandomValues(new Uint32Array(length));
  for (let i = 0; i < length; i += 1) {
    out += chars[random[i] % chars.length];
  }
  return out;
}

function sanitizeLogin(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return json({ ok: true }, 200);
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Function misconfigured: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const gatewayUser = req.headers.get("x-supabase-auth-user") || req.headers.get("x-auth-user-id");
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const callerId = gatewayUser || parseJwtSub(authHeader);
    if (!callerId) return json({ error: "Missing bearer token" }, 401);

    const { data: callerProfile, error: callerProfileError } = await admin
      .from("users")
      .select("company_id, role, role_system, role_base, ativo")
      .eq("id", callerId)
      .maybeSingle();

    if (callerProfileError || !callerProfile) return json({ error: "Caller profile not found" }, 403);
    if (!callerProfile.ativo) return json({ error: "Inactive user cannot create access" }, 403);

    const isMaster = callerProfile.role === "master_admin" || callerProfile.role_system === "super_admin";
    const isCompanyAdmin = callerProfile.role === "admin" || callerProfile.role_base === "admin";
    if (!isMaster && !isCompanyAdmin) return json({ error: "Permission denied" }, 403);

    const body = (await req.json()) as { nome?: string; email?: string; role?: RoleInput; company_id?: string };
    const nome = (body.nome || "").trim();
    const role: RoleInput = body.role || "tecnico";
    if (!nome) return json({ error: "Nome obrigatorio" }, 400);

    const companyId = isMaster ? body.company_id || null : callerProfile.company_id;
    if (!companyId) return json({ error: "company_id obrigatorio" }, 400);

    const baseLogin = sanitizeLogin(nome) || `usuario.${Date.now()}`;
    const email = (body.email || `${baseLogin}.${Date.now()}@acesso.local`).trim().toLowerCase();
    const temporaryPassword = randomPassword(12);

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        nome,
        company_id: companyId,
        role,
        role_base: role === "admin" ? "admin" : "operador",
        role_system: "company_user",
      },
    });

    if (createError || !created?.user?.id) {
      return json({ error: createError?.message || "Nao foi possivel criar acesso" }, 400);
    }

    const createdId = created.user.id;
    const { error: profileError } = await admin.from("users").upsert(
      {
        id: createdId,
        company_id: companyId,
        nome,
        email,
        role,
        role_base: role === "admin" ? "admin" : "operador",
        role_system: "company_user",
        ativo: true,
      },
      { onConflict: "id" }
    );
    if (profileError) return json({ error: profileError.message }, 400);

    return json({
      ok: true,
      user_id: createdId,
      email,
      temporary_password: temporaryPassword,
      message: "Acesso criado. Envie o login e senha temporaria para o membro (ex.: WhatsApp).",
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
