import { useCallback, useEffect, useMemo, useState } from "react";
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
          <FinancialCharts
            chartSeries={chartSeries}
            hasAnySeriesData={hasAnySeriesData}
            osProfitBars={osProfitBars}
            osProfitBarsSafe={osProfitBarsSafe}
            paymentPieDataSafe={paymentPieDataSafe}
            hasPaymentData={hasPaymentData}
          />

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


