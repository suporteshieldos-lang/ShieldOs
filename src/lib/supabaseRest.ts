export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
  };
}

export interface AppStatePayload {
  customers?: unknown[];
  orders: unknown[];
  budgets?: unknown[];
  inventory: unknown[];
  cashRegisters?: unknown[];
  cashEntries: unknown[];
  expenses?: unknown[];
  responsibilityTerm: string;
  companyInfo: unknown;
  financialSettings?: unknown;
  paymentMethods?: unknown[];
  nextOrderNumber: number;
}

export interface InventoryCategory {
  id: string;
  name: string;
}

export interface InventorySupplier {
  id: string;
  name: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const SESSION_KEY = "shieldos_session";

let currentAccessToken: string | null = null;

export function getSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }
}

function baseHeaders(withAuth = false): HeadersInit {
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY || "",
    "Content-Type": "application/json",
  };
  if (withAuth && currentAccessToken) {
    headers.Authorization = `Bearer ${currentAccessToken}`;
  }
  return headers;
}

function mergeHeaders(defaultHeaders: HeadersInit, customHeaders?: HeadersInit): HeadersInit {
  const merged = new Headers(defaultHeaders);
  if (!customHeaders) return merged;
  const custom = new Headers(customHeaders);
  custom.forEach((value, key) => merged.set(key, value));
  return merged;
}

async function refreshSessionInternal(): Promise<AuthSession | null> {
  requireConfig();
  const session = readSession();
  if (!session?.refresh_token) return null;

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: baseHeaders(false),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const nextSession = (await response.json()) as AuthSession;
  saveSession(nextSession);
  return nextSession;
}

async function ensureAccessToken(): Promise<void> {
  const session = readSession();
  if (!session) return;
  const now = Math.floor(Date.now() / 1000);
  if ((session.expires_at || 0) - now <= 45) {
    await refreshSessionInternal();
  }
}

async function fetchWithAuth(url: string, init: RequestInit = {}): Promise<Response> {
  requireConfig();
  await ensureAccessToken();

  const attempt = async () =>
    fetch(url, {
      ...init,
      headers: mergeHeaders(baseHeaders(true), init.headers),
    });

  let response = await attempt();
  if (response.status !== 401) return response;

  const refreshed = await refreshSessionInternal();
  if (!refreshed) return response;
  response = await attempt();
  return response;
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  currentAccessToken = session.access_token;
}

export function readSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    currentAccessToken = parsed.access_token;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  currentAccessToken = null;
}

export function getCurrentAccessToken() {
  return currentAccessToken;
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: baseHeaders(false),
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || "Falha no login.");
  }
  const session = await response.json();
  saveSession(session);
  return session;
}

export async function logLoginAttempt(email: string, success: boolean, reason?: string) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/auth_login_attempts`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify([
      {
        email: email.toLowerCase(),
        success,
        reason: reason || null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      },
    ]),
  }).catch(() => undefined);
}

export function readRecoverySessionFromUrl(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) return null;
  const expires_in = Number(params.get("expires_in") || 3600);
  const expires_at = Number(params.get("expires_at") || Math.floor(Date.now() / 1000) + expires_in);
  const token_type = params.get("token_type") || "bearer";
  const userId = params.get("user_id") || "";
  const email = params.get("email") || undefined;

  const session: AuthSession = {
    access_token,
    refresh_token,
    expires_in,
    expires_at,
    token_type,
    user: {
      id: userId,
      email,
    },
  };
  saveSession(session);
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return session;
}

export async function requestPasswordRecovery(email: string, redirectTo: string) {
  requireConfig();
  await fetch(`${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST",
    headers: baseHeaders(false),
    body: JSON.stringify({ email }),
  });
}

export async function updatePassword(newPassword: string) {
  requireConfig();
  if (!currentAccessToken) {
    throw new Error("Sessao invalida para redefinicao de senha.");
  }
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: "PUT",
    headers: baseHeaders(true),
    body: JSON.stringify({ password: newPassword }),
  });
  if (!response.ok) {
    throw new Error("Nao foi possivel redefinir a senha.");
  }
}

export async function getCurrentUser() {
  requireConfig();
  if (!readSession()) return null;
  const response = await fetchWithAuth(`${SUPABASE_URL}/auth/v1/user`, {
    method: "GET",
  });
  if (!response.ok) return null;
  return response.json();
}

export async function signOut() {
  requireConfig();
  if (currentAccessToken) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: baseHeaders(true),
    }).catch(() => undefined);
  }
  clearSession();
}

export async function loadAppState(): Promise<AppStatePayload | null> {
  requireConfig();
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) return null;
  const response = await fetchWithAuth(
    `${SUPABASE_URL}/rest/v1/app_states?select=data&company_id=eq.${companyId}&order=updated_at.desc&limit=1`,
    { method: "GET" }
  );
  if (!response.ok) {
    throw new Error("Não foi possível carregar os dados do usuário.");
  }
  const rows = (await response.json()) as Array<{ data: AppStatePayload }>;
  if (!rows.length) return null;
  return rows[0].data;
}

async function getCurrentUserCompanyId(): Promise<string | null> {
  requireConfig();
  const response = await fetchWithAuth(`${SUPABASE_URL}/rest/v1/rpc/current_user_company_id`, {
    method: "POST",
    body: "{}",
  });
  if (!response.ok) return null;
  const data = await response.json();
  return typeof data === "string" ? data : null;
}

export async function getCurrentCompanyId(): Promise<string | null> {
  return getCurrentUserCompanyId();
}

export async function upsertAppState(payload: AppStatePayload) {
  requireConfig();
  const user = await getCurrentUser();
  const companyId = await getCurrentUserCompanyId();
  if (!user?.id || !companyId) {
    throw new Error("Nao foi possivel identificar usuario/empresa para salvar dados.");
  }

  const response = await fetchWithAuth(`${SUPABASE_URL}/rest/v1/app_states`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([
      {
        user_id: user.id,
        company_id: companyId,
        data: payload,
      },
    ]),
  });
  if (!response.ok) {
    throw new Error("Não foi possível salvar os dados do usuário.");
  }
}

export async function listInventoryCategories(): Promise<InventoryCategory[]> {
  requireConfig();
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) return [];
  const response = await fetchWithAuth(
    `${SUPABASE_URL}/rest/v1/categories?select=id,name&company_id=eq.${companyId}&active=eq.true&order=name.asc`,
    { method: "GET" }
  );
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar categorias.");
  }
  return response.json();
}

export async function createInventoryCategory(name: string): Promise<InventoryCategory> {
  requireConfig();
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error("Nao foi possivel identificar a empresa do usuario.");
  }
  const response = await fetchWithAuth(`${SUPABASE_URL}/rest/v1/categories`, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        company_id: companyId,
        name: name.trim(),
        active: true,
      },
    ]),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = String(error?.message || error?.details || "Nao foi possivel criar categoria.");
    throw new Error(message);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function listInventorySuppliers(): Promise<InventorySupplier[]> {
  requireConfig();
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) return [];
  const response = await fetchWithAuth(
    `${SUPABASE_URL}/rest/v1/suppliers?select=id,name&company_id=eq.${companyId}&active=eq.true&order=name.asc`,
    { method: "GET" }
  );
  if (!response.ok) {
    throw new Error("Nao foi possivel carregar fornecedores.");
  }
  return response.json();
}

export async function createInventoryItem(input: {
  name: string;
  sku: string;
  categoryId: string;
  status: "ativo" | "inativo" | "descontinuado";
  qty: number;
  unit: "UN" | "CX" | "KG" | "M";
  minQty: number;
  location?: string;
  costUnit: number;
  salePrice: number;
  supplierId?: string | null;
  notes?: string;
}) {
  requireConfig();
  const companyId = await getCurrentUserCompanyId();
  if (!companyId) {
    throw new Error("Nao foi possivel identificar a empresa do usuario.");
  }

  const response = await fetchWithAuth(`${SUPABASE_URL}/rest/v1/inventory_items`, {
    method: "POST",
    headers: {
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        company_id: companyId,
        name: input.name,
        sku: input.sku,
        category_id: input.categoryId,
        status: input.status,
        quantity: input.qty,
        unit: input.unit,
        minimum_stock: input.minQty,
        location: input.location || null,
        unit_cost: input.costUnit,
        sale_price: input.salePrice,
        supplier_id: input.supplierId || null,
        notes: input.notes || null,
      },
    ]),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = String(error?.message || error?.details || error?.hint || "Nao foi possivel salvar a peca.");
    if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("inventory_items_company_id_sku_key")) {
      throw new Error("SKU ja cadastrado para esta empresa.");
    }
    throw new Error(message);
  }

  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function findInventoryItemIdBySku(sku: string): Promise<string | null> {
  requireConfig();
  const normalized = sku.trim().toUpperCase();
  if (!normalized) return null;
  const response = await fetchWithAuth(
    `${SUPABASE_URL}/rest/v1/inventory_items?select=id&sku=eq.${encodeURIComponent(normalized)}&limit=1`,
    { method: "GET" }
  );
  if (!response.ok) return null;
  const rows = (await response.json()) as Array<{ id: string }>;
  return rows[0]?.id || null;
}

export async function registerInventorySale(input: {
  itemId: string;
  qty: number;
  unitSalePrice: number;
  description?: string;
}) {
  requireConfig();
  const response = await fetchWithAuth(`${SUPABASE_URL}/rest/v1/rpc/register_inventory_sale`, {
    method: "POST",
    body: JSON.stringify({
      p_item_id: input.itemId,
      p_qty: input.qty,
      p_unit_sale_price: (input.unitSalePrice / 100).toFixed(2),
      p_description: input.description || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = String(error?.message || error?.details || "Nao foi possivel registrar venda.");
    if (message.toLowerCase().includes("insuficiente")) {
      throw new Error("Estoque insuficiente");
    }
    if (message.toLowerCase().includes("valor de venda")) {
      throw new Error("Informe um valor de venda valido");
    }
    throw new Error("Nao foi possivel concluir a venda. Tente novamente.");
  }

  return response.json();
}

export async function deleteInventorySale(financeId: string) {
  requireConfig();
  const response = await fetchWithAuth(`${SUPABASE_URL}/rest/v1/rpc/delete_inventory_sale`, {
    method: "POST",
    body: JSON.stringify({
      p_finance_id: financeId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = String(error?.message || error?.details || "Nao foi possivel excluir a venda.");
    if (message.toLowerCase().includes("nao encontrada")) {
      throw new Error("Venda nao encontrada.");
    }
    throw new Error("Nao foi possivel excluir a venda e reverter o estoque.");
  }

  return response.json();
}

export async function updateInventoryItemSecure(input: {
  itemId: string;
  currentQty: number;
  name: string;
  sku: string;
  category: string;
  status: "ativo" | "inativo" | "descontinuado";
  minQty: number;
  costPrice: number;
  salePrice: number;
  supplier?: string;
  location?: string;
  unit: "UN" | "CX" | "KG" | "M";
  notes?: string;
  stockAdjustment: number;
  adjustmentReason?: string;
}) {
  requireConfig();
  const rpcPayload = {
    p_item_id: input.itemId,
    p_name: input.name,
    p_sku: input.sku,
    p_category: input.category,
    p_status: input.status,
    p_min_qty: input.minQty,
    p_cost_price: (input.costPrice / 100).toFixed(2),
    p_sale_price: (input.salePrice / 100).toFixed(2),
    p_supplier: input.supplier || null,
    p_location: input.location || null,
    p_unit: input.unit,
    p_notes: input.notes || null,
    p_stock_adjustment: input.stockAdjustment,
    p_adjustment_reason: input.adjustmentReason || null,
  };

  const response = await fetchWithAuth(`${SUPABASE_URL}/rest/v1/rpc/update_inventory_item_secure`, {
    method: "POST",
    body: JSON.stringify(rpcPayload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = String(error?.message || error?.details || "Nao foi possivel atualizar a peca.");
    const normalized = message.toLowerCase();

    if (normalized.includes("could not find the function") || normalized.includes("function public.update_inventory_item_secure")) {
      const fallbackResponse = await fetchWithAuth(`${SUPABASE_URL}/rest/v1/inventory_items?id=eq.${input.itemId}`, {
        method: "PATCH",
        headers: {
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          name: input.name.trim(),
          sku: input.sku.trim().toUpperCase(),
          status: input.status,
          minimum_stock: input.minQty,
          unit_cost: Number((input.costPrice / 100).toFixed(2)),
          sale_price: Number((input.salePrice / 100).toFixed(2)),
          location: input.location?.trim() || null,
          unit: input.unit,
          notes: input.notes?.trim() || null,
          quantity: input.currentQty + input.stockAdjustment,
        }),
      });

      if (!fallbackResponse.ok) {
        const fallbackErr = await fallbackResponse.json().catch(() => ({}));
        const fallbackMessage = String(
          fallbackErr?.message || fallbackErr?.details || fallbackErr?.hint || "Nao foi possivel salvar as alteracoes."
        );
        throw new Error(fallbackMessage);
      }
      return fallbackResponse.json();
    }

    if (normalized.includes("sku")) throw new Error("SKU ja cadastrado para esta empresa.");
    if (normalized.includes("estoque")) throw new Error(message);
    if (normalized.includes("preco")) throw new Error(message);
    throw new Error(message);
  }

  return response.json();
}

export async function isMasterAdmin(): Promise<boolean> {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_super_admin`, {
    method: "POST",
    headers: baseHeaders(true),
    body: "{}",
  });
  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data);
}

export async function canCurrentUserLogin(): Promise<boolean> {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/can_current_user_login`, {
    method: "POST",
    headers: baseHeaders(true),
    body: "{}",
  });
  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data);
}

export interface CompanySubscriptionView {
  id: string;
  nome_empresa: string;
  email_principal: string | null;
  plano: string | null;
  status_assinatura: string;
  vencimento: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  company_id: string | null;
  nome: string;
  email: string | null;
  role: "admin" | "atendente" | "tecnico" | "master_admin" | string;
  ativo: boolean;
  is_company_owner?: boolean;
  created_at: string;
}

export interface MasterUserRow {
  id: string;
  nome: string;
  email: string | null;
  role: string | null;
  role_system: string | null;
  ativo: boolean;
  company_id: string | null;
  created_at: string;
}

export async function listCompaniesForMaster(): Promise<CompanySubscriptionView[]> {
  requireConfig();
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?select=id,nome_empresa,email_principal,plano,status_assinatura,vencimento,created_at&order=created_at.desc`,
    {
      headers: baseHeaders(true),
    }
  );
  if (!response.ok) {
    throw new Error("Nao foi possivel listar empresas.");
  }
  return response.json();
}

export async function masterUpdateCompany(
  companyId: string,
  status: "ativa" | "bloqueada" | "cancelada",
  vencimento: string
) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/master_update_company`, {
    method: "POST",
    headers: baseHeaders(true),
    body: JSON.stringify({
      p_company_id: companyId,
      p_status: status,
      p_vencimento: vencimento,
    }),
  });
  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar empresa.");
  }
}

export async function listUsersForMaster(): Promise<MasterUserRow[]> {
  requireConfig();
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/users?select=id,nome,email,role,role_system,ativo,company_id,created_at&order=created_at.desc`,
    {
      headers: baseHeaders(true),
    }
  );
  if (!response.ok) {
    throw new Error("Nao foi possivel listar usuarios.");
  }
  return response.json();
}

export async function masterUpdateUser(
  userId: string,
  updates: Partial<Pick<MasterUserRow, "ativo" | "role" | "nome">>
) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...baseHeaders(true),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar usuario.");
  }
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  requireConfig();
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/users?select=id,company_id,nome,email,role,ativo,is_company_owner,created_at&order=created_at.desc`,
    {
      headers: baseHeaders(true),
    }
  );
  if (!response.ok) {
    throw new Error("Nao foi possivel listar equipe.");
  }
  return response.json();
}

export async function updateTeamMember(userId: string, updates: Partial<Pick<TeamMember, "role" | "ativo" | "nome">>) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: {
      ...baseHeaders(true),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error("Nao foi possivel atualizar membro da equipe.");
  }
}

export async function inviteTeamMember(payload: { nome: string; email: string; role: "admin" | "atendente" | "tecnico" }) {
  requireConfig();
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-team-member`, {
      method: "POST",
      headers: baseHeaders(true),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.error || error?.message || `Convite falhou (${response.status})`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Falha ao convidar membro: ${error.message}`);
    }
    throw new Error("Falha ao convidar membro.");
  }
}

export async function createCashManualEntry(payload: {
  category: string;
  description: string;
  amountCents: number;
  paymentMethod: "dinheiro" | "pix" | "cartao" | "outro" | null;
  orderId?: string | null;
  notes?: string | null;
}) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_cash_manual_entry`, {
    method: "POST",
    headers: baseHeaders(true),
    body: JSON.stringify({
      p_category: payload.category,
      p_description: payload.description,
      p_amount_cents: payload.amountCents,
      p_payment_method: payload.paymentMethod,
      p_order_id: payload.orderId || null,
      p_notes: payload.notes || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || error?.details || "Falha ao registrar entrada manual.");
  }

  return response.json();
}

export async function createCashAdjustment(payload: {
  adjustType: "entrada" | "saida";
  reasonType: "sobra_caixa" | "quebra_caixa" | "erro_lancamento" | "ajuste_manual";
  observation: string;
  amountCents: number;
}) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_cash_adjustment`, {
    method: "POST",
    headers: baseHeaders(true),
    body: JSON.stringify({
      p_adjust_type: payload.adjustType,
      p_reason_type: payload.reasonType,
      p_observation: payload.observation,
      p_amount_cents: payload.amountCents,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || error?.details || "Falha ao registrar ajuste de caixa.");
  }

  return response.json();
}

export async function createTeamMemberCredentials(payload: { nome: string; email?: string; role: "admin" | "atendente" | "tecnico" }) {
  requireConfig();
  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-team-member-credentials`, {
    method: "POST",
    headers: baseHeaders(true),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || error?.message || `Criacao de acesso falhou (${response.status})`);
  }
  return response.json() as Promise<{ ok: true; user_id: string; email: string; temporary_password: string; message: string }>;
}

export interface WhatsAppMessageRow {
  id: string;
  company_id: string;
  order_id: string | null;
  customer_phone: string;
  customer_name: string | null;
  direction: "inbound" | "outbound";
  body: string;
  status: "received" | "sent" | "failed";
  provider: string | null;
  provider_message_id: string | null;
  created_at: string;
}

function normalizePhoneDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export async function listWhatsAppMessages(input: {
  companyId: string;
  customerPhone: string;
  orderId?: string;
  limit?: number;
}): Promise<WhatsAppMessageRow[]> {
  requireConfig();
  const phone = normalizePhoneDigits(input.customerPhone);
  if (!phone) return [];
  const limit = input.limit || 120;
  const orderFilter = input.orderId ? `&order_id=eq.${encodeURIComponent(input.orderId)}` : "";
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/whatsapp_messages?select=id,company_id,order_id,customer_phone,customer_name,direction,body,status,provider,provider_message_id,created_at&company_id=eq.${input.companyId}&customer_phone=eq.${phone}${orderFilter}&order=created_at.asc&limit=${limit}`,
    { headers: baseHeaders(true) }
  );
  if (!response.ok) throw new Error("Nao foi possivel carregar as mensagens do WhatsApp.");
  return response.json();
}

export async function createOutboundWhatsAppMessage(input: {
  companyId: string;
  orderId?: string;
  customerPhone: string;
  customerName?: string;
  body: string;
  status?: "received" | "sent" | "failed";
}) {
  requireConfig();
  const phone = normalizePhoneDigits(input.customerPhone);
  if (!phone) throw new Error("Telefone do cliente invalido.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
    method: "POST",
    headers: {
      ...baseHeaders(true),
      Prefer: "return=representation",
    },
    body: JSON.stringify([
      {
        company_id: input.companyId,
        order_id: input.orderId || null,
        customer_phone: phone,
        customer_name: input.customerName || null,
        direction: "outbound",
        body: input.body,
        status: input.status || "sent",
        provider: "wa_me",
      },
    ]),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.message || error?.details || "Nao foi possivel registrar a mensagem enviada.");
  }
  const rows = (await response.json()) as WhatsAppMessageRow[];
  return rows[0];
}
