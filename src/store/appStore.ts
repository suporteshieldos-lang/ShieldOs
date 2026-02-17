import { create } from "zustand";

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
  partsUsed: string;
  cost: string;
  estimatedDelivery: string;
  // Meta
  technician: string;
  status: string;
  date: string;
  // Responsibility term accepted
  termAccepted: boolean;
  // Photos (base64 data URLs)
  entryPhotos: string[];
  exitPhotos: string[];
}

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
  "Tela (display e touch)",
  "Botões físicos (volume, power, home)",
  "Alto-falante / Auricular",
  "Microfone",
  "Câmera frontal",
  "Câmera traseira",
  "Carregamento / Conector",
  "Wi-Fi",
  "Bluetooth",
  "Biometria (digital/facial)",
  "Chip / Sinal",
  "GPS",
  "Sensor de proximidade",
  "Vibração",
  "NFC",
  "Bateria (estado geral)",
];

export const NOTEBOOK_CHECKLIST_ITEMS = [
  "Tela (display e touch se aplicável)",
  "Teclado (todas as teclas)",
  "Trackpad / Touchpad",
  "Webcam",
  "Alto-falantes",
  "Microfone",
  "Portas USB",
  "Porta HDMI / DisplayPort",
  "Carregamento / Conector de energia",
  "Wi-Fi",
  "Bluetooth",
  "Bateria (estado geral)",
  "Ventilação / Cooler",
  "Dobradiça / Tampa",
  "Leitor de cartão SD",
  "Biometria (se aplicável)",
];

export const TABLET_CHECKLIST_ITEMS = [
  "Tela (display e touch)",
  "Botões físicos (volume, power, home)",
  "Alto-falante",
  "Microfone",
  "Câmera frontal",
  "Câmera traseira",
  "Carregamento / Conector",
  "Wi-Fi",
  "Bluetooth",
  "Biometria (se aplicável)",
  "Sensor de proximidade",
  "GPS",
  "Bateria (estado geral)",
  "Caneta stylus (se aplicável)",
];

export function getChecklistItems(deviceType: string): string[] {
  switch (deviceType) {
    case "notebook": return NOTEBOOK_CHECKLIST_ITEMS;
    case "tablet": return TABLET_CHECKLIST_ITEMS;
    default: return PHONE_CHECKLIST_ITEMS;
  }
}

interface AppStore {
  orders: RepairOrder[];
  addOrder: (order: RepairOrder) => void;
  responsibilityTerm: string;
  setResponsibilityTerm: (term: string) => void;
  companyInfo: CompanyInfo;
  setCompanyInfo: (info: CompanyInfo) => void;
  nextOrderNumber: number;
}

export const useAppStore = create<AppStore>((set, get) => ({
  orders: [
    {
      id: "OS-2401", customerName: "Carlos Silva", customerPhone: "(11) 99234-5678", customerEmail: "carlos@email.com", customerCpf: "123.456.789-00",
      deviceType: "phone", brand: "Apple", model: "iPhone 15 Pro", serialImei: "353456789012345", devicePassword: "1234", deviceColor: "Titânio Natural", accessories: "Capinha, carregador",
      conditionNotes: "Tela trincada lado direito", checklist: {}, reportedProblem: "Tela quebrada", technicianDiagnosis: "", repairActions: "", partsUsed: "", cost: "R$ 450,00",
      estimatedDelivery: "19/02/2026", technician: "Ricardo", status: "repairing", date: "16/02/2026", termAccepted: true, entryPhotos: [], exitPhotos: []
    },
    {
      id: "OS-2402", customerName: "Maria Santos", customerPhone: "(11) 98765-4321", customerEmail: "maria@email.com", customerCpf: "987.654.321-00",
      deviceType: "notebook", brand: "Apple", model: "MacBook Air M3", serialImei: "C02X1234ABCD", devicePassword: "", deviceColor: "Prateado", accessories: "Carregador MagSafe",
      conditionNotes: "Sem marcas visíveis", checklist: {}, reportedProblem: "Não liga", technicianDiagnosis: "", repairActions: "", partsUsed: "", cost: "-",
      estimatedDelivery: "-", technician: "Felipe", status: "diagnosing", date: "15/02/2026", termAccepted: true, entryPhotos: [], exitPhotos: []
    },
    {
      id: "OS-2403", customerName: "João Oliveira", customerPhone: "(21) 97654-3210", customerEmail: "joao@email.com", customerCpf: "456.789.123-00",
      deviceType: "phone", brand: "Samsung", model: "Samsung S24", serialImei: "354567890123456", devicePassword: "0000", deviceColor: "Preto", accessories: "Nenhum",
      conditionNotes: "Bateria estufando", checklist: {}, reportedProblem: "Bateria inchada", technicianDiagnosis: "", repairActions: "", partsUsed: "", cost: "R$ 280,00",
      estimatedDelivery: "20/02/2026", technician: "Ricardo", status: "waiting_parts", date: "15/02/2026", termAccepted: true, entryPhotos: [], exitPhotos: []
    },
  ],
  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders], nextOrderNumber: state.nextOrderNumber + 1 })),
  responsibilityTerm: DEFAULT_RESPONSIBILITY_TERM,
  setResponsibilityTerm: (term) => set({ responsibilityTerm: term }),
  companyInfo: DEFAULT_COMPANY_INFO,
  setCompanyInfo: (info) => set({ companyInfo: info }),
  nextOrderNumber: 2407,
}));
