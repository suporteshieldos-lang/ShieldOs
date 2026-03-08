import { PaymentMethod } from "@/store/appStore";

export type PeriodPreset = "today" | "last7" | "month" | "custom";
export type FinancialTab = "resumo" | "movimentacoes" | "os";
export type DetailKey = "revenue" | "partsCost" | "expense" | "profit" | "cash" | "pending";

export type ReceivableRow = {
  id: string;
  customer: string;
  reference: string;
  value: number;
  daysLate: number;
  dueDate: Date;
  phone: string;
  paymentMethod?: PaymentMethod;
  technician?: string;
  status?: "pago" | "a_vencer" | "vence_hoje" | "atrasado";
  sourceKind: "pending_order" | "cash_entry";
  sourceId: string;
};

export type OriginFilter = "todos" | "os" | "venda_balcao";
export type MethodFilter = "todos" | PaymentMethod;
