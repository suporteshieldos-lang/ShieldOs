import { create } from "zustand";
import { AppStatePayload, getSupabaseConfigured, loadAppState, upsertAppState } from "@/lib/supabaseRest";
import { createId } from "@/lib/id";

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  cnpj: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "Minha Assistencia Tecnica",
  address: "",
  phone: "",
  email: "",
  cnpj: "",
};

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  categoryId?: string | null;
  sku: string;
  qty: number;
  minQty: number;
  unit: "UN" | "CX" | "KG" | "M";
  status: "ativo" | "inativo" | "descontinuado";
  location?: string;
  costPrice: number;
  salePrice: number;
  supplier: string;
  supplierId?: string | null;
  notes?: string;
}

export interface UsedPart {
  inventoryId: string;
  name: string;
  qty: number;
  unitCost: number;
}

export type PaymentMethod = "dinheiro" | "pix" | "debito" | "credito" | "cartao" | "outro";
export type PaymentStatus = "pago" | "pendente" | "parcial";
export type OrderStatus = "received" | "diagnosing" | "repairing" | "waiting_parts" | "completed" | "delivered" | "cancelled";
export type CashRegisterStatus = "aberto" | "fechado";
export type CashMovementCategory = "venda" | "compra" | "suprimento" | "sangria" | "ajuste";

export interface CashRegisterSession {
  id: string;
  openedAtIso: string;
  closedAtIso?: string;
  openedBy: string;
  closedBy?: string;
  openingAmount: number;
  openingNotes?: string;
  closingNotes?: string;
  status: CashRegisterStatus;
  totalCashIn?: number;
  totalCashOut?: number;
  expectedCashAtClose?: number;
  countedCashAtClose?: number;
  differenceAtClose?: number;
}

export interface RepairOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCpf: string;
  deviceType: "phone" | "notebook" | "tablet" | "printer";
  brand: string;
  model: string;
  serialImei: string;
  devicePassword: string;
  deviceColor: string;
  accessories: string;
  conditionNotes: string;
  checklist: Record<string, boolean>;
  reportedProblem: string;
  technicianDiagnosis: string;
  repairActions: string;
  serviceCost: number;
  partsCost: number;
  discount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDate: string;
  usedParts: UsedPart[];
  cost: string;
  partsUsed: string;
  estimatedDelivery: string;
  technician: string;
  status: OrderStatus;
  date: string;
  completedDate: string;
  warrantyDays: number;
  termAccepted: boolean;
  entryPhotos: string[];
  exitPhotos: string[];
  history?: OrderHistoryEntry[];
}

export type BudgetStatus =
  | "RASCUNHO"
  | "ENVIADO"
  | "AGUARDANDO_APROVACAO"
  | "APROVADO"
  | "REPROVADO"
  | "EXPIRADO"
  | "CONVERTIDO_OS"
  | "EXCLUIDO";

export interface BudgetItem {
  id: string;
  type: "estoque" | "manual";
  description: string;
  qty: number;
  unitPrice: number;
  inventoryItemId?: string;
  unitCost?: number;
}

export interface BudgetHistoryEntry {
  atIso: string;
  action: string;
  by: string;
  details?: string;
}

export interface BudgetRecord {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  title?: string;
  equipment: string;
  problemDescription: string;
  items: BudgetItem[];
  notes?: string;
  discountAmount?: number;
  totalAmount: number;
  status: BudgetStatus;
  createdAtIso: string;
  validityDays?: number;
  validUntilIso: string;
  legalValidityText: string;
  diagnosticFeeAmount: number;
  approvedAtIso?: string;
  rejectedAtIso?: string;
  expiredAtIso?: string;
  convertedOrderId?: string;
  excludedAtIso?: string;
  exclusionReason?: string;
  history?: BudgetHistoryEntry[];
}

export interface OrderHistoryEntry {
  at: string;
  action: string;
  changedFields: string[];
  before?: Partial<RepairOrder>;
  after?: Partial<RepairOrder>;
}

export interface CashEntry {
  id: string;
  date: string;
  type: "entrada" | "saida";
  status?: "ativa" | "estornada" | "cancelada";
  financialStatus?: "previsto" | "pago";
  description: string;
  amount: number;
  category?: string;
  paymentMethod?: PaymentMethod;
  source?: "manual" | "os" | "venda_peca" | "despesa" | "ajuste";
  movementType?:
    | "entrada_manual"
    | "entrada_os"
    | "saida_operacional"
    | "consumo_peca"
    | "retirada_sangria"
    | "ajuste_caixa";
  orderId?: string;
  orderRef?: string;
  inventoryItemId?: string;
  inventoryItemName?: string;
  performedBy?: string;
  notes?: string;
  createdAtIso?: string;
  saleFinanceId?: string;
  saleItemId?: string;
  saleQty?: number;
  saleUnitPrice?: number;
  saleUnitCost?: number;
  isReversal?: boolean;
  reversedEntryId?: string;
  canceledAtIso?: string;
  canceledBy?: string;
  canceledReason?: string;
  balanceBeforeCents?: number;
  balanceAfterCents?: number;
  registerId?: string;
  employeeName?: string;
  movementCategory?: CashMovementCategory;
  affectsPhysicalCash?: boolean;
  cashReceivedAmount?: number;
  changeDueAmount?: number;
  reversedAtIso?: string;
  reversedBy?: string;
  reversedReason?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface FinancialSettings {
  allowNegativeCash: boolean;
  requireObservationForAdjustments: boolean;
  enableCustomerInFinancial: boolean;
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  allowNegativeCash: false,
  requireObservationForAdjustments: true,
  enableCustomerInFinancial: true,
};

export interface OperationalExpense {
  id: string;
  date: string;
  amount: number;
  category: string;
  notes?: string;
}

export interface CustomerRecord {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  createdAt: string;
}

export const DEFAULT_CUSTOMER: CustomerRecord = {
  id: "customer-nao-identificado",
  name: "Não Identificado",
  cpf: "",
  phone: "Não informado",
  email: "",
  createdAt: "01/01/2026",
};

export const DEFAULT_RESPONSIBILITY_TERM = `TERMO DE RESPONSABILIDADE

Declaro que recebi as informAções do Serviço e estou ciente das condicoes de garantia.
A garantia cobre apenas o Serviço executado e Não cobre mau uso, quedas, liquidos
ou manutencao feita por terceiros.`;

export const PHONE_CHECKLIST_ITEMS = [
  "Tela",
  "Botoes fisicos",
  "Alto-falante",
  "Microfone",
  "Camera frontal",
  "Camera traseira",
  "Carregamento",
  "Wi-Fi",
  "Bluetooth",
  "Biometria",
  "Chip/Sinal",
  "GPS",
  "Sensor de proximidade",
  "VibrAção",
  "NFC",
  "Bateria",
];

export const NOTEBOOK_CHECKLIST_ITEMS = [
  "Tela",
  "Teclado",
  "Touchpad",
  "Webcam",
  "Alto-falantes",
  "Microfone",
  "USB",
  "HDMI/DisplayPort",
  "Carregamento",
  "Wi-Fi",
  "Bluetooth",
  "Bateria",
  "Cooler",
  "Dobradica",
  "Leitor SD",
  "Biometria",
];

export const TABLET_CHECKLIST_ITEMS = [
  "Tela",
  "Botoes fisicos",
  "Alto-falante",
  "Microfone",
  "Camera frontal",
  "Camera traseira",
  "Carregamento",
  "Wi-Fi",
  "Bluetooth",
  "Biometria",
  "Sensor de proximidade",
  "GPS",
  "Bateria",
  "Caneta stylus",
];

export const PRINTER_CHECKLIST_ITEMS = [
  "Liga/desliga",
  "Painel e botoes",
  "Conexao USB",
  "Conexao Wi-Fi",
  "Qualidade de impressao",
  "TrAção de papel",
  "Scanner",
  "Copia",
  "Porta cartucho/toner",
  "Sensor de tampa",
  "Sensor de papel",
  "Cabos e fonte",
];

export function getChecklistItems(deviceType: string): string[] {
  switch (deviceType) {
    case "notebook":
      return NOTEBOOK_CHECKLIST_ITEMS;
    case "tablet":
      return TABLET_CHECKLIST_ITEMS;
    case "printer":
      return PRINTER_CHECKLIST_ITEMS;
    default:
      return PHONE_CHECKLIST_ITEMS;
  }
}

export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseCurrency(str: string): number {
  const cleaned = str.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return 0;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalSep = lastComma > lastDot ? "," : lastDot > lastComma ? "." : "";

  const normalized = decimalSep
    ? `${cleaned
        .slice(0, cleaned.lastIndexOf(decimalSep))
        .replace(/[^\d-]/g, "")}.${cleaned.slice(cleaned.lastIndexOf(decimalSep) + 1).replace(/[^\d]/g, "")}`
    : cleaned.replace(/[^\d-]/g, "");

  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

function normalizeIdentity(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function nextBudgetCode(budgets: BudgetRecord[]): string {
  const max = budgets.reduce((acc, budget) => {
    const match = budget.code.match(/(\d+)$/);
    const value = match ? Number(match[1]) : 0;
    return Number.isFinite(value) ? Math.max(acc, value) : acc;
  }, 0);
  return `ORC-${String(max + 1).padStart(5, "0")}`;
}

function budgetHistory(action: string, by?: string, details?: string): BudgetHistoryEntry {
  return {
    atIso: new Date().toISOString(),
    action,
    by: by?.trim() || "Sistema",
    details,
  };
}

export function getOrderTotal(order: RepairOrder): number {
  return Math.max(0, order.serviceCost - order.discount);
}

export function getOrderProfit(order: RepairOrder): number {
  const partsCostReal = order.usedParts.reduce((sum, part) => sum + part.unitCost * part.qty, 0);
  return getOrderTotal(order) - partsCostReal;
}

interface AppStore {
  customers: CustomerRecord[];
  orders: RepairOrder[];
  budgets: BudgetRecord[];
  inventory: InventoryItem[];
  cashRegisters: CashRegisterSession[];
  cashEntries: CashEntry[];
  expenses: OperationalExpense[];
  responsibilityTerm: string;
  companyInfo: CompanyInfo;
  financialSettings: FinancialSettings;
  paymentMethods: PaymentMethod[];
  nextOrderNumber: number;
  hydrated: boolean;
  hydrateFromRemote: () => Promise<void>;
  resetLocalData: () => void;
  addOrder: (order: RepairOrder) => { ok: boolean; message?: string };
  addBudget: (
    budget: Omit<
      BudgetRecord,
      "id" | "code" | "createdAtIso" | "validUntilIso" | "status" | "history" | "diagnosticFeeAmount" | "legalValidityText"
    >,
    actor?: string
  ) => BudgetRecord;
  updateBudget: (
    id: string,
    updates: Partial<
      Pick<
        BudgetRecord,
        | "customerId"
        | "customerName"
        | "title"
        | "equipment"
        | "problemDescription"
        | "items"
        | "notes"
        | "validityDays"
        | "validUntilIso"
        | "discountAmount"
        | "totalAmount"
      >
    >,
    actor?: string
  ) => { ok: boolean; message?: string };
  duplicateBudget: (id: string, actor?: string) => { ok: boolean; message?: string; budget?: BudgetRecord };
  setBudgetStatus: (id: string, status: Exclude<BudgetStatus, "EXCLUIDO">, actor?: string, details?: string) => { ok: boolean; message?: string };
  deleteBudget: (id: string, reason: string, actor?: string) => { ok: boolean; message?: string };
  convertBudgetToOrder: (id: string, actor?: string) => { ok: boolean; message?: string; orderId?: string };
  deleteOrder: (id: string) => void;
  updateOrder: (id: string, updates: Partial<RepairOrder>) => { ok: boolean; message?: string };
  addCustomer: (customer: CustomerRecord) => void;
  deleteCustomer: (id: string) => void;
  updateCustomer: (id: string, updates: Partial<CustomerRecord>) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  replaceInventoryItemId: (oldId: string, newId: string) => void;
  deleteInventoryItem: (id: string) => void;
  deductStock: (inventoryId: string, qty: number) => void;
  addCashEntry: (entry: CashEntry) => void;
  reverseCashEntry: (id: string, reason: string, performedBy?: string) => { ok: boolean; message?: string };
  cancelCashEntry: (id: string, reason: string, performedBy?: string) => { ok: boolean; message?: string };
  addExpense: (expense: OperationalExpense) => void;
  removeExpense: (id: string) => void;
  setCashOpening: (date: string, amount: number) => void;
  setResponsibilityTerm: (term: string) => void;
  setCompanyInfo: (info: CompanyInfo) => void;
  setFinancialSettings: (settings: FinancialSettings) => void;
  setPaymentMethods: (methods: PaymentMethod[]) => void;
  openCashRegister: (input: {
    employeeName: string;
    openingAmount: number;
    notes?: string;
  }) => { ok: boolean; message?: string; id?: string };
  closeCashRegister: (input: {
    employeeName: string;
    countedAmount: number;
    notes?: string;
  }) => { ok: boolean; message?: string; difference?: number };
  addCashMovement: (input: {
    type: "entrada" | "saida";
    category: CashMovementCategory;
    paymentMethod: PaymentMethod;
    amount: number;
    description: string;
    employeeName: string;
    orderRef?: string;
    notes?: string;
    cashReceivedAmount?: number;
    changeDueAmount?: number;
  }) => { ok: boolean; message?: string; id?: string };
}

const initialState = {
  customers: [DEFAULT_CUSTOMER] as CustomerRecord[],
  orders: [] as RepairOrder[],
  budgets: [] as BudgetRecord[],
  inventory: [] as InventoryItem[],
  cashRegisters: [] as CashRegisterSession[],
  cashEntries: [] as CashEntry[],
  expenses: [] as OperationalExpense[],
  responsibilityTerm: DEFAULT_RESPONSIBILITY_TERM,
  companyInfo: DEFAULT_COMPANY_INFO,
  financialSettings: DEFAULT_FINANCIAL_SETTINGS,
  paymentMethods: ["dinheiro", "pix", "debito", "credito", "cartao", "outro"] as PaymentMethod[],
  nextOrderNumber: 1,
  hydrated: false,
};

const LOCAL_STATE_KEY = "shieldos_app_state_backup_v1";

function toPayload(
  state: Pick<
    AppStore,
    "customers" | "orders" | "budgets" | "inventory" | "cashRegisters" | "cashEntries" | "expenses" | "responsibilityTerm" | "companyInfo" | "nextOrderNumber"
  >
): AppStatePayload {
  return {
    customers: state.customers,
    orders: state.orders,
    budgets: state.budgets,
    inventory: state.inventory,
    cashRegisters: state.cashRegisters,
    cashEntries: state.cashEntries,
    expenses: state.expenses,
    responsibilityTerm: state.responsibilityTerm,
    companyInfo: state.companyInfo,
    financialSettings: state.financialSettings as unknown as Record<string, unknown>,
    paymentMethods: state.paymentMethods as unknown as string[],
    nextOrderNumber: state.nextOrderNumber,
  };
}

async function persist(state: AppStore) {
  const payload = toPayload(state);
  localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(payload));
  scheduleRemotePersist(state);
}

let remotePersistTimer: ReturnType<typeof setTimeout> | null = null;
let remotePersistInFlight = false;
let pendingRemotePayload: AppStatePayload | null = null;

async function flushRemotePersist() {
  if (!getSupabaseConfigured() || !pendingRemotePayload || remotePersistInFlight) return;
  remotePersistInFlight = true;
  const payload = pendingRemotePayload;
  pendingRemotePayload = null;
  try {
    await upsertAppState(payload);
  } catch (error) {
    pendingRemotePayload = payload;
    console.error("Persistencia remota falhou. Backup local mantido.", error);
  } finally {
    remotePersistInFlight = false;
    if (pendingRemotePayload) {
      remotePersistTimer = setTimeout(() => {
        void flushRemotePersist();
      }, 1200);
    }
  }
}

function scheduleRemotePersist(state: AppStore) {
  if (!getSupabaseConfigured()) return;
  pendingRemotePayload = toPayload(state);
  if (remotePersistTimer) {
    clearTimeout(remotePersistTimer);
  }
  remotePersistTimer = setTimeout(() => {
    remotePersistTimer = null;
    void flushRemotePersist();
  }, 450);
}

if (typeof window !== "undefined") {
  const flushSoon = () => {
    if (remotePersistTimer) {
      clearTimeout(remotePersistTimer);
      remotePersistTimer = null;
    }
    void flushRemotePersist();
  };
  window.addEventListener("beforeunload", flushSoon);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushSoon();
  });
}

function readLocalBackup(): AppStatePayload | null {
  try {
    const raw = localStorage.getItem(LOCAL_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppStatePayload;
  } catch {
    return null;
  }
}

function ensureDefaultCustomer(customers: CustomerRecord[]): CustomerRecord[] {
  const exists = customers.some((customer) => customer.id === DEFAULT_CUSTOMER.id);
  return exists ? customers : [DEFAULT_CUSTOMER, ...customers];
}

function normalizeBudgetRecord(raw: unknown): BudgetRecord {
  const source = (raw || {}) as Record<string, unknown>;
  const legacyStatus = String(source.status || "RASCUNHO");
  const statusMap: Record<string, BudgetStatus> = {
    rascunho: "RASCUNHO",
    enviado: "ENVIADO",
    aguardando_aprovacao: "AGUARDANDO_APROVACAO",
    aprovado: "APROVADO",
    reprovado: "REPROVADO",
    expirado: "EXPIRADO",
    convertido_os: "CONVERTIDO_OS",
    excluido: "EXCLUIDO",
    RASCUNHO: "RASCUNHO",
    ENVIADO: "ENVIADO",
    AGUARDANDO_APROVACAO: "AGUARDANDO_APROVACAO",
    APROVADO: "APROVADO",
    REPROVADO: "REPROVADO",
    EXPIRADO: "EXPIRADO",
    CONVERTIDO_OS: "CONVERTIDO_OS",
    EXCLUIDO: "EXCLUIDO",
  };
  const validityDays = Number(source.validityDays || 7);
  const createdAtIso = String(source.createdAtIso || new Date().toISOString());
  const validUntilIso =
    String(source.validUntilIso || "") ||
    new Date(new Date(createdAtIso).getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString();
  const items = Array.isArray(source.items)
    ? (source.items as BudgetItem[])
    : [
        {
          id: createId(),
          type: "manual" as const,
          description: String(source.title || source.equipment || "Item"),
          qty: 1,
          unitPrice: Number(source.totalAmount || 0),
        },
      ];

  return {
    id: String(source.id || createId()),
    code: String(source.code || "ORC-00000"),
    customerId: String(source.customerId || DEFAULT_CUSTOMER.id),
    customerName: String(source.customerName || "Cliente"),
    title: String(source.title || ""),
    equipment: String(source.equipment || source.title || ""),
    problemDescription: String(source.problemDescription || ""),
    items,
    notes: String(source.notes || ""),
    discountAmount: Number(source.discountAmount || 0),
    totalAmount: Number(source.totalAmount || 0),
    status: statusMap[legacyStatus] || "RASCUNHO",
    createdAtIso,
    validityDays,
    validUntilIso,
    legalValidityText:
      String(source.legalValidityText || "") ||
      "Salvo estipulação em contrário, este orçamento tem validade de 7 dias a partir da data de emissão.",
    diagnosticFeeAmount: Number(source.diagnosticFeeAmount || 3000),
    approvedAtIso: source.approvedAtIso ? String(source.approvedAtIso) : undefined,
    rejectedAtIso: source.rejectedAtIso ? String(source.rejectedAtIso) : undefined,
    expiredAtIso: source.expiredAtIso ? String(source.expiredAtIso) : undefined,
    convertedOrderId: source.convertedOrderId ? String(source.convertedOrderId) : undefined,
    excludedAtIso: source.excludedAtIso ? String(source.excludedAtIso) : undefined,
    exclusionReason: source.exclusionReason ? String(source.exclusionReason) : undefined,
    history: Array.isArray(source.history) ? (source.history as BudgetHistoryEntry[]) : [],
  };
}

function parseBrDateToMs(value?: string): number {
  if (!value) return 0;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return 0;
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? 0 : dt.getTime();
}

function cashSessionRunningPhysicalBalance(sessionId: string, openingAmount: number, entries: CashEntry[]): number {
  const ordered = entries
    .filter(
      (entry) =>
        entry.registerId === sessionId &&
        entry.status !== "cancelada" &&
        entry.status !== "estornada"
    )
    .sort((a, b) => (a.createdAtIso || "").localeCompare(b.createdAtIso || ""));
  return ordered.reduce((sum, entry) => {
    const affects = entry.affectsPhysicalCash ?? entry.paymentMethod === "dinheiro";
    if (!affects) return sum;
    return sum + (entry.type === "entrada" ? entry.amount : -entry.amount);
  }, openingAmount);
}

function cashAffectsPhysical(entry: Pick<CashEntry, "affectsPhysicalCash" | "paymentMethod">) {
  return entry.affectsPhysicalCash ?? entry.paymentMethod === "dinheiro";
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  hydrateFromRemote: async () => {
    const localBackup = readLocalBackup();
    if (!getSupabaseConfigured()) {
      if (localBackup) {
        set({
          customers: ensureDefaultCustomer((localBackup.customers as CustomerRecord[]) || []),
          orders: (localBackup.orders as RepairOrder[]) || [],
          budgets: ((localBackup.budgets as unknown[]) || []).map(normalizeBudgetRecord),
          inventory: (localBackup.inventory as InventoryItem[]) || [],
          cashRegisters: (localBackup.cashRegisters as CashRegisterSession[]) || [],
          cashEntries: (localBackup.cashEntries as CashEntry[]) || [],
          expenses: (localBackup.expenses as OperationalExpense[]) || [],
          responsibilityTerm: (localBackup.responsibilityTerm as string) || DEFAULT_RESPONSIBILITY_TERM,
          companyInfo: (localBackup.companyInfo as CompanyInfo) || DEFAULT_COMPANY_INFO,
          financialSettings: (localBackup.financialSettings as FinancialSettings) || DEFAULT_FINANCIAL_SETTINGS,
          paymentMethods: ((localBackup.paymentMethods as PaymentMethod[]) || ["dinheiro", "pix", "debito", "credito", "cartao", "outro"]) as PaymentMethod[],
          nextOrderNumber: Number(localBackup.nextOrderNumber || 1),
          hydrated: true,
        });
      } else {
        set({ hydrated: true });
      }
      return;
    }
    let data: AppStatePayload | null = null;
    try {
      data = await loadAppState();
    } catch {
      data = null;
    }
    if (!data && localBackup) {
      data = localBackup;
    }
    if (!data) {
      const current = get();
      const normalized = { ...current, customers: ensureDefaultCustomer(current.customers) };
      set({ customers: normalized.customers });
      await upsertAppState(toPayload(normalized));
      set({ hydrated: true });
      return;
    }
    const normalizedCustomers = ensureDefaultCustomer((data.customers as CustomerRecord[]) || []);
    set({
      customers: normalizedCustomers,
      orders: (data.orders as RepairOrder[]) || [],
      budgets: ((data.budgets as unknown[]) || []).map(normalizeBudgetRecord),
      inventory: (data.inventory as InventoryItem[]) || [],
      cashRegisters: (data.cashRegisters as CashRegisterSession[]) || [],
      cashEntries: (data.cashEntries as CashEntry[]) || [],
      expenses: (data.expenses as OperationalExpense[]) || [],
      responsibilityTerm: (data.responsibilityTerm as string) || DEFAULT_RESPONSIBILITY_TERM,
      companyInfo: (data.companyInfo as CompanyInfo) || DEFAULT_COMPANY_INFO,
      financialSettings: (data.financialSettings as FinancialSettings) || DEFAULT_FINANCIAL_SETTINGS,
      paymentMethods: ((data.paymentMethods as PaymentMethod[]) || ["dinheiro", "pix", "debito", "credito", "cartao", "outro"]) as PaymentMethod[],
      nextOrderNumber: Number(data.nextOrderNumber || 1),
      hydrated: true,
    });
    const normalized = {
      customers: normalizedCustomers,
      orders: (data.orders as RepairOrder[]) || [],
      budgets: ((data.budgets as unknown[]) || []).map(normalizeBudgetRecord),
      inventory: (data.inventory as InventoryItem[]) || [],
      cashRegisters: (data.cashRegisters as CashRegisterSession[]) || [],
      cashEntries: (data.cashEntries as CashEntry[]) || [],
      expenses: (data.expenses as OperationalExpense[]) || [],
      responsibilityTerm: (data.responsibilityTerm as string) || DEFAULT_RESPONSIBILITY_TERM,
      companyInfo: (data.companyInfo as CompanyInfo) || DEFAULT_COMPANY_INFO,
      financialSettings: (data.financialSettings as FinancialSettings) || DEFAULT_FINANCIAL_SETTINGS,
      paymentMethods: ((data.paymentMethods as PaymentMethod[]) || ["dinheiro", "pix", "debito", "credito", "cartao", "outro"]) as PaymentMethod[],
      nextOrderNumber: Number(data.nextOrderNumber || 1),
    };
    await upsertAppState(normalized);
  },

  resetLocalData: () => set({ ...initialState, hydrated: true }),

  addOrder: (order) => {
    const state = get();
    const mustLaunchInCash = order.paymentStatus === "pago";
    const paymentDate = order.paymentDate || order.date || new Date().toLocaleDateString("pt-BR");
    const finalizedOrder = {
      ...order,
      paymentDate,
    };

    if (mustLaunchInCash && finalizedOrder.paymentMethod === "dinheiro") {
      const openRegister = state.cashRegisters.find((register) => register.status === "aberto");
      if (!openRegister) {
        return { ok: false, message: "Caixa fechado: para receber em dinheiro, abra o caixa primeiro." };
      }
    }

    set((current) => {
      const nextState: Partial<AppStore> = {
        orders: [finalizedOrder, ...current.orders],
        nextOrderNumber: current.nextOrderNumber + 1,
      };

      if (mustLaunchInCash) {
        const openRegister = current.cashRegisters.find((register) => register.status === "aberto");
        const affectsPhysicalCash = finalizedOrder.paymentMethod === "dinheiro";
        const runningPhysical = openRegister
          ? cashSessionRunningPhysicalBalance(openRegister.id, openRegister.openingAmount, current.cashEntries)
          : 0;
        const total = getOrderTotal(finalizedOrder);
        const entry: CashEntry = {
          id: createId(),
          registerId: openRegister?.id,
          date: paymentDate,
          type: "entrada",
          status: "ativa",
          description: `Recebimento de OS ${finalizedOrder.id}`,
          amount: total,
          paymentMethod: finalizedOrder.paymentMethod,
          source: "os",
          movementType: "entrada_os",
          movementCategory: "venda",
          orderId: finalizedOrder.id,
          orderRef: finalizedOrder.id,
          employeeName: finalizedOrder.technician || "Sistema",
          performedBy: finalizedOrder.technician || "Sistema",
          createdAtIso: new Date().toISOString(),
          affectsPhysicalCash,
          balanceBeforeCents: runningPhysical,
          balanceAfterCents: affectsPhysicalCash ? runningPhysical + total : runningPhysical,
        };
        nextState.cashEntries = [entry, ...current.cashEntries];
      }

      const merged = { ...current, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true };
  },

  addBudget: (budgetInput, actor) => {
    const state = get();
    const now = new Date();
    const validUntil = new Date(now);
    const validityDays = Math.max(1, Number(budgetInput.validityDays || 7));
    validUntil.setDate(validUntil.getDate() + validityDays);
    const customer = state.customers.find((c) => c.id === budgetInput.customerId);
    const budget: BudgetRecord = {
      ...budgetInput,
      id: createId(),
      code: nextBudgetCode(state.budgets),
      customerName: budgetInput.customerName || customer?.name || "Cliente",
      status: "RASCUNHO",
      createdAtIso: now.toISOString(),
      validityDays,
      validUntilIso: validUntil.toISOString(),
      legalValidityText:
        budgetInput.legalValidityText ||
        `Salvo estipulação em contrário, este orçamento tem validade de ${validityDays} dias a partir da data de emissão.`,
      diagnosticFeeAmount: 3000,
      history: [budgetHistory("created", actor, "Orçamento criado")],
    };
    set((current) => {
      const nextState = { budgets: [budget, ...current.budgets] };
      const merged = { ...current, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return budget;
  },

  updateBudget: (id, updates, actor) => {
    const state = get();
    const current = state.budgets.find((item) => item.id === id);
    if (!current) return { ok: false, message: "Orçamento não encontrado." };
    if (current.status === "APROVADO" || current.status === "EXCLUIDO" || Boolean(current.convertedOrderId)) {
      return { ok: false, message: "Este orçamento não pode mais ser editado." };
    }
    set((st) => {
      const nextState = {
        budgets: st.budgets.map((item) =>
          item.id === id
            ? {
                ...item,
                ...updates,
                history: [...(item.history || []), budgetHistory("updated", actor, "Orçamento atualizado")],
              }
            : item
        ),
      };
      const merged = { ...st, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true };
  },

  duplicateBudget: (id, actor) => {
    const state = get();
    const source = state.budgets.find((item) => item.id === id);
    if (!source) return { ok: false, message: "Orçamento não encontrado." };
    const now = new Date();
    const validUntil = new Date(now);
    const validityDays = Math.max(1, Number(source.validityDays || 7));
    validUntil.setDate(validUntil.getDate() + validityDays);
    const duplicate: BudgetRecord = {
      ...source,
      id: createId(),
      code: nextBudgetCode(state.budgets),
      status: "RASCUNHO",
      createdAtIso: now.toISOString(),
      validityDays,
      validUntilIso: validUntil.toISOString(),
      approvedAtIso: undefined,
      rejectedAtIso: undefined,
      expiredAtIso: undefined,
      excludedAtIso: undefined,
      exclusionReason: undefined,
      convertedOrderId: undefined,
      history: [budgetHistory("duplicated", actor, `Duplicado de ${source.code}`)],
    };
    set((st) => {
      const nextState = { budgets: [duplicate, ...st.budgets] };
      const merged = { ...st, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true, budget: duplicate };
  },

  setBudgetStatus: (id, status, actor, details) => {
    const state = get();
    const current = state.budgets.find((item) => item.id === id);
    if (!current) return { ok: false, message: "Orçamento não encontrado." };
    const expiredNow = new Date(current.validUntilIso).getTime() < Date.now();
    if (expiredNow && current.status !== "EXPIRADO") {
      status = "EXPIRADO";
      details = "Expiração automática por validade.";
    }
    if (current.status === "EXCLUIDO") return { ok: false, message: "Orçamento excluído não pode mudar de status." };
    if (current.status === "CONVERTIDO_OS" || current.convertedOrderId) {
      return { ok: false, message: "Orçamento convertido em OS não pode alterar status." };
    }
    if (current.status === "EXPIRADO" && (status === "APROVADO" || status === "AGUARDANDO_APROVACAO")) {
      return { ok: false, message: "Orçamento expirado não pode ser aprovado." };
    }
    set((st) => {
      const nowIso = new Date().toISOString();
      const nextState = {
        budgets: st.budgets.map((item) => {
          if (item.id !== id) return item;
          return {
            ...item,
            status,
            approvedAtIso: status === "APROVADO" ? nowIso : item.approvedAtIso,
            rejectedAtIso: status === "REPROVADO" ? nowIso : item.rejectedAtIso,
            expiredAtIso: status === "EXPIRADO" ? nowIso : item.expiredAtIso,
            history: [...(item.history || []), budgetHistory("status_changed", actor, `${item.status} -> ${status}${details ? ` | ${details}` : ""}`)],
          };
        }),
      };
      const merged = { ...st, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true };
  },

  deleteBudget: (id, reason, actor) => {
    const normalizedReason = reason.trim();
    if (normalizedReason.length < 10) return { ok: false, message: "Informe o motivo da exclusão com no mínimo 10 caracteres." };
    const budget = get().budgets.find((item) => item.id === id);
    if (!budget) return { ok: false, message: "Orçamento não encontrado." };
    if (budget.status === "APROVADO") return { ok: false, message: "Orçamento aprovado não pode ser excluído." };
    if (budget.convertedOrderId || budget.status === "CONVERTIDO_OS") {
      return { ok: false, message: "Orçamento convertido em Ordem de Serviço não pode ser excluído." };
    }
    if (!["RASCUNHO", "ENVIADO", "AGUARDANDO_APROVACAO", "REPROVADO", "EXPIRADO"].includes(budget.status)) {
      return { ok: false, message: "Status atual não permite exclusão." };
    }
    set((state) => {
      const nextState = {
        budgets: state.budgets.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "EXCLUIDO" as const,
                excludedAtIso: new Date().toISOString(),
                exclusionReason: normalizedReason,
                history: [...(item.history || []), budgetHistory("deleted", actor, normalizedReason)],
              }
            : item
        ),
      };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true };
  },

  convertBudgetToOrder: (id, actor) => {
    const state = get();
    const budget = state.budgets.find((item) => item.id === id);
    if (!budget) return { ok: false, message: "Orçamento não encontrado." };
    if (budget.status !== "APROVADO") return { ok: false, message: "Somente orçamento aprovado pode ser convertido." };
    if (budget.status === "EXCLUIDO") return { ok: false, message: "Orçamento excluído não pode ser convertido." };
    if (budget.status === "EXPIRADO" || new Date(budget.validUntilIso).getTime() < Date.now()) {
      return { ok: false, message: "Orçamento expirado não pode ser convertido em OS." };
    }
    if (budget.convertedOrderId) return { ok: false, message: "Orçamento já convertido." };
    const customer = state.customers.find((item) => item.id === budget.customerId);
    if (!customer) return { ok: false, message: "Cliente obrigatório para conversão em Ordem de Serviço." };

    const orderId = `OS-${state.nextOrderNumber}`;
    const today = new Date().toLocaleDateString("pt-BR");
    const partsItems = budget.items.filter((item) => item.type === "estoque");
    const serviceItems = budget.items.filter((item) => item.type !== "estoque");
    const partsCost = partsItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const serviceCost = serviceItems.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const discount = budget.discountAmount || 0;
    const order: RepairOrder = {
      id: orderId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
      customerCpf: customer.cpf,
      deviceType: "phone",
      brand: budget.equipment || "-",
      model: budget.equipment || "-",
      serialImei: "",
      devicePassword: "",
      deviceColor: "",
      accessories: "",
      conditionNotes: "",
      checklist: {},
      reportedProblem: budget.problemDescription,
      technicianDiagnosis: "",
      repairActions: "",
      serviceCost,
      partsCost,
      discount,
      paymentMethod: "dinheiro",
      paymentStatus: "pendente",
      paymentDate: "",
      usedParts: partsItems.map((item) => ({
        inventoryId: item.inventoryItemId || "",
        name: item.description,
        qty: item.qty,
        unitCost: item.unitCost || item.unitPrice,
      })),
      cost: formatCurrency(serviceCost),
      partsUsed: partsItems.map((item) => item.description).join(", "),
      estimatedDelivery: "",
      technician: "",
      status: "received",
      date: today,
      completedDate: "",
      warrantyDays: 90,
      termAccepted: false,
      entryPhotos: [],
      exitPhotos: [],
      history: [
        {
          at: new Date().toLocaleString("pt-BR"),
          action: "order_created_from_budget",
          changedFields: ["budget_id"],
          after: { id: budget.id } as unknown as Partial<RepairOrder>,
        },
      ],
    };

    set((st) => {
      const nextState = {
        orders: [order, ...st.orders],
        budgets: st.budgets.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "CONVERTIDO_OS" as const,
                convertedOrderId: orderId,
                history: [...(item.history || []), budgetHistory("converted_to_order", actor, `Convertido para ${orderId}`)],
              }
            : item
        ),
        nextOrderNumber: st.nextOrderNumber + 1,
      };
      const merged = { ...st, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true, orderId };
  },

  deleteOrder: (id) =>
    set((state) => {
      const nextState = {
        orders: state.orders.filter((order) => order.id !== id),
        cashEntries: state.cashEntries.filter((entry) => entry.orderId !== id),
      };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  updateOrder: (id, updates) => {
    const state = get();
    const current = state.orders.find((order) => order.id === id);
    if (!current) return { ok: false, message: "Ordem de Serviço não encontrada." };

    const nextOrder = { ...current, ...updates };
    const becamePaid = current.paymentStatus !== "pago" && nextOrder.paymentStatus === "pago";
    const isPaidAfterUpdate = nextOrder.paymentStatus === "pago";
    const nextPaymentDate = nextOrder.paymentDate || new Date().toLocaleDateString("pt-BR");
    const hasValidPartsCost = Number.isFinite(Number(nextOrder.partsCost)) && Number(nextOrder.partsCost) >= 0;

    if (Object.prototype.hasOwnProperty.call(updates, "partsCost")) {
      const incoming = Number(updates.partsCost);
      if (!Number.isFinite(incoming) || incoming < 0) {
        return { ok: false, message: "Custo da OS inválido. Informe valor maior ou igual a 0." };
      }
    }

    if ((becamePaid || updates.paymentStatus === "pago") && !hasValidPartsCost) {
      return { ok: false, message: "Para marcar como pago, informe o custo da OS (>= 0)." };
    }

    if (becamePaid && nextOrder.paymentMethod === "dinheiro") {
      const openRegister = state.cashRegisters.find((register) => register.status === "aberto");
      if (!openRegister) {
        return { ok: false, message: "Caixa fechado: pagamento em dinheiro exige caixa aberto." };
      }
    }

    set((currentState) => {
      const timestamp = new Date().toLocaleString("pt-BR");
      const targetBefore = currentState.orders.find((order) => order.id === id);
      if (!targetBefore) return currentState;

      const after = {
        ...targetBefore,
        ...updates,
        paymentDate: isPaidAfterUpdate ? nextOrder.paymentDate || nextPaymentDate : nextOrder.paymentDate,
      };
      const changedFields = Object.keys(updates).filter(
        (field) =>
          JSON.stringify((targetBefore as Record<string, unknown>)[field]) !==
          JSON.stringify((after as Record<string, unknown>)[field])
      );
      const action = changedFields.includes("status") ? "status_changed" : "order_updated";
      const historyEntry: OrderHistoryEntry = {
        at: timestamp,
        action,
        changedFields,
        before: targetBefore,
        after: updates,
      };

      const nextState: Partial<AppStore> = {
        orders: currentState.orders.map((order) =>
          order.id === id ? { ...after, history: [historyEntry, ...(order.history || [])] } : order
        ),
      };

      if (after.paymentStatus === "pago") {
        const existingActiveOrderEntry = currentState.cashEntries.find(
          (entry) => entry.orderId === id && entry.source === "os" && entry.status !== "cancelada" && entry.status !== "estornada"
        );
        if (existingActiveOrderEntry) {
          const openRegister = currentState.cashRegisters.find((register) => register.status === "aberto");
          const affectsPhysicalCash = after.paymentMethod === "dinheiro";
          nextState.cashEntries = currentState.cashEntries.map((entry) =>
            entry.id === existingActiveOrderEntry.id
              ? {
                  ...entry,
                  financialStatus: "pago",
                  date: after.paymentDate || nextPaymentDate,
                  paymentMethod: after.paymentMethod,
                  amount: getOrderTotal(after),
                  description: `Recebimento de OS ${after.id}`,
                  employeeName: after.technician || entry.employeeName || "Sistema",
                  performedBy: after.technician || entry.performedBy || "Sistema",
                  affectsPhysicalCash,
                  registerId: affectsPhysicalCash ? openRegister?.id : undefined,
                }
              : entry
          );
        } else {
          const openRegister = currentState.cashRegisters.find((register) => register.status === "aberto");
          const affectsPhysicalCash = after.paymentMethod === "dinheiro";
          const runningPhysical =
            openRegister && affectsPhysicalCash
              ? cashSessionRunningPhysicalBalance(openRegister.id, openRegister.openingAmount, currentState.cashEntries)
              : 0;
          const total = getOrderTotal(after);
          const entry: CashEntry = {
            id: createId(),
            registerId: openRegister?.id,
            date: after.paymentDate || nextPaymentDate,
            type: "entrada",
            status: "ativa",
            description: `Recebimento de OS ${after.id}`,
            amount: total,
            paymentMethod: after.paymentMethod,
            source: "os",
            movementType: "entrada_os",
            movementCategory: "venda",
            orderId: after.id,
            orderRef: after.id,
            employeeName: after.technician || "Sistema",
            performedBy: after.technician || "Sistema",
            createdAtIso: new Date().toISOString(),
            affectsPhysicalCash,
            balanceBeforeCents: runningPhysical,
            balanceAfterCents: affectsPhysicalCash ? runningPhysical + total : runningPhysical,
          };
          nextState.cashEntries = [entry, ...currentState.cashEntries];
        }
      } else {
        const existingActiveOrderEntry = currentState.cashEntries.find(
          (entry) => entry.orderId === id && entry.source === "os" && entry.status !== "cancelada" && entry.status !== "estornada"
        );
        if (existingActiveOrderEntry) {
          nextState.cashEntries = currentState.cashEntries.map((entry) =>
            entry.id === existingActiveOrderEntry.id
              ? {
                  ...entry,
                  financialStatus: "previsto",
                  date: after.date,
                  paymentMethod: after.paymentMethod,
                  amount: getOrderTotal(after),
                  description: `Previsto OS ${after.id} - ${after.customerName}`,
                  affectsPhysicalCash: false,
                  registerId: undefined,
                  balanceBeforeCents: undefined,
                  balanceAfterCents: undefined,
                }
              : entry
          );
        }
      }

      const merged = { ...currentState, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });

    return { ok: true };
  },

  addCustomer: (customer) =>
    set((state) => {
      const normalizedName = normalizeIdentity(customer.name);
      const normalizedPhone = normalizePhone(customer.phone);
      const duplicated = state.customers.find(
        (item) =>
          item.id !== DEFAULT_CUSTOMER.id &&
          normalizeIdentity(item.name) === normalizedName &&
          normalizePhone(item.phone) === normalizedPhone
      );

      const finalCustomer = duplicated
        ? { ...duplicated, ...customer, id: duplicated.id }
        : customer;

      const withoutSame = state.customers.filter((item) => item.id !== finalCustomer.id);
      const nextState = { customers: ensureDefaultCustomer([finalCustomer, ...withoutSame]) };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  updateCustomer: (id, updates) =>
    set((state) => {
      const nextState = {
        customers: ensureDefaultCustomer(
          state.customers.map((customer) => (customer.id === id ? { ...customer, ...updates } : customer))
        ),
      };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  deleteCustomer: (id) =>
    set((state) => {
      if (id === DEFAULT_CUSTOMER.id) return state;
      const nextState = { customers: ensureDefaultCustomer(state.customers.filter((customer) => customer.id !== id)) };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  addInventoryItem: (item) =>
    set((state) => {
      const nextState = { inventory: [...state.inventory, item] };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  updateInventoryItem: (id, updates) =>
    set((state) => {
      const nextState = {
        inventory: state.inventory.map((item) => (item.id === id ? { ...item, ...updates } : item)),
      };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  replaceInventoryItemId: (oldId, newId) =>
    set((state) => {
      if (oldId === newId) return state;
      const nextState = {
        inventory: state.inventory.map((item) => (item.id === oldId ? { ...item, id: newId } : item)),
      };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  deleteInventoryItem: (id) =>
    set((state) => {
      const nextState = {
        inventory: state.inventory.filter((item) => item.id !== id),
      };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  deductStock: (inventoryId, qty) =>
    set((state) => {
      const nextState = {
        inventory: state.inventory.map((item) =>
          item.id === inventoryId ? { ...item, qty: Math.max(0, item.qty - qty) } : item
        ),
      };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  openCashRegister: ({ employeeName, openingAmount, notes }) => {
    const state = get();
    const name = employeeName.trim();
    if (name.length < 3) return { ok: false, message: "Informe o nome do funcionário responsável." };
    if (!Number.isFinite(openingAmount) || openingAmount <= 100) {
      return { ok: false, message: "O valor de abertura deve ser maior que R$ 1,00." };
    }
    const now = new Date();
    const staleOpen = state.cashRegisters.find((register) => {
      if (register.status !== "aberto") return false;
      const openedAt = new Date(register.openedAtIso);
      return (
        openedAt.getFullYear() !== now.getFullYear() ||
        openedAt.getMonth() !== now.getMonth() ||
        openedAt.getDate() !== now.getDate()
      );
    });
    const activeOpen = state.cashRegisters.find((register) => register.status === "aberto" && register.id !== staleOpen?.id);
    if (activeOpen) {
      return { ok: false, message: "Já existe um caixa aberto. Feche o caixa atual antes de abrir outro." };
    }
    const register: CashRegisterSession = {
      id: createId(),
      openedAtIso: now.toISOString(),
      openedBy: name,
      openingAmount: Math.round(openingAmount),
      openingNotes: notes?.trim() || undefined,
      status: "aberto",
    };
    set((current) => {
      const nextState = {
        cashRegisters: [
          register,
          ...current.cashRegisters.map((row) =>
            row.id === staleOpen?.id
              ? {
                  ...row,
                  status: "fechado" as const,
                  closedAtIso: now.toISOString(),
                  closedBy: "Sistema",
                  closingNotes: "Fechamento automático de caixa de dia anterior.",
                }
              : row
          ),
        ],
      };
      const merged = { ...current, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true, id: register.id };
  },

  closeCashRegister: ({ employeeName, countedAmount, notes }) => {
    const state = get();
    const openRegister = state.cashRegisters.find((register) => register.status === "aberto");
    if (!openRegister) return { ok: false, message: "Não existe caixa aberto para fechamento." };
    const name = employeeName.trim();
    if (name.length < 3) return { ok: false, message: "Informe o nome do funcionário que está fechando." };
    if (!Number.isFinite(countedAmount) || countedAmount < 0) return { ok: false, message: "Valor contado inválido." };

    const cashEntriesInRegister = state.cashEntries.filter(
      (entry) =>
        entry.registerId === openRegister.id &&
        entry.status !== "cancelada" &&
        entry.status !== "estornada" &&
        (entry.affectsPhysicalCash ?? entry.paymentMethod === "dinheiro")
    );
    const totalCashIn = cashEntriesInRegister
      .filter((entry) => entry.type === "entrada")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const totalCashOut = cashEntriesInRegister
      .filter((entry) => entry.type === "saida")
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expected = openRegister.openingAmount + totalCashIn - totalCashOut;
    const counted = Math.round(countedAmount);
    const difference = counted - expected;
    if (difference !== 0 && (!notes || notes.trim().length < 10)) {
      return { ok: false, message: "Diferença de caixa exige justificativa (mínimo de 10 caracteres)." };
    }

    set((current) => {
      const nextState = {
        cashRegisters: current.cashRegisters.map((register) =>
          register.id === openRegister.id
            ? {
                ...register,
                status: "fechado" as const,
                closedAtIso: new Date().toISOString(),
                closedBy: name,
                totalCashIn,
                totalCashOut,
                expectedCashAtClose: expected,
                countedCashAtClose: counted,
                differenceAtClose: difference,
                closingNotes: notes?.trim() || undefined,
              }
            : register
        ),
      };
      const merged = { ...current, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true, difference };
  },

  addCashMovement: ({
    type,
    category,
    paymentMethod,
    amount,
    description,
    employeeName,
    orderRef,
    notes,
    cashReceivedAmount,
    changeDueAmount,
  }) => {
    const state = get();
    const openRegister = state.cashRegisters.find((register) => register.status === "aberto");
    if (!openRegister) return { ok: false, message: "Abertura de caixa obrigatória antes de registrar movimentações." };

    const now = new Date();
    const openedAt = new Date(openRegister.openedAtIso);
    if (
      openedAt.getFullYear() !== now.getFullYear() ||
      openedAt.getMonth() !== now.getMonth() ||
      openedAt.getDate() !== now.getDate()
    ) {
      return { ok: false, message: "O caixa aberto pertence ao dia anterior. Feche o caixa antes de continuar." };
    }

    const name = employeeName.trim();
    if (name.length < 3) return { ok: false, message: "Informe o nome do funcionário responsável." };
    const value = Math.round(amount);
    if (!Number.isFinite(value) || value <= 0) return { ok: false, message: "Valor da movimentação inválido." };
    if (paymentMethod !== "dinheiro") {
      return { ok: false, message: "No caixa operacional, registre apenas movimentações em dinheiro." };
    }
    if (category === "suprimento" && type !== "entrada") {
      return { ok: false, message: "Suprimento deve ser uma entrada." };
    }
    if (category === "sangria" && type !== "saida") {
      return { ok: false, message: "Sangria deve ser uma saída." };
    }
    if (category === "ajuste" && (!notes || notes.trim().length < 10)) {
      return { ok: false, message: "Ajuste exige justificativa com no mínimo 10 caracteres." };
    }
    if (paymentMethod === "dinheiro" && type === "entrada") {
      const received = Math.round(cashReceivedAmount || 0);
      if (!Number.isFinite(received) || received <= 0) {
        return { ok: false, message: "Informe o valor recebido em dinheiro." };
      }
      if (received < value) {
        return { ok: false, message: "Valor recebido menor que o valor da movimentação." };
      }
    }

    const affectsPhysicalCash = paymentMethod === "dinheiro";
    const currentPhysical = cashSessionRunningPhysicalBalance(
      openRegister.id,
      openRegister.openingAmount,
      state.cashEntries
    );
    const projectedPhysical = affectsPhysicalCash
      ? currentPhysical + (type === "entrada" ? value : -value)
      : currentPhysical;
    if (projectedPhysical < 0) {
      return { ok: false, message: "O caixa físico não pode ficar negativo. Realize um suprimento antes." };
    }

    const entry: CashEntry = {
      id: createId(),
      registerId: openRegister.id,
      date: now.toLocaleDateString("pt-BR"),
      type,
      status: "ativa",
      description: description.trim() || "Movimentação de caixa",
      amount: value,
      paymentMethod,
      performedBy: name,
      employeeName: name,
      movementCategory: category,
      category: category.toUpperCase(),
      source:
        category === "ajuste"
          ? "ajuste"
          : category === "sangria"
            ? "despesa"
            : "manual",
      movementType:
        category === "sangria"
          ? "retirada_sangria"
          : category === "ajuste"
            ? "ajuste_caixa"
            : "entrada_manual",
      orderRef: orderRef?.trim() || undefined,
      notes: notes?.trim() || undefined,
      createdAtIso: now.toISOString(),
      affectsPhysicalCash,
      cashReceivedAmount:
        paymentMethod === "dinheiro" && type === "entrada"
          ? Math.round(cashReceivedAmount || value)
          : undefined,
      changeDueAmount:
        paymentMethod === "dinheiro" && type === "entrada"
          ? Math.max(0, Math.round(changeDueAmount || 0))
          : undefined,
      balanceBeforeCents: currentPhysical,
      balanceAfterCents: projectedPhysical,
    };

    set((current) => {
      const nextState = { cashEntries: [entry, ...current.cashEntries] };
      const merged = { ...current, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true, id: entry.id };
  },

  addCashEntry: (entry) =>
    set((state) => {
      if (!entry || !Number.isFinite(entry.amount) || entry.amount <= 0) {
        return state;
      }
      const running = state.cashEntries
        .sort((a, b) => (a.createdAtIso || "").localeCompare(b.createdAtIso || ""))
        .reduce(
          (sum, row) =>
            row.status === "cancelada" || row.status === "estornada"
              ? sum
              : cashAffectsPhysical(row)
                ? sum + (row.type === "entrada" ? row.amount : -row.amount)
                : sum,
          0
        );
      const affectsPhysicalCash = cashAffectsPhysical(entry);
      const projected = affectsPhysicalCash ? running + (entry.type === "entrada" ? entry.amount : -entry.amount) : running;
      if (affectsPhysicalCash && projected < 0) {
        return state;
      }
      const nextEntry: CashEntry = {
        ...entry,
        status: entry.status || "ativa",
        createdAtIso: entry.createdAtIso || new Date().toISOString(),
        affectsPhysicalCash,
        balanceBeforeCents: running,
        balanceAfterCents: projected,
      };
      const nextState = { cashEntries: [nextEntry, ...state.cashEntries] };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),
  reverseCashEntry: (id, reason, performedBy) => {
    const state = get();
    const target = state.cashEntries.find((entry) => entry.id === id);
    if (!target) return { ok: false, message: "Movimentação não encontrada." };
    if (target.status === "cancelada") return { ok: false, message: "Não é permitido estornar movimentação cancelada." };
    if (!reason.trim() || reason.trim().length < 5) return { ok: false, message: "Informe o motivo do estorno." };
    if (target.status === "estornada") return { ok: false, message: "Esta movimentação já foi estornada." };

    set((current) => {
      const nextState = {
        cashEntries: current.cashEntries.map((entry) =>
          entry.id === target.id
            ? {
                ...entry,
                status: "estornada" as const,
                reversedAtIso: new Date().toISOString(),
                reversedBy: performedBy || "Usuário",
                reversedReason: reason.trim(),
                notes: `${entry.notes ? `${entry.notes} | ` : ""}Estornada. Motivo: ${reason.trim()}`,
              }
            : entry
        ),
      };
      const merged = { ...current, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true };
  },

  cancelCashEntry: (id, reason, performedBy) => {
    const state = get();
    const target = state.cashEntries.find((entry) => entry.id === id);
    if (!target) return { ok: false, message: "Movimentação não encontrada." };
    if (target.status === "cancelada") return { ok: false, message: "Movimentação já está cancelada." };
    if (!reason.trim() || reason.trim().length < 5) return { ok: false, message: "Informe o motivo do cancelamento." };
    const linkedIds = new Set<string>([id]);

    set((current) => {
      const openingCanceled = current.cashEntries.find(
        (entry) =>
          linkedIds.has(entry.id) &&
          entry.type === "entrada" &&
          (entry.description === "Abertura de caixa" || entry.description === "Caixa inicial")
      );
      const nextState = {
        cashEntries: current.cashEntries.map((entry) =>
          linkedIds.has(entry.id)
            ? {
                ...entry,
                status: "cancelada" as const,
                canceledAtIso: new Date().toISOString(),
                canceledBy: performedBy || "Usuario",
                canceledReason: reason.trim(),
                notes: `${entry.notes ? `${entry.notes} | ` : ""}Cancelada logicamente. Motivo: ${reason.trim()}`,
              }
            : entry
        ),
        cashRegisters: openingCanceled?.registerId
          ? current.cashRegisters.map((register) =>
              register.id === openingCanceled.registerId
                ? { ...register, openingAmount: 0 }
                : register
            )
          : current.cashRegisters,
      };
      const merged = { ...current, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    });
    return { ok: true };
  },

  addExpense: (expense) =>
    set((state) => {
      const nextState = { expenses: [expense, ...state.expenses] };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  removeExpense: (id) =>
    set((state) => {
      const nextState = { expenses: state.expenses.filter((expense) => expense.id !== id) };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  setCashOpening: (date, amount) =>
    set((state) => {
      const [d, m, y] = date.split("/").map(Number);
      const openingIso =
        d && m && y
          ? new Date(y, m - 1, d, 0, 0, 0, 0).toISOString()
          : new Date().toISOString();
      const existing = state.cashEntries.find(
        (entry) =>
          entry.date === date &&
          (entry.description === "Abertura de caixa" || entry.description === "Caixa inicial") &&
          entry.status !== "cancelada"
      );
      const openingEntry: CashEntry = existing
        ? { ...existing, amount, status: "ativa", createdAtIso: existing.createdAtIso || openingIso }
        : { id: createId(), date, type: "entrada", status: "ativa", description: "Abertura de caixa", amount, createdAtIso: openingIso };
      const withoutExisting = state.cashEntries.filter((entry) => entry.id !== openingEntry.id);
      const nextState = { cashEntries: [openingEntry, ...withoutExisting] };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  setResponsibilityTerm: (term) =>
    set((state) => {
      const nextState = { responsibilityTerm: term };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  setCompanyInfo: (info) =>
    set((state) => {
      const nextState = { companyInfo: info };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  setFinancialSettings: (settings) =>
    set((state) => {
      const nextState = { financialSettings: settings };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),

  setPaymentMethods: (methods) =>
    set((state) => {
      const unique = Array.from(new Set(methods));
      const nextState = { paymentMethods: unique.length ? unique : ["dinheiro", "pix", "debito", "credito", "cartao", "outro"] };
      const merged = { ...state, ...nextState };
      void persist(merged as AppStore);
      return nextState;
    }),
}));



