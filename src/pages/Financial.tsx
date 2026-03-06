import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  LineChart as LineChartIcon,
  MessageCircle,
  MoreVertical,
  PlusCircle,
  ReceiptText,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import jsPDF from "jspdf";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createId } from "@/lib/id";
import { PaymentMethod, formatCurrency, getOrderTotal, useAppStore } from "@/store/appStore";

type PeriodPreset = "today" | "last7" | "month" | "custom";
type DetailKey = "revenue" | "partsCost" | "expense" | "profit" | "cash" | "pending";
type ReceivableRow = {
  id: string;
  customer: string;
  reference: string;
  value: number;
  daysLate: number;
  dueDate: Date;
  phone: string;
  sourceKind: "pending_order" | "cash_entry";
  sourceId: string;
};

const paymentMethodLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  cartao: "Cartão",
  outro: "Outro",
};

const paymentPalette = ["#22c55e", "#06b6d4", "#6366f1", "#f59e0b", "#9ca3af"];

function parseBrDate(value?: string) {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function formatBrDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

function toInputDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromInputDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetweenInclusive(start: Date, end: Date) {
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);
}

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function exportCsvFile(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  title,
  value,
  delta,
  icon: Icon,
  onClick,
  changeTone = "neutral",
  helperText,
  trendData,
  trendColor = "hsl(var(--chart-1))",
}: {
  title: string;
  value: string;
  delta: number | null;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  changeTone?: "neutral" | "goodWhenUp" | "badWhenUp";
  helperText?: string;
  trendData?: Array<{ label: string; value: number }>;
  trendColor?: string;
}) {
  const hasDelta = delta !== null;
  const isUp = hasDelta ? delta >= 0 : false;
  const colorClass =
    !hasDelta || delta === 0
      ? "text-muted-foreground"
      : changeTone === "goodWhenUp"
        ? isUp
          ? "text-success"
          : "text-destructive"
        : changeTone === "badWhenUp"
          ? isUp
            ? "text-destructive"
            : "text-success"
          : "text-muted-foreground";

  return (
    <button onClick={onClick} className="glass-card h-full rounded-xl p-5 text-left transition hover:bg-muted/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {helperText ? <p className="mt-1 text-xs text-muted-foreground">{helperText}</p> : null}
          <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${colorClass}`}>
            {hasDelta ? (
              <>
                {delta === 0 ? null : isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {delta === 0 ? "0,0% vs período anterior" : `${Math.abs(delta).toFixed(1)}% vs período anterior`}
              </>
            ) : (
              "Sem base comparativa"
            )}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
      </div>
      {trendData && trendData.length > 0 ? (
        <div className="mt-3 h-14 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <Line type="monotone" dataKey="value" stroke={trendColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </button>
  );
}

export default function Financial() {
  const navigate = useNavigate();
  const { orders, cashEntries, expenses, updateOrder, addCashEntry, cancelCashEntry } = useAppStore();
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [customStart, setCustomStart] = useState(toInputDate(new Date()));
  const [customEnd, setCustomEnd] = useState(toInputDate(new Date()));
  const [tab, setTab] = useState<"resumo" | "movimentacoes" | "os">("resumo");
  const [originFilter, setOriginFilter] = useState<"todos" | "os" | "venda_balcao">("todos");
  const [methodFilter, setMethodFilter] = useState<"todos" | PaymentMethod>("todos");
  const [calculating, setCalculating] = useState(false);
  const [detailOpen, setDetailOpen] = useState<DetailKey | null>(null);
  const [createReceivableOpen, setCreateReceivableOpen] = useState(false);
  const [newReceivableCustomer, setNewReceivableCustomer] = useState("");
  const [newReceivablePhone, setNewReceivablePhone] = useState("");
  const [newReceivableDescription, setNewReceivableDescription] = useState("");
  const [newReceivableAmount, setNewReceivableAmount] = useState("");
  const [newReceivableDueDate, setNewReceivableDueDate] = useState(toInputDate(new Date()));
  const [newReceivableMethod, setNewReceivableMethod] = useState<PaymentMethod>("pix");

  const periodRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (preset === "last7") start.setDate(end.getDate() - 6);
    if (preset === "month") start.setDate(1);
    if (preset === "custom") {
      const s = fromInputDate(customStart);
      const e = fromInputDate(customEnd);
      if (s) start.setTime(s.getTime());
      if (e) end.setTime(e.getTime());
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }, [preset, customStart, customEnd]);

  const previousRange = useMemo(() => {
    const days = daysBetweenInclusive(periodRange.start, periodRange.end);
    const end = new Date(periodRange.start);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, [periodRange]);

  useEffect(() => {
    setCalculating(true);
    const t = setTimeout(() => setCalculating(false), 180);
    return () => clearTimeout(t);
  }, [periodRange]);

  const inRange = useCallback((brDate?: string, range = periodRange) => {
    const d = parseBrDate(brDate);
    return !!d && d >= range.start && d <= range.end;
  }, [periodRange]);

  const calc = useCallback((range: { start: Date; end: Date }) => {
    const activeCash = cashEntries.filter((e) => e.status !== "cancelada");
    const paidOrders = orders.filter((o) => o.paymentStatus === "pago" && inRange(o.paymentDate || o.date, range));
    const pendingOrders = orders.filter((o) => o.paymentStatus !== "pago" && inRange(o.date, range));
    const salesEntries = activeCash.filter(
      (e) =>
        e.type === "entrada" &&
        (e.source === "venda_peca" || (e.source as string) === "venda_Peça") &&
        inRange(e.date, range)
    );
    const manualIn = activeCash.filter((e) => e.type === "entrada" && e.source === "manual" && inRange(e.date, range));
    const operationalCashOut = activeCash.filter((e) => e.type === "saida" && e.source === "despesa" && inRange(e.date, range));
    const opening = activeCash.filter((e) => (e.description === "Caixa inicial" || e.description === "Abertura de caixa") && inRange(e.date, range));
    const expenseRows = expenses.filter((e) => inRange(e.date, range));

    const osRevenue = paidOrders.reduce((s, o) => s + getOrderTotal(o), 0);
    const salesRevenue = salesEntries.reduce((s, e) => s + e.amount, 0);
    const grossRevenue = osRevenue + salesRevenue;

    const osPartsCost = paidOrders.reduce((s, o) => s + o.usedParts.reduce((acc, p) => acc + p.unitCost * p.qty, 0), 0);
    const salesPartsCost = salesEntries.reduce((s, e) => s + (e.saleUnitCost || 0) * (e.saleQty || 0), 0);
    const partsCost = osPartsCost + salesPartsCost;

    const expenseDetailRows = [
      ...expenseRows.map((e) => ({
        data: e.date,
        Descrição: `${e.category}${e.notes ? ` - ${e.notes}` : ""}`,
        valor: -e.amount,
      })),
      ...operationalCashOut.map((e) => ({
        data: e.date,
        Descrição: e.description || "Saida operacional",
        valor: -e.amount,
      })),
    ];

    const operationalExpense = Math.abs(expenseDetailRows.reduce((s, row) => s + row.valor, 0));
    const totalCostsAndExpenses = partsCost + operationalExpense;
    const netProfit = grossRevenue - partsCost - operationalExpense;
    const cashPeriod = activeCash
      .filter((e) => inRange(e.date, range))
      .reduce((sum, row) => sum + (row.type === "entrada" ? row.amount : -row.amount), 0);
    const pendingValue = pendingOrders.reduce((s, o) => s + getOrderTotal(o), 0);

    const byMethod = activeCash
      .filter((e) => e.type === "entrada" && inRange(e.date, range))
      .reduce((acc, curr) => {
        const method = curr.paymentMethod || "outro";
        acc[method] = (acc[method] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      paidOrders,
      pendingOrders,
      salesEntries,
      manualIn,
      operationalCashOut,
      expenseRows,
      expenseDetailRows,
      grossRevenue,
      osRevenue,
      salesRevenue,
      partsCost,
      operationalExpense,
      totalCostsAndExpenses,
      netProfit,
      cashPeriod,
      pendingValue,
      byMethod,
    };
  }, [orders, cashEntries, expenses, inRange]);

  const current = useMemo(() => calc(periodRange), [periodRange, calc]);
  const previous = useMemo(() => calc(previousRange), [previousRange, calc]);

  const deltas = useMemo(() => ({
    grossRevenue: percentageChange(current.grossRevenue, previous.grossRevenue),
    partsCost: percentageChange(current.partsCost, previous.partsCost),
    operationalExpense: percentageChange(current.operationalExpense, previous.operationalExpense),
    totalCostsAndExpenses: percentageChange(current.totalCostsAndExpenses, previous.totalCostsAndExpenses),
    netProfit: percentageChange(current.netProfit, previous.netProfit),
    osRevenue: percentageChange(current.osRevenue, previous.osRevenue),
    salesRevenue: percentageChange(current.salesRevenue, previous.salesRevenue),
    pendingValue: percentageChange(current.pendingValue, previous.pendingValue),
  }), [current, previous]);

  const chartSeries = useMemo(() => {
    const bucket = new Map<string, { receita: number; custo: number; despesa: number }>();
    for (const d = new Date(periodRange.start); d <= periodRange.end; d.setDate(d.getDate() + 1)) bucket.set(formatBrDate(d), { receita: 0, custo: 0, despesa: 0 });
    current.paidOrders.forEach((o) => {
      const key = o.paymentDate || o.date;
      const v = bucket.get(key);
      if (!v) return;
      v.receita += getOrderTotal(o);
      v.custo += o.usedParts.reduce((s, p) => s + p.unitCost * p.qty, 0);
    });
    current.salesEntries.forEach((e) => {
      const v = bucket.get(e.date);
      if (!v) return;
      v.receita += e.amount;
      v.custo += (e.saleUnitCost || 0) * (e.saleQty || 0);
    });
    current.expenseRows.forEach((e) => {
      const v = bucket.get(e.date);
      if (v) v.despesa += e.amount;
    });
    return Array.from(bucket.entries()).map(([date, val]) => ({
      date,
      receita: val.receita / 100,
      custo: val.custo / 100,
      despesa: -(val.despesa / 100),
      lucro: (val.receita - val.custo - val.despesa) / 100,
    }));
  }, [periodRange, current]);

  const osProfitBars = useMemo(() => current.paidOrders.map((o) => ({ os: o.id, lucro: (getOrderTotal(o) - o.usedParts.reduce((s, p) => s + p.unitCost * p.qty, 0)) / 100 })), [current.paidOrders]);
  const paymentPieData = useMemo(
    () =>
      Object.entries(current.byMethod).map(([method, value]) => ({
        name: paymentMethodLabels[method] || method,
        value: value / 100,
      })),
    [current.byMethod]
  );
  const hasPaymentData = paymentPieData.length > 0;
  const paymentPieDataSafe = hasPaymentData ? paymentPieData : [{ name: "Sem dados", value: 1 }];
  const osProfitBarsSafe = osProfitBars.length > 0 ? osProfitBars : [{ os: "Sem dados", lucro: 0 }];
  const hasAnySeriesData = useMemo(
    () => chartSeries.some((i) => i.receita !== 0 || i.custo !== 0 || i.despesa !== 0 || i.lucro !== 0),
    [chartSeries]
  );

  const revenueTrend = useMemo(
    () => chartSeries.map((row) => ({ label: row.date, value: row.receita })),
    [chartSeries]
  );
  const costExpenseTrend = useMemo(
    () =>
      chartSeries.map((row) => ({
        label: row.date,
        value: row.custo + Math.abs(row.despesa),
      })),
    [chartSeries]
  );
  const profitTrend = useMemo(
    () => chartSeries.map((row) => ({ label: row.date, value: row.lucro })),
    [chartSeries]
  );
  const pendingTrend = useMemo(() => {
    const bucket = new Map<string, number>();
    chartSeries.forEach((row) => bucket.set(row.date, 0));
    current.pendingOrders.forEach((order) => {
      const key = order.date;
      if (!bucket.has(key)) return;
      bucket.set(key, (bucket.get(key) || 0) + getOrderTotal(order) / 100);
    });
    return Array.from(bucket.entries()).map(([label, value]) => ({ label, value }));
  }, [chartSeries, current.pendingOrders]);

  const osCashEntries = current.paidOrders.map((o) => ({ id: `os-${o.id}`, date: o.paymentDate || o.date, type: "entrada" as const, description: `Recebimento ${o.id} (${paymentMethodLabels[o.paymentMethod] || o.paymentMethod})`, amount: getOrderTotal(o), paymentMethod: o.paymentMethod, source: "os" as const }));
  const combinedCashEntries = useMemo(
    () =>
      [...osCashEntries, ...cashEntries.filter((e) => e.status !== "cancelada" && inRange(e.date))].sort(
        (a, b) => (parseBrDate(b.date)?.getTime() || 0) - (parseBrDate(a.date)?.getTime() || 0)
      ),
    [osCashEntries, cashEntries, inRange]
  );

  const filteredFinancialEntries = useMemo(() => {
    return combinedCashEntries.filter((entry) => {
      const origin =
        entry.source === "os"
          ? "os"
          : entry.source === "venda_peca" || (entry.source as string) === "venda_Peça"
            ? "venda_balcao"
            : "manual";
      const byOrigin = originFilter === "todos" || originFilter === origin;
      const byMethod = methodFilter === "todos" || entry.paymentMethod === methodFilter;
      return byOrigin && byMethod;
    });
  }, [combinedCashEntries, originFilter, methodFilter]);

  const detailRows = useMemo(() => {
    if (!detailOpen) return [] as Array<{ data: string; Descrição: string; valor: number }>;
    if (detailOpen === "revenue") return [...current.paidOrders.map((o) => ({ data: o.paymentDate || o.date, Descrição: `OS ${o.id} - ${o.customerName}`, valor: getOrderTotal(o) })), ...current.salesEntries.map((e) => ({ data: e.date, Descrição: e.description, valor: e.amount }))];
    if (detailOpen === "partsCost") return [...current.paidOrders.map((o) => ({ data: o.paymentDate || o.date, Descrição: `Peças da OS ${o.id}`, valor: o.usedParts.reduce((s, p) => s + p.unitCost * p.qty, 0) })), ...current.salesEntries.map((e) => ({ data: e.date, Descrição: `Custo da venda: ${e.description}`, valor: (e.saleUnitCost || 0) * (e.saleQty || 0) }))];
    if (detailOpen === "expense") return current.expenseDetailRows;
    if (detailOpen === "cash") return combinedCashEntries.map((e) => ({ data: e.date, Descrição: e.description, valor: e.type === "saida" ? -e.amount : e.amount }));
    if (detailOpen === "pending") return current.pendingOrders.map((o) => ({ data: o.date, Descrição: `OS ${o.id} - ${o.customerName}`, valor: getOrderTotal(o) }));
    return [{ data: "-", Descrição: "Lucro consolidado do periodo", valor: current.netProfit }];
  }, [detailOpen, current, combinedCashEntries]);

  const receivablesAging = useMemo<ReceivableRow[]>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const fromOrders: ReceivableRow[] = orders
      .filter((order) => order.paymentStatus !== "pago" && order.status !== "cancelled")
      .map((order) => {
        const due = parseBrDate(order.estimatedDelivery) || parseBrDate(order.date) || now;
        const daysLate = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
        return {
          id: `pending-${order.id}`,
          customer: order.customerName || "Não identificado",
          reference: order.id,
          value: getOrderTotal(order),
          daysLate,
          dueDate: due,
          phone: order.customerPhone || "",
          sourceKind: "pending_order",
          sourceId: order.id,
        };
      });

    const fromManual: ReceivableRow[] = cashEntries
      .filter(
        (entry) =>
          entry.type === "entrada" &&
          entry.financialStatus === "previsto" &&
          entry.source !== "os" &&
          entry.status !== "cancelada" &&
          entry.status !== "estornada"
      )
      .map((entry) => {
        const due = parseBrDate(entry.date) || now;
        const daysLate = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
        return {
          id: `manual-${entry.id}`,
          customer: entry.customerName || "Não identificado",
          reference: "Avulso",
          value: entry.amount,
          daysLate,
          dueDate: due,
          phone: entry.customerPhone || "",
          sourceKind: "cash_entry",
          sourceId: entry.id,
        };
      });

    return [...fromOrders, ...fromManual].sort((a, b) => b.daysLate - a.daysLate || b.value - a.value);
  }, [cashEntries, orders]);

  const isToday = (date: Date) => {
    const now = new Date();
    return now.getFullYear() === date.getFullYear() && now.getMonth() === date.getMonth() && now.getDate() === date.getDate();
  };

  const receivablesTotals = useMemo(() => {
    const overdue = receivablesAging.filter((row) => row.daysLate > 0).reduce((sum, row) => sum + row.value, 0);
    const dueToday = receivablesAging.filter((row) => isToday(row.dueDate)).reduce((sum, row) => sum + row.value, 0);
    const total = receivablesAging.reduce((sum, row) => sum + row.value, 0);
    return { overdue, dueToday, total };
  }, [receivablesAging]);

  const agingBadgeClass = (daysLate: number) => {
    if (daysLate === 0) return "border-slate-300 bg-slate-100 text-slate-700";
    if (daysLate <= 3) return "border-yellow-300 bg-yellow-100 text-yellow-800";
    if (daysLate <= 7) return "border-orange-300 bg-orange-100 text-orange-800";
    return "border-red-300 bg-red-100 text-red-800";
  };

  const askPaymentMethod = (defaultValue: PaymentMethod = "pix"): PaymentMethod | null => {
    const typed = window
      .prompt("Informe o meio de pagamento (pix, dinheiro, debito, credito, cartao, outro):", defaultValue)
      ?.trim()
      .toLowerCase();
    if (!typed) return null;
    if (!["pix", "dinheiro", "debito", "credito", "cartao", "outro"].includes(typed)) return null;
    return typed as PaymentMethod;
  };

  const markReceivableAsPaid = (row: ReceivableRow) => {
    if (row.sourceKind === "pending_order") {
      const order = orders.find((item) => item.id === row.sourceId);
      if (!order) return toast.error("OS não encontrada.");
      const typedCost = window.prompt(
        `Informe o custo da OS ${order.id} (>= 0):`,
        (Math.max(0, Number(order.partsCost || 0)) / 100).toFixed(2).replace(".", ",")
      );
      if (typedCost === null) return;
      const parsedCost = Math.round(Number(typedCost.replace(",", ".")) * 100);
      if (!Number.isFinite(parsedCost) || parsedCost < 0) return toast.error("Custo inválido.");
      const selectedMethod = askPaymentMethod(order.paymentMethod || "pix");
      if (!selectedMethod) return toast.error("Meio de pagamento inválido.");
      const result = updateOrder(order.id, {
        partsCost: parsedCost,
        paymentStatus: "pago",
        paymentDate: formatBrDate(new Date()),
        paymentMethod: selectedMethod,
      });
      if (!result.ok) return toast.error(result.message || "Não foi possível marcar como pago.");
      toast.success("Recebível marcado como pago.");
      return;
    }

    const original = cashEntries.find((entry) => entry.id === row.sourceId);
    if (!original) return toast.error("Recebível não encontrado.");
    const cancelResult = cancelCashEntry(row.sourceId, "Baixa de recebível manual (recebido).", "Usuário");
    if (!cancelResult.ok) return toast.error(cancelResult.message || "Não foi possível baixar recebível.");
    const selectedMethod = askPaymentMethod((original.paymentMethod as PaymentMethod) || "pix");
    if (!selectedMethod) return toast.error("Meio de pagamento inválido.");
    addCashEntry({
      id: createId(),
      date: formatBrDate(new Date()),
      type: "entrada",
      description: original.description,
      amount: original.amount,
      paymentMethod: selectedMethod,
      source: original.source || "manual",
      status: "ativa",
      financialStatus: "pago",
      customerName: original.customerName,
      customerPhone: original.customerPhone,
      notes: `${original.notes ? `${original.notes} | ` : ""}Recebível manual baixado como pago.`,
    });
    toast.success("Recebível manual marcado como pago.");
  };

  const deleteReceivable = (row: ReceivableRow) => {
    if (row.sourceKind === "pending_order") {
      const order = orders.find((item) => item.id === row.sourceId);
      if (!order) return toast.error("OS não encontrada para exclusão.");
      if (!window.confirm(`Excluir este recebível vai cancelar a ${order.id}. Deseja continuar?`)) return;
      const result = updateOrder(order.id, { status: "cancelled" });
      if (!result.ok) return toast.error(result.message || "Não foi possível excluir.");
      toast.success(`Recebível removido e ${order.id} cancelada.`);
      return;
    }
    if (!window.confirm("Deseja excluir este recebível avulso?")) return;
    const cancelResult = cancelCashEntry(row.sourceId, "Recebível avulso excluído pelo usuário.", "Usuário");
    if (!cancelResult.ok) return toast.error(cancelResult.message || "Não foi possível excluir.");
    toast.success("Recebível avulso excluído.");
  };

  const openCharge = (phone: string, reference: string, value: number) => {
    const clean = (phone || "").replace(/\D/g, "");
    if (!clean) return toast.error("Cliente sem telefone para cobrança.");
    const text = encodeURIComponent(`Olá! Referente à ${reference}, ficou pendente ${formatCurrency(value)}. Podemos regularizar hoje?`);
    window.open(`https://wa.me/55${clean}?text=${text}`, "_blank");
  };

  const chargeAllOverdue = () => {
    const targets = receivablesAging.filter((row) => row.daysLate > 0 && row.phone.replace(/\D/g, "").length >= 10);
    if (targets.length === 0) return toast.error("Nenhum atrasado com telefone válido para cobrança em lote.");
    if (!window.confirm(`Enviar cobrança em lote para ${targets.length} cliente(s) via WhatsApp?`)) return;
    targets.forEach((row, idx) => setTimeout(() => openCharge(row.phone, row.reference, row.value), idx * 220));
    toast.success(`Disparo de cobrança iniciado para ${targets.length} cliente(s).`);
  };

  const openReceivableRecord = (row: ReceivableRow) => {
    if (row.sourceKind === "pending_order") return navigate("/ordens");
    setDetailOpen("cash");
  };

  const createManualReceivable = () => {
    const customer = newReceivableCustomer.trim();
    const description = newReceivableDescription.trim();
    const amountValue = Number(newReceivableAmount.replace(",", "."));
    const amount = Math.round(amountValue * 100);
    const due = fromInputDate(newReceivableDueDate);
    if (!customer) return toast.error("Informe o cliente do recebível.");
    if (!description) return toast.error("Informe a descrição do recebível.");
    if (!Number.isFinite(amountValue) || amount <= 0) return toast.error("Informe um valor válido.");
    if (!due) return toast.error("Informe uma data de vencimento válida.");

    addCashEntry({
      id: createId(),
      date: formatBrDate(due),
      type: "entrada",
      status: "ativa",
      description,
      amount,
      paymentMethod: newReceivableMethod,
      source: "manual",
      movementType: "entrada_manual",
      financialStatus: "previsto",
      customerName: customer,
      customerPhone: newReceivablePhone.trim(),
      notes: "Recebível manual (sem OS).",
    });

    setNewReceivableCustomer("");
    setNewReceivablePhone("");
    setNewReceivableDescription("");
    setNewReceivableAmount("");
    setNewReceivableDueDate(toInputDate(new Date()));
    setNewReceivableMethod("pix");
    setCreateReceivableOpen(false);
    toast.success("Recebível avulso adicionado.");
  };

  const exportExcel = () => {
    const rows: string[][] = [["Data", "Descrição", "Tipo", "Pagamento", "Valor"], ...combinedCashEntries.map((e) => [e.date, e.description, e.type === "entrada" ? "Entrada" : "Saida", e.paymentMethod ? paymentMethodLabels[e.paymentMethod] : "-", (e.type === "saida" ? -e.amount : e.amount) / 100])];
    exportCsvFile(`financeiro-${toInputDate(new Date())}.csv`, rows);
    toast.success("Relatorio Excel (CSV) exportado.");
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 12;
    const contentW = pageW - marginX * 2;

    const drawHeader = () => {
      doc.setFillColor(17, 45, 78);
      doc.rect(0, 0, pageW, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("ShieldOS - Financeiro", marginX, 11.5);
      doc.setFontSize(9.5);
      doc.text(`Periodo: ${formatBrDate(periodRange.start)} a ${formatBrDate(periodRange.end)}`, marginX, 18.5);
      doc.setTextColor(22, 30, 46);
    };

    const drawFooter = (page: number, total: number) => {
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 148);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR", { hour12: false })}`, marginX, pageH - 6);
      doc.text(`Pagina ${page}/${total}`, pageW - marginX, pageH - 6, { align: "right" });
      doc.setTextColor(22, 30, 46);
    };

    drawHeader();

    const cards = [
      ["Receita Total", formatCurrency(current.grossRevenue)],
      ["Custos + Despesas", formatCurrency(current.totalCostsAndExpenses)],
      ["Lucro Líquido", formatCurrency(current.netProfit)],
      ["Receita por Serviço (OS)", formatCurrency(current.osRevenue)],
      ["Receita por Produto (Venda Balcão)", formatCurrency(current.salesRevenue)],
      ["OS Pendentes", formatCurrency(current.pendingValue)],
    ] as const;

    const cardW = (contentW - 8) / 2;
    const cardY = 29;
    cards.forEach((card, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = marginX + col * (cardW + 8);
      const y = cardY + row * 17;
      doc.setFillColor(246, 248, 252);
      doc.roundedRect(x, y, cardW, 14, 2, 2, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, y, cardW, 14, 2, 2, "S");
      doc.setFontSize(8.5);
      doc.setTextColor(95, 111, 135);
      doc.text(card[0], x + 2.5, y + 4.8);
      doc.setFontSize(11);
      doc.setTextColor(22, 30, 46);
      doc.text(card[1], x + 2.5, y + 10.8);
    });

    const tableTop = 84;
    const colData = marginX + 3;
    const colDesc = marginX + 35;
    const colTipo = marginX + 136;
    const colValor = pageW - marginX - 3;
    const descMaxWidth = colTipo - colDesc - 3;

    const drawTableHeader = (y: number) => {
      doc.setFillColor(233, 238, 246);
      doc.rect(marginX, y, contentW, 8, "F");
      doc.setDrawColor(214, 223, 236);
      doc.rect(marginX, y, contentW, 8, "S");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text("Data", colData, y + 5.2);
      doc.text("Descrição", colDesc, y + 5.2);
      doc.text("Tipo", colTipo, y + 5.2);
      doc.text("Valor", colValor, y + 5.2, { align: "right" });
      doc.setTextColor(22, 30, 46);
      return y + 8;
    };

    let y = drawTableHeader(tableTop);
    const rows = combinedCashEntries.slice(0, 140);
    rows.forEach((e, idx) => {
      const typeLabel = e.type === "entrada" ? "Entrada" : "Saida";
      const valueLabel = `${e.type === "entrada" ? "+" : "-"}${formatCurrency(e.amount)}`;
      const descText = e.description || "-";
      const descLines = doc.splitTextToSize(descText, descMaxWidth) as string[];
      const rowLines = Math.max(1, Math.min(descLines.length, 2));
      const rowH = rowLines * 4.3 + 3.3;

      if (y + rowH > pageH - 14) {
        doc.addPage();
        drawHeader();
        y = drawTableHeader(28);
      }

      if (idx % 2 === 0) {
        doc.setFillColor(250, 252, 255);
        doc.rect(marginX, y, contentW, rowH, "F");
      }
      doc.setDrawColor(234, 239, 247);
      doc.line(marginX, y + rowH, marginX + contentW, y + rowH);

      doc.setFontSize(8.5);
      doc.setTextColor(95, 111, 135);
      doc.text(e.date, colData, y + 4.8);
      doc.setTextColor(22, 30, 46);
      doc.text(descLines.slice(0, rowLines), colDesc, y + 4.8);
      doc.text(typeLabel, colTipo, y + 4.8);
      doc.text(valueLabel, colValor, y + 4.8, { align: "right" });
      y += rowH;
    });

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      drawFooter(page, totalPages);
    }

    doc.save(`financeiro-${toInputDate(new Date())}.pdf`);
    toast.success("Relatorio PDF exportado.");
  };

  const filterClass = (key: PeriodPreset) => `rounded-full px-4 py-2 text-xs font-medium transition ${preset === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`;
  const periodLabel = `${formatBrDate(periodRange.start)} a ${formatBrDate(periodRange.end)}`;

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="glass-card rounded-xl border border-border/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button className={filterClass("today")} onClick={() => setPreset("today")}>Hoje</button>
          <button className={filterClass("last7")} onClick={() => setPreset("last7")}>Últimos 7 dias</button>
          <button className={filterClass("month")} onClick={() => setPreset("month")}>Este mês</button>
          <button className={filterClass("custom")} onClick={() => setPreset("custom")}>Personalizado</button>
          {preset === "custom" && (
            <div className="ml-0 flex flex-wrap items-center gap-2 md:ml-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <input className="h-9 rounded-lg border border-input bg-card px-3 text-sm" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <span className="text-muted-foreground">até</span>
              <input className="h-9 rounded-lg border border-input bg-card px-3 text-sm" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Período: {periodLabel}</span>
            <Button variant="outline" className="gap-2" onClick={exportPdf}><FileText className="h-4 w-4" />PDF</Button>
            <Button variant="outline" className="gap-2" onClick={exportExcel}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
          </div>
        </div>
      </div>

      {calculating ? <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">Atualizando indicadores...</div> : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="glass-card rounded-xl border border-border/70 bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <LineChartIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Evolução: receita, custos e lucro</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <Legend />
                    <Line dataKey="receita" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2.2} />
                    <Line dataKey="custo" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2.2} />
                    <Line dataKey="despesa" stroke="hsl(var(--warning))" dot={false} strokeWidth={2.2} />
                    <Line dataKey="lucro" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2.2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {!hasAnySeriesData ? (
                <p className="mt-2 text-xs text-muted-foreground">Sem lançamentos no período. O gráfico permanece visível para referência.</p>
              ) : null}
            </div>

            <div className="glass-card rounded-xl border border-border/70 bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Lucro por OS paga</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={osProfitBarsSafe}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="os" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <Bar dataKey="lucro" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {osProfitBars.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Sem OS pagas no período. Gráfico mantido para comparação.</p> : null}
            </div>

            <div className="glass-card rounded-xl border border-border/70 bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Composição por pagamento</h3>
              </div>
              <div className="relative h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentPieDataSafe} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} paddingAngle={2}>
                      {paymentPieDataSafe.map((d, i) => (
                        <Cell key={d.name} fill={hasPaymentData ? paymentPalette[i % paymentPalette.length] : "#cbd5e1"} />
                      ))}
                    </Pie>
                    {hasPaymentData ? (
                      <>
                        <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                        <Legend />
                      </>
                    ) : null}
                  </PieChart>
                </ResponsiveContainer>
                {!hasPaymentData ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="rounded-full bg-muted/80 px-3 py-1 text-sm font-medium text-muted-foreground">Sem dados</span>
                  </div>
                ) : null}
              </div>
              {!hasPaymentData ? <p className="mt-2 text-xs text-muted-foreground">Sem pagamentos no período. Gráfico mantido para referência visual.</p> : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <section className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resultado do período</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <MetricCard title="Receita Total" value={formatCurrency(current.grossRevenue)} delta={deltas.grossRevenue} icon={DollarSign} onClick={() => setDetailOpen("revenue")} changeTone="goodWhenUp" helperText="Tudo o que entrou no período." trendData={revenueTrend} trendColor="hsl(var(--chart-3))" />
                <MetricCard title="Custos + Despesas" value={formatCurrency(current.totalCostsAndExpenses)} delta={deltas.totalCostsAndExpenses} icon={TrendingDown} onClick={() => setDetailOpen("expense")} changeTone="badWhenUp" helperText="Quanto custou para operar." trendData={costExpenseTrend} trendColor="hsl(var(--chart-5))" />
                <MetricCard title="Lucro Líquido" value={formatCurrency(current.netProfit)} delta={deltas.netProfit} icon={TrendingUp} onClick={() => setDetailOpen("profit")} changeTone="goodWhenUp" helperText="O que sobrou após custos e despesas." trendData={profitTrend} trendColor="hsl(var(--chart-1))" />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Composição da receita</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <MetricCard title="Receita por Serviço (OS)" value={formatCurrency(current.osRevenue)} delta={deltas.osRevenue} icon={ReceiptText} onClick={() => setTab("os")} changeTone="goodWhenUp" helperText={current.grossRevenue > 0 ? `${((current.osRevenue / current.grossRevenue) * 100).toFixed(1)}% da receita total` : "Sem receita no período"} />
                <MetricCard title="Receita por Produto (Venda Balcão)" value={formatCurrency(current.salesRevenue)} delta={deltas.salesRevenue} icon={CreditCard} onClick={() => setTab("movimentacoes")} changeTone="goodWhenUp" helperText={current.grossRevenue > 0 ? `${((current.salesRevenue / current.grossRevenue) * 100).toFixed(1)}% da receita total` : "Sem receita no período"} />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Onde o dinheiro é consumido</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <MetricCard title="Custo de Peças" value={formatCurrency(current.partsCost)} delta={deltas.partsCost} icon={TrendingDown} onClick={() => setDetailOpen("partsCost")} changeTone="badWhenUp" helperText={current.grossRevenue > 0 ? `${((current.partsCost / current.grossRevenue) * 100).toFixed(1)}% da receita` : "Sem base de receita no período"} />
                <MetricCard title="Despesas Operacionais" value={formatCurrency(current.operationalExpense)} delta={deltas.operationalExpense} icon={ReceiptText} onClick={() => setDetailOpen("expense")} changeTone="badWhenUp" helperText={current.grossRevenue > 0 ? `${((current.operationalExpense / current.grossRevenue) * 100).toFixed(1)}% da receita` : "Sem base de receita no período"} />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card/60 p-4">
              <div className="mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recebíveis</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <MetricCard title="OS Pendentes (a receber)" value={formatCurrency(current.pendingValue)} delta={deltas.pendingValue} icon={CreditCard} onClick={() => setDetailOpen("pending")} changeTone="badWhenUp" helperText="Valor que ainda pode entrar no caixa da empresa após cobrança." trendData={pendingTrend} trendColor="hsl(var(--chart-4))" />
                <div className="glass-card flex h-full flex-col justify-center rounded-xl p-5 text-left">
                  <p className="text-sm font-medium text-muted-foreground">Próxima ação recomendada</p>
                  <p className="mt-1 text-base font-semibold text-foreground">Priorize a cobrança das OS pendentes para proteger o fluxo de caixa.</p>
                  <p className="mt-2 text-xs text-muted-foreground">Use a aba de OS para identificar os clientes com maior valor em aberto.</p>
                </div>
              </div>
            </section>
          </div>

        </>
      )}

      <div className="glass-card rounded-xl p-4">
        <div className="mb-3 flex flex-wrap gap-2">{(["resumo", "movimentacoes", "os"] as const).map((item) => <button key={item} className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${tab === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`} onClick={() => setTab(item)}>{item === "resumo" ? "Resumo" : item === "movimentacoes" ? "Movimentações" : "OS"}</button>)}</div>

        {tab === "resumo" && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><div className="rounded-xl border border-border p-4"><h3 className="font-semibold text-foreground">Totais por forma de pagamento</h3><p className="mt-1 text-xs text-muted-foreground">Mostra de forma simples como o cliente está pagando.</p>{Object.keys(current.byMethod).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Não houve movimentações financeiras neste período. Vendas de produtos e OS pagas aparecerão aqui automaticamente.</p> : <div className="mt-3 space-y-2">{Object.entries(current.byMethod).map(([m, a]) => <div key={m} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{paymentMethodLabels[m] || m}</span><span className="font-semibold text-foreground">{formatCurrency(a)}</span></div>)}</div>}</div><div className="rounded-xl border border-border p-4"><h3 className="font-semibold text-foreground">Leitura rápida para decisão</h3><div className="mt-3 space-y-2 text-sm"><p className="flex justify-between"><span className="text-muted-foreground">Receita por Serviço (OS)</span><span className="font-semibold">{formatCurrency(current.osRevenue)}</span></p><p className="flex justify-between"><span className="text-muted-foreground">Receita por Produto (Venda Balcão)</span><span className="font-semibold">{formatCurrency(current.salesRevenue)}</span></p><p className="flex justify-between"><span className="text-muted-foreground">Quanto foi gasto com peças usadas em serviços e vendas</span><span className="font-semibold">{formatCurrency(current.partsCost)}</span></p><p className="flex justify-between"><span className="text-muted-foreground">Despesas para manter a operação</span><span className="font-semibold">{formatCurrency(current.operationalExpense)}</span></p><p className="flex justify-between border-t border-border pt-2"><span className="font-medium text-foreground">Receita Total consolidada</span><span className="font-semibold text-foreground">{formatCurrency(current.grossRevenue)}</span></p></div></div></div>}

        {tab === "movimentacoes" && <div className="space-y-3"><div className="grid grid-cols-1 gap-2 md:grid-cols-2"><select className="h-9 rounded-lg border border-input bg-card px-3 text-sm" value={originFilter} onChange={(e) => setOriginFilter(e.target.value as typeof originFilter)}><option value="todos">Origem: todas</option><option value="os">Origem: OS</option><option value="venda_balcao">Origem: Venda Balcão</option></select><select className="h-9 rounded-lg border border-input bg-card px-3 text-sm" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}><option value="todos">Pagamento: todos</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="cartao">Cartão</option><option value="outro">Outros</option></select></div><div className="overflow-hidden rounded-lg border border-border/60"><table className="w-full table-fixed text-sm"><thead><tr className="border-b border-border bg-muted/30 text-left"><th className="w-[16%] px-3 py-2 font-medium text-muted-foreground">Data</th><th className="w-[14%] px-3 py-2 font-medium text-muted-foreground">Origem</th><th className="w-[12%] px-3 py-2 font-medium text-muted-foreground">Tipo</th><th className="w-[32%] px-3 py-2 font-medium text-muted-foreground">Descrição</th><th className="w-[14%] px-3 py-2 font-medium text-muted-foreground">Pagamento</th><th className="w-[12%] px-3 py-2 text-right font-medium text-muted-foreground">Valor</th></tr></thead><tbody>{filteredFinancialEntries.length === 0 ? <tr><td className="px-3 py-5 text-sm text-muted-foreground" colSpan={6}>Não houve movimentações financeiras neste período. Vendas de produtos e OS pagas aparecerão aqui automaticamente.</td></tr> : filteredFinancialEntries.map((e) => <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20"><td className="px-3 py-2 text-muted-foreground">{e.date}</td><td className="px-3 py-2 text-muted-foreground break-words">{e.source === "os" ? "OS" : e.source === "venda_peca" || (e.source as string) === "venda_Peça" ? "Venda Balcão" : "Operacional"}</td><td className="px-3 py-2">{e.type === "entrada" ? <span className="text-xs font-medium text-success">Entrada</span> : <span className="text-xs font-medium text-destructive">Saída</span>}</td><td className="px-3 py-2 text-foreground break-words">{e.description}</td><td className="px-3 py-2 text-muted-foreground break-words">{e.paymentMethod ? paymentMethodLabels[e.paymentMethod] : "-"}</td><td className={`px-3 py-2 text-right font-semibold ${e.type === "entrada" ? "text-success" : "text-destructive"}`}>{e.type === "entrada" ? "+" : "-"}{formatCurrency(e.amount)}</td></tr>)}</tbody></table></div></div>}

        {tab === "os" && <div className="overflow-hidden rounded-lg border border-border/60"><table className="w-full table-fixed text-sm"><thead><tr className="border-b border-border bg-muted/30 text-left"><th className="w-[12%] px-3 py-2 font-medium text-muted-foreground">OS</th><th className="w-[26%] px-3 py-2 font-medium text-muted-foreground">Cliente</th><th className="w-[14%] px-3 py-2 font-medium text-muted-foreground">Valor</th><th className="w-[18%] px-3 py-2 font-medium text-muted-foreground">Forma de pagamento</th><th className="w-[16%] px-3 py-2 font-medium text-muted-foreground">Status financeiro</th><th className="w-[14%] px-3 py-2 text-right font-medium text-muted-foreground">Impacto no lucro</th></tr></thead><tbody>{orders.filter((o) => inRange(o.date)).length === 0 ? <tr><td className="px-3 py-5 text-sm text-muted-foreground" colSpan={6}>Nenhuma OS no período selecionado. As ordens aparecerão aqui com impacto no lucro assim que forem registradas.</td></tr> : orders.filter((o) => inRange(o.date)).map((o) => { const parts = o.usedParts.reduce((s, p) => s + p.unitCost * p.qty, 0); const impact = getOrderTotal(o) - parts; return <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20"><td className="px-3 py-2 font-medium text-foreground break-words">{o.id}</td><td className="px-3 py-2 text-foreground break-words">{o.customerName}</td><td className="px-3 py-2 font-semibold text-foreground">{formatCurrency(getOrderTotal(o))}</td><td className="px-3 py-2 text-muted-foreground break-words">{paymentMethodLabels[o.paymentMethod] || "-"}</td><td className="px-3 py-2"><Badge variant={o.paymentStatus === "pago" ? "secondary" : o.paymentStatus === "parcial" ? "outline" : "destructive"}>{o.paymentStatus === "pago" ? "Pago" : o.paymentStatus === "parcial" ? "Parcial" : "Pendente"}</Badge></td><td className={`px-3 py-2 text-right font-semibold ${impact >= 0 ? "text-success" : "text-destructive"}`}>{impact >= 0 ? "+" : "-"}{formatCurrency(Math.abs(impact))}</td></tr>; })}</tbody></table></div>}
      </div>

      <section className="glass-card rounded-xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground">Recebíveis (aging)</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setCreateReceivableOpen(true)}>
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Novo recebível
            </Button>
            <Button size="sm" variant="outline" onClick={chargeAllOverdue}>
              Enviar cobrança em lote
            </Button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-red-700">Total em atraso</p>
            <p className="text-lg font-semibold text-red-800">{formatCurrency(receivablesTotals.overdue)}</p>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-yellow-700">Vencendo hoje</p>
            <p className="text-lg font-semibold text-yellow-800">{formatCurrency(receivablesTotals.dueToday)}</p>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-violet-700">Total a receber</p>
            <p className="text-lg font-semibold text-violet-800">{formatCurrency(receivablesTotals.total)}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="min-w-[840px] w-full table-fixed text-sm">
            <thead>
              <tr className="bg-muted/25 text-left">
                <th className="w-[28%] px-3 py-2">Cliente</th>
                <th className="w-[12%] px-3 py-2">Ref.</th>
                <th className="w-[16%] px-3 py-2">Valor</th>
                <th className="w-[14%] px-3 py-2">Dias em atraso</th>
                <th className="w-[150px] px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {receivablesAging.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={5}>
                    Nenhum recebível pendente.
                  </td>
                </tr>
              ) : (
                receivablesAging.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-muted/20"
                    onClick={() => openReceivableRecord(row)}
                  >
                    <td className="px-3 py-2">{row.customer}</td>
                    <td className="px-3 py-2 font-medium">{row.reference}</td>
                    <td className="px-3 py-2 font-semibold">{formatCurrency(row.value)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex min-w-9 justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${agingBadgeClass(row.daysLate)}`}>
                        {row.daysLate}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          title="Marcar como pago"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReceivableAsPaid(row);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="h-8 w-8"
                          title="Cobrar no WhatsApp"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCharge(row.phone, row.reference, row.value);
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" title="Mais ações" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteReceivable(row);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir recebível
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={detailOpen !== null} onOpenChange={(open) => !open && setDetailOpen(null)}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Detalhamento financeiro</DialogTitle></DialogHeader>{detailRows.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para esse indicador.</p> : <div className="max-h-[60vh] overflow-y-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="px-2 py-2 text-muted-foreground">Data</th><th className="px-2 py-2 text-muted-foreground">Descrição</th><th className="px-2 py-2 text-right text-muted-foreground">Valor</th></tr></thead><tbody>{detailRows.map((r, i) => <tr key={`${r.data}-${i}`} className="border-b border-border/40"><td className="px-2 py-2 text-muted-foreground">{r.data}</td><td className="px-2 py-2 text-foreground">{r.Descrição}</td><td className={`px-2 py-2 text-right font-semibold ${r.valor >= 0 ? "text-success" : "text-destructive"}`}>{r.valor >= 0 ? "+" : "-"}{formatCurrency(Math.abs(r.valor))}</td></tr>)}</tbody></table></div>}</DialogContent></Dialog>

      <Dialog open={createReceivableOpen} onOpenChange={setCreateReceivableOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo recebível avulso</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Cliente</Label>
              <Input value={newReceivableCustomer} onChange={(e) => setNewReceivableCustomer(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Telefone (opcional)</Label>
              <Input value={newReceivablePhone} onChange={(e) => setNewReceivablePhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Descrição</Label>
              <Input value={newReceivableDescription} onChange={(e) => setNewReceivableDescription(e.target.value)} placeholder="Ex.: Mensalidade plano suporte" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Valor (R$)</Label>
                <Input value={newReceivableAmount} onChange={(e) => setNewReceivableAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Vencimento</Label>
                <Input type="date" value={newReceivableDueDate} onChange={(e) => setNewReceivableDueDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs uppercase text-muted-foreground">Meio</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                  value={newReceivableMethod}
                  onChange={(e) => setNewReceivableMethod(e.target.value as PaymentMethod)}
                >
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                  <option value="cartao">Cartão</option>
                  <option value="outro">Outros</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setCreateReceivableOpen(false)}>Cancelar</Button>
              <Button onClick={createManualReceivable}>Adicionar recebível</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


