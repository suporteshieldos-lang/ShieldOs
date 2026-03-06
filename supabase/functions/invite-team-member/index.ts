// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type RoleInput = "admin" | "atendente" | "tecnico";

function extractBearerToken(authorizationHeader: string): string | null {
  const token = authorizationHeader.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

async function verifyCallerUserId(authorizationHeader: string): Promise<string | null> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

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

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      });
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Function misconfigured: missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const callerId = await verifyCallerUserId(authHeader);
    if (!callerId) {
      return json({ error: "Missing bearer token" }, 401);
    }
    const { data: callerProfile, error: callerProfileError } = await admin
      .from("users")
      .select("company_id, role, role_system, role_base, ativo")
      .eq("id", callerId)
      .maybeSingle();

    if (callerProfileError || !callerProfile) return json({ error: "Caller profile not found" }, 403);
    if (!callerProfile.ativo) return json({ error: "Inactive user cannot invite" }, 403);

    const isMaster = callerProfile.role === "master_admin" || callerProfile.role_system === "super_admin";
    const isCompanyAdmin = callerProfile.role === "admin" || callerProfile.role_base === "admin";
    if (!isMaster && !isCompanyAdmin) return json({ error: "Permission denied" }, 403);

    const body = (await req.json()) as { nome?: string; email?: string; role?: RoleInput; company_id?: string };
    const nome = (body.nome || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const role: RoleInput = body.role || "tecnico";
    if (!nome || !email) return json({ error: "Nome e e-mail sao obrigatorios" }, 400);

    const companyId = isMaster ? body.company_id || null : callerProfile.company_id;
    if (!companyId) return json({ error: "company_id obrigatorio para convite master ou usuario sem empresa" }, 400);

    const { data: company } = await admin.from("companies").select("id, nome_empresa").eq("id", companyId).maybeSingle();
    if (!company) return json({ error: "Empresa nao encontrada" }, 404);

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        nome,
        company_id: companyId,
        role,
        role_base: role === "admin" ? "admin" : "operador",
        role_system: "company_user",
        nome_empresa: company.nome_empresa,
      },
    });
    if (inviteError) return json({ error: inviteError.message }, 400);

    const invitedId = invited?.user?.id;
    if (invitedId) {
      await admin.from("users").upsert(
        {
          id: invitedId,
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
    }

    return json({ ok: true, invited_user_id: invitedId, company_id: companyId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
