import { useCallback, useEffect, useMemo, useState } from "react";
<<<<<<< HEAD
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { formatCurrency, getOrderTotal, useAppStore } from "@/store/appStore";
import { paymentMethodLabels } from "@/features/financial/constants";
import { useFinancialFilters } from "@/features/financial/hooks/useFinancialFilters";
import { useReceivablesActions } from "@/features/financial/hooks/useReceivablesActions";
import { FinancialHeader } from "@/features/financial/components/FinancialHeader";
import { FinancialTabs } from "@/features/financial/components/FinancialTabs";
import { ReceivablesSection } from "@/features/financial/components/ReceivablesSection";
import { FinancialDetailDialog } from "@/features/financial/components/FinancialDetailDialog";
import { NewReceivableDialog } from "@/features/financial/components/NewReceivableDialog";
import { FinancialCharts } from "@/features/financial/components/FinancialCharts";
import { FinancialKpis } from "@/features/financial/components/FinancialKpis";
import { exportCsvFile } from "@/features/financial/export/csv";
import { exportFinancialPdf } from "@/features/financial/export/pdf";
import {
  buildCombinedCashEntries,
  buildFinancialChartSeries,
  buildPendingTrend,
  calculateFinancialDeltas,
  calculateFinancialSnapshot,
  formatBrDate,
  inDateRange,
} from "@/features/financial/selectors";
import { DetailKey } from "@/features/financial/types";
=======
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
import { UnifiedChartTooltip, UnifiedLegend } from "@/components/charts/UnifiedChart";

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
>>>>>>> 23a87ed444bf90867076ed78f9da27bb9c4ff7f8

export default function Financial() {
  const navigate = useNavigate();
  const { orders, cashEntries, expenses, updateOrder, addCashEntry, cancelCashEntry } = useAppStore();
  const {
    preset,
    setPreset,
    customStart,
    setCustomStart,
    customEnd,
    setCustomEnd,
    tab,
    setTab,
    originFilter,
    setOriginFilter,
    methodFilter,
    setMethodFilter,
    periodRange,
    previousRange,
    toInputDate,
    fromInputDate,
  } = useFinancialFilters();
  const [calculating, setCalculating] = useState(false);
  const [detailOpen, setDetailOpen] = useState<DetailKey | null>(null);
  const [createReceivableOpen, setCreateReceivableOpen] = useState(false);

  useEffect(() => {
    setCalculating(true);
    const t = setTimeout(() => setCalculating(false), 180);
    return () => clearTimeout(t);
  }, [periodRange]);

  const inRange = useCallback((brDate?: string, range = periodRange) => inDateRange(brDate, range), [periodRange]);

  const current = useMemo(
    () => calculateFinancialSnapshot({ orders, cashEntries, expenses, range: periodRange }),
    [orders, cashEntries, expenses, periodRange]
  );
  const previous = useMemo(
    () => calculateFinancialSnapshot({ orders, cashEntries, expenses, range: previousRange }),
    [orders, cashEntries, expenses, previousRange]
  );
  const deltas = useMemo(() => calculateFinancialDeltas(current, previous), [current, previous]);
  const chartSeries = useMemo(() => buildFinancialChartSeries(periodRange, current), [periodRange, current]);

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
  const pendingTrend = useMemo(
    () => buildPendingTrend(chartSeries, current.pendingOrders),
    [chartSeries, current.pendingOrders]
  );
  const combinedCashEntries = useMemo(
    () => buildCombinedCashEntries(current.paidOrders, cashEntries, periodRange),
    [current.paidOrders, cashEntries, periodRange]
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

  const {
    receivablesAging,
    receivablesTotals,
    agingBadgeClass,
    markReceivableAsPaid,
    deleteReceivable,
    openCharge,
    chargeAllOverdue,
    openReceivableRecord,
    createManualReceivable,
    newReceivableCustomer,
    setNewReceivableCustomer,
    newReceivablePhone,
    setNewReceivablePhone,
    newReceivableDescription,
    setNewReceivableDescription,
    newReceivableAmount,
    setNewReceivableAmount,
    newReceivableDueDate,
    setNewReceivableDueDate,
    newReceivableMethod,
    setNewReceivableMethod,
  } = useReceivablesActions({
    orders,
    cashEntries,
    updateOrder,
    addCashEntry,
    cancelCashEntry,
    fromInputDate,
    toInputDate,
    onOpenCashDetail: () => setDetailOpen("cash"),
    navigateToOrders: () => navigate("/ordens"),
  });

  const exportExcel = () => {
    const rows: string[][] = [["Data", "Descrição", "Tipo", "Pagamento", "Valor"], ...combinedCashEntries.map((e) => [e.date, e.description, e.type === "entrada" ? "Entrada" : "Saida", e.paymentMethod ? paymentMethodLabels[e.paymentMethod] : "-", (e.type === "saida" ? -e.amount : e.amount) / 100])];
    exportCsvFile(`financeiro-${toInputDate(new Date())}.csv`, rows);
    toast.success("Relatorio Excel (CSV) exportado.");
  };

  const exportPdf = () => {
    exportFinancialPdf({
      periodStart: periodRange.start,
      periodEnd: periodRange.end,
      current,
      combinedCashEntries,
      fileDate: toInputDate(new Date()),
    });
    toast.success("Relatorio PDF exportado.");
  };

  const periodLabel = `${formatBrDate(periodRange.start)} a ${formatBrDate(periodRange.end)}`;

  return (
    <div className="space-y-3 animate-fade-in">
      <FinancialHeader
        preset={preset}
        setPreset={setPreset}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        periodLabel={periodLabel}
        onExportPdf={exportPdf}
        onExportExcel={exportExcel}
      />

      {calculating ? <div className="glass-card rounded-xl p-8 text-center text-sm text-muted-foreground">Atualizando indicadores...</div> : (
        <>
<<<<<<< HEAD
          <FinancialCharts
            chartSeries={chartSeries}
            hasAnySeriesData={hasAnySeriesData}
            osProfitBars={osProfitBars}
            osProfitBarsSafe={osProfitBarsSafe}
            paymentPieDataSafe={paymentPieDataSafe}
            hasPaymentData={hasPaymentData}
          />
=======
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
                    <Tooltip content={<UnifiedChartTooltip kind="currency" />} />
                    <Line dataKey="receita" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2.2} />
                    <Line dataKey="custo" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2.2} />
                    <Line dataKey="despesa" stroke="hsl(var(--warning))" dot={false} strokeWidth={2.2} />
                    <Line dataKey="lucro" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2.2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <UnifiedLegend
                items={[
                  { label: "Receita", color: "hsl(var(--chart-3))" },
                  { label: "Custo", color: "hsl(var(--chart-5))" },
                  { label: "Despesa", color: "hsl(var(--warning))" },
                  { label: "Lucro", color: "hsl(var(--chart-1))" },
                ]}
              />
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
                    <Tooltip content={<UnifiedChartTooltip kind="currency" />} />
                    <Bar dataKey="lucro" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <UnifiedLegend items={[{ label: "Lucro por OS", color: "hsl(var(--chart-2))" }]} />
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
                        <Tooltip content={<UnifiedChartTooltip kind="currency" />} />
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
              {hasPaymentData ? (
                <UnifiedLegend items={paymentPieDataSafe.map((item, i) => ({ label: item.name, color: paymentPalette[i % paymentPalette.length] }))} />
              ) : null}
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
>>>>>>> 23a87ed444bf90867076ed78f9da27bb9c4ff7f8

          <FinancialKpis
            current={current}
            deltas={deltas}
            revenueTrend={revenueTrend}
            costExpenseTrend={costExpenseTrend}
            profitTrend={profitTrend}
            pendingTrend={pendingTrend}
            onOpenDetail={(detail) => setDetailOpen(detail)}
            onSetTab={setTab}
          />
        </>
      )}

      <FinancialTabs
        tab={tab}
        setTab={setTab}
        current={current}
        orders={orders}
        inRange={inRange}
        filteredFinancialEntries={filteredFinancialEntries}
        originFilter={originFilter}
        setOriginFilter={setOriginFilter}
        methodFilter={methodFilter}
        setMethodFilter={setMethodFilter}
      />

      <ReceivablesSection
        receivablesAging={receivablesAging}
        receivablesTotals={receivablesTotals}
        agingBadgeClass={agingBadgeClass}
        onNewReceivable={() => setCreateReceivableOpen(true)}
        onChargeAllOverdue={chargeAllOverdue}
        onOpenRecord={openReceivableRecord}
        onMarkAsPaid={markReceivableAsPaid}
        onOpenCharge={(row) => openCharge(row.phone, row.reference, row.value)}
        onDelete={deleteReceivable}
      />

      <FinancialDetailDialog open={detailOpen !== null} onClose={() => setDetailOpen(null)} detailRows={detailRows} />

      <NewReceivableDialog
        open={createReceivableOpen}
        onOpenChange={setCreateReceivableOpen}
        customer={newReceivableCustomer}
        setCustomer={setNewReceivableCustomer}
        phone={newReceivablePhone}
        setPhone={setNewReceivablePhone}
        description={newReceivableDescription}
        setDescription={setNewReceivableDescription}
        amount={newReceivableAmount}
        setAmount={setNewReceivableAmount}
        dueDate={newReceivableDueDate}
        setDueDate={setNewReceivableDueDate}
        method={newReceivableMethod}
        setMethod={setNewReceivableMethod}
        onSubmit={() => createManualReceivable(() => setCreateReceivableOpen(false))}
      />
    </div>
  );
}


