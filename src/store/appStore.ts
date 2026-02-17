import { create } from "zustand";

// ============= TYPES =============

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  cnpj: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: "Minha Assistência Técnica",
  address: "Rua Exemplo, 123 - Centro - São Paulo/SP",
  phone: "(11) 99999-9999",
  email: "contato@minhaassistencia.com.br",
  cnpj: "",
};

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  qty: number;
  minQty: number;
  costPrice: number; // custo unitário em centavos
  supplier: string;
}

export interface UsedPart {
  inventoryId: string;
  name: string;
  qty: number;
  unitCost: number; // centavos
}

export type PaymentMethod = "dinheiro" | "pix" | "cartao" | "outro";
export type PaymentStatus = "pago" | "pendente" | "parcial";

export interface RepairOrder {
  id: string;
  // Customer
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCpf: string;
  // Device
  deviceType: "phone" | "notebook" | "tablet";
  brand: string;
  model: string;
  serialImei: string;
  devicePassword: string;
  deviceColor: string;
  accessories: string;
  // Condition
  conditionNotes: string;
  // Checklist
  checklist: Record<string, boolean>;
  // Problem & Repair
  reportedProblem: string;
  technicianDiagnosis: string;
  repairActions: string;
  // Financial
  serviceCost: number; // centavos
  partsCost: number;   // centavos - auto-calculated
  discount: number;    // centavos
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDate: string;
  // Stock
  usedParts: UsedPart[];
  // Legacy compat
  cost: string;
  partsUsed: string;
  estimatedDelivery: string;
  // Meta
  technician: string;
  status: string;
  date: string;
  completedDate: string;
  // Warranty
  warrantyDays: number;
  // Responsibility term accepted
  termAccepted: boolean;
  // Photos (base64 data URLs)
  entryPhotos: string[];
  exitPhotos: string[];
}

export interface CashEntry {
  id: string;
  date: string;
  type: "entrada" | "saida";
  description: string;
  amount: number; // centavos
  orderId?: string;
}

// ============= DEFAULTS & CHECKLIST =============

export const DEFAULT_RESPONSIBILITY_TERM = `TERMO DE RESPONSABILIDADE - RETIRADA DE EQUIPAMENTO

Eu, abaixo identificado(a), declaro que estou retirando o equipamento descrito nesta ordem de serviço, após o reparo realizado pela assistência técnica.

Declaro estar ciente de que:

1. O equipamento foi testado e aprovado em minha presença no momento da retirada.
2. Qualquer dano causado ao equipamento após a retirada é de minha inteira responsabilidade.
3. A garantia do serviço realizado é válida por 90 (noventa) dias, contados a partir da data de retirada, cobrindo apenas o serviço executado.
4. A garantia não cobre danos causados por mau uso, quedas, contato com líquidos ou tentativas de reparo por terceiros.
5. Peças substituídas durante o reparo não serão devolvidas, salvo solicitação prévia.
6. Caso o equipamento não seja retirado em até 90 (noventa) dias após a notificação de conclusão, a empresa não se responsabiliza pela guarda do mesmo.

Ao assinar este termo, confirmo que li, compreendi e concordo com todas as condições acima descritas.`;

export const PHONE_CHECKLIST_ITEMS = [
  "Tela (display e touch)", "Botões físicos (volume, power, home)", "Alto-falante / Auricular", "Microfone",
  "Câmera frontal", "Câmera traseira", "Carregamento / Conector", "Wi-Fi", "Bluetooth",
  "Biometria (digital/facial)", "Chip / Sinal", "GPS", "Sensor de proximidade", "Vibração", "NFC", "Bateria (estado geral)",
];

export const NOTEBOOK_CHECKLIST_ITEMS = [
  "Tela (display e touch se aplicável)", "Teclado (todas as teclas)", "Trackpad / Touchpad", "Webcam",
  "Alto-falantes", "Microfone", "Portas USB", "Porta HDMI / DisplayPort", "Carregamento / Conector de energia",
  "Wi-Fi", "Bluetooth", "Bateria (estado geral)", "Ventilação / Cooler", "Dobradiça / Tampa", "Leitor de cartão SD", "Biometria (se aplicável)",
];

export const TABLET_CHECKLIST_ITEMS = [
  "Tela (display e touch)", "Botões físicos (volume, power, home)", "Alto-falante", "Microfone",
  "Câmera frontal", "Câmera traseira", "Carregamento / Conector", "Wi-Fi", "Bluetooth",
  "Biometria (se aplicável)", "Sensor de proximidade", "GPS", "Bateria (estado geral)", "Caneta stylus (se aplicável)",
];

export function getChecklistItems(deviceType: string): string[] {
  switch (deviceType) {
    case "notebook": return NOTEBOOK_CHECKLIST_ITEMS;
    case "tablet": return TABLET_CHECKLIST_ITEMS;
    default: return PHONE_CHECKLIST_ITEMS;
  }
}

// ============= HELPERS =============

export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseCurrency(str: string): number {
  const cleaned = str.replace(/[^\d,.-]/g, "").replace(",", ".");
  return Math.round(parseFloat(cleaned || "0") * 100);
}

export function getOrderTotal(order: RepairOrder): number {
  return order.serviceCost + order.partsCost - order.discount;
}

export function getOrderProfit(order: RepairOrder): number {
  const partsCostReal = order.usedParts.reduce((sum, p) => sum + p.unitCost * p.qty, 0);
  return getOrderTotal(order) - partsCostReal;
}

// ============= SEED DATA =============

const SEED_INVENTORY: InventoryItem[] = [
  { id: "inv-1", name: "Tela iPhone 15 Pro", category: "Telas", sku: "SCR-IP15P", qty: 3, minQty: 5, costPrice: 28000, supplier: "TechParts BR" },
  { id: "inv-2", name: "Bateria Samsung S24", category: "Baterias", sku: "BAT-SS24", qty: 12, minQty: 5, costPrice: 8500, supplier: "CellBat" },
  { id: "inv-3", name: "Conector USB-C iPad", category: "Conectores", sku: "CON-USBC", qty: 2, minQty: 3, costPrice: 4500, supplier: "TechParts BR" },
  { id: "inv-4", name: "Tela MacBook Air M3", category: "Telas", sku: "SCR-MBA3", qty: 1, minQty: 2, costPrice: 120000, supplier: "AppleFix" },
  { id: "inv-5", name: "Câmera Xiaomi 14", category: "Câmeras", sku: "CAM-XI14", qty: 0, minQty: 2, costPrice: 12000, supplier: "ChinaParts" },
  { id: "inv-6", name: "Pasta Térmica Arctic", category: "Insumos", sku: "TH-ARC01", qty: 18, minQty: 5, costPrice: 3500, supplier: "TechParts BR" },
  { id: "inv-7", name: "SSD NVMe 512GB", category: "Armazenamento", sku: "SSD-512N", qty: 4, minQty: 3, costPrice: 22000, supplier: "MemoryKing" },
  { id: "inv-8", name: "Tela Samsung S24", category: "Telas", sku: "SCR-SS24", qty: 1, minQty: 3, costPrice: 35000, supplier: "CellBat" },
];

const SEED_ORDERS: RepairOrder[] = [
  {
    id: "OS-2401", customerName: "Carlos Silva", customerPhone: "(11) 99234-5678", customerEmail: "carlos@email.com", customerCpf: "123.456.789-00",
    deviceType: "phone", brand: "Apple", model: "iPhone 15 Pro", serialImei: "353456789012345", devicePassword: "1234", deviceColor: "Titânio Natural", accessories: "Capinha, carregador",
    conditionNotes: "Tela trincada lado direito", checklist: { "Tela (display e touch)": false, "Câmera traseira": true, "Wi-Fi": true },
    reportedProblem: "Tela quebrada após queda", technicianDiagnosis: "Display e touch danificados", repairActions: "Troca de tela",
    serviceCost: 45000, partsCost: 28000, discount: 0, paymentMethod: "pix", paymentStatus: "pago", paymentDate: "16/02/2026",
    usedParts: [{ inventoryId: "inv-1", name: "Tela iPhone 15 Pro", qty: 1, unitCost: 28000 }],
    cost: "R$ 450,00", partsUsed: "Tela iPhone 15 Pro", estimatedDelivery: "19/02/2026",
    technician: "Ricardo", status: "repairing", date: "16/02/2026", completedDate: "", warrantyDays: 90,
    termAccepted: true, entryPhotos: [], exitPhotos: []
  },
  {
    id: "OS-2402", customerName: "Maria Santos", customerPhone: "(11) 98765-4321", customerEmail: "maria@email.com", customerCpf: "987.654.321-00",
    deviceType: "notebook", brand: "Apple", model: "MacBook Air M3", serialImei: "C02X1234ABCD", devicePassword: "", deviceColor: "Prateado", accessories: "Carregador MagSafe",
    conditionNotes: "Sem marcas visíveis", checklist: { "Tela (display e touch se aplicável)": true, "Wi-Fi": true },
    reportedProblem: "Não liga", technicianDiagnosis: "", repairActions: "",
    serviceCost: 0, partsCost: 0, discount: 0, paymentMethod: "pix", paymentStatus: "pendente", paymentDate: "",
    usedParts: [], cost: "-", partsUsed: "", estimatedDelivery: "-",
    technician: "Felipe", status: "diagnosing", date: "15/02/2026", completedDate: "", warrantyDays: 90,
    termAccepted: true, entryPhotos: [], exitPhotos: []
  },
  {
    id: "OS-2403", customerName: "João Oliveira", customerPhone: "(21) 97654-3210", customerEmail: "joao@email.com", customerCpf: "456.789.123-00",
    deviceType: "phone", brand: "Samsung", model: "Samsung S24", serialImei: "354567890123456", devicePassword: "0000", deviceColor: "Preto", accessories: "Nenhum",
    conditionNotes: "Bateria estufando", checklist: { "Bateria (estado geral)": false, "Tela (display e touch)": true },
    reportedProblem: "Bateria inchada", technicianDiagnosis: "Bateria com defeito", repairActions: "",
    serviceCost: 28000, partsCost: 8500, discount: 0, paymentMethod: "cartao", paymentStatus: "pendente", paymentDate: "",
    usedParts: [{ inventoryId: "inv-2", name: "Bateria Samsung S24", qty: 1, unitCost: 8500 }],
    cost: "R$ 280,00", partsUsed: "Bateria Samsung S24", estimatedDelivery: "20/02/2026",
    technician: "Ricardo", status: "waiting_parts", date: "15/02/2026", completedDate: "", warrantyDays: 90,
    termAccepted: true, entryPhotos: [], exitPhotos: []
  },
  {
    id: "OS-2404", customerName: "Ana Costa", customerPhone: "(31) 96543-2109", customerEmail: "ana@email.com", customerCpf: "321.654.987-00",
    deviceType: "phone", brand: "Apple", model: "iPhone 14", serialImei: "353111222333444", devicePassword: "5678", deviceColor: "Azul", accessories: "Nenhum",
    conditionNotes: "", checklist: { "Tela (display e touch)": true, "Carregamento / Conector": false },
    reportedProblem: "Conector de carga danificado", technicianDiagnosis: "Conector com oxidação", repairActions: "Troca do conector",
    serviceCost: 18000, partsCost: 4500, discount: 2000, paymentMethod: "dinheiro", paymentStatus: "pago", paymentDate: "10/02/2026",
    usedParts: [{ inventoryId: "inv-3", name: "Conector USB-C iPad", qty: 1, unitCost: 4500 }],
    cost: "R$ 180,00", partsUsed: "Conector USB-C", estimatedDelivery: "12/02/2026",
    technician: "Felipe", status: "completed", date: "08/02/2026", completedDate: "10/02/2026", warrantyDays: 90,
    termAccepted: true, entryPhotos: [], exitPhotos: []
  },
  {
    id: "OS-2405", customerName: "Pedro Souza", customerPhone: "(41) 95432-1098", customerEmail: "pedro@email.com", customerCpf: "654.987.321-00",
    deviceType: "phone", brand: "Samsung", model: "Samsung S23", serialImei: "354999888777666", devicePassword: "", deviceColor: "Verde", accessories: "Capa",
    conditionNotes: "Tela com riscos leves", checklist: { "Tela (display e touch)": true, "Câmera frontal": true },
    reportedProblem: "Tela com manchas", technicianDiagnosis: "LCD com defeito", repairActions: "Troca de tela",
    serviceCost: 38000, partsCost: 35000, discount: 0, paymentMethod: "pix", paymentStatus: "pago", paymentDate: "05/02/2026",
    usedParts: [{ inventoryId: "inv-8", name: "Tela Samsung S24", qty: 1, unitCost: 35000 }],
    cost: "R$ 380,00", partsUsed: "Tela Samsung S24", estimatedDelivery: "06/02/2026",
    technician: "Ricardo", status: "delivered", date: "03/02/2026", completedDate: "05/02/2026", warrantyDays: 90,
    termAccepted: true, entryPhotos: [], exitPhotos: []
  },
];

const SEED_CASH: CashEntry[] = [
  { id: "cash-1", date: "16/02/2026", type: "entrada", description: "OS-2401 - Troca de tela iPhone", amount: 45000, orderId: "OS-2401" },
  { id: "cash-2", date: "10/02/2026", type: "entrada", description: "OS-2404 - Reparo conector", amount: 20500, orderId: "OS-2404" },
  { id: "cash-3", date: "05/02/2026", type: "entrada", description: "OS-2405 - Troca de tela Samsung", amount: 73000, orderId: "OS-2405" },
  { id: "cash-4", date: "15/02/2026", type: "saida", description: "Compra de peças - TechParts BR", amount: 56000 },
  { id: "cash-5", date: "14/02/2026", type: "saida", description: "Aluguel do espaço", amount: 200000 },
];

// ============= STORE =============

interface AppStore {
  // Orders
  orders: RepairOrder[];
  addOrder: (order: RepairOrder) => void;
  updateOrder: (id: string, updates: Partial<RepairOrder>) => void;
  // Inventory
  inventory: InventoryItem[];
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deductStock: (inventoryId: string, qty: number) => void;
  // Cash
  cashEntries: CashEntry[];
  addCashEntry: (entry: CashEntry) => void;
  // Settings
  responsibilityTerm: string;
  setResponsibilityTerm: (term: string) => void;
  companyInfo: CompanyInfo;
  setCompanyInfo: (info: CompanyInfo) => void;
  nextOrderNumber: number;
}

export const useAppStore = create<AppStore>((set) => ({
  orders: SEED_ORDERS,
  addOrder: (order) => set((s) => ({ orders: [order, ...s.orders], nextOrderNumber: s.nextOrderNumber + 1 })),
  updateOrder: (id, updates) => set((s) => ({
    orders: s.orders.map((o) => o.id === id ? { ...o, ...updates } : o),
  })),

  inventory: SEED_INVENTORY,
  addInventoryItem: (item) => set((s) => ({ inventory: [...s.inventory, item] })),
  updateInventoryItem: (id, updates) => set((s) => ({
    inventory: s.inventory.map((i) => i.id === id ? { ...i, ...updates } : i),
  })),
  deductStock: (inventoryId, qty) => set((s) => ({
    inventory: s.inventory.map((i) => i.id === inventoryId ? { ...i, qty: Math.max(0, i.qty - qty) } : i),
  })),

  cashEntries: SEED_CASH,
  addCashEntry: (entry) => set((s) => ({ cashEntries: [entry, ...s.cashEntries] })),

  responsibilityTerm: DEFAULT_RESPONSIBILITY_TERM,
  setResponsibilityTerm: (term) => set({ responsibilityTerm: term }),
  companyInfo: DEFAULT_COMPANY_INFO,
  setCompanyInfo: (info) => set({ companyInfo: info }),
  nextOrderNumber: 2407,
}));
