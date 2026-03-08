import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useFinancialFilters } from "@/features/financial/hooks/useFinancialFilters";
import { useReceivablesActions } from "@/features/financial/hooks/useReceivablesActions";
import { buildCashFlowSeries, filterReceivables } from "@/features/financial/selectors/financialCalculations";
import { exportReceivablesCsv } from "@/features/financial/export/exportCsv";
import { parseBrDate } from "@/features/financial/selectors";
import { useAppStore, getOrderTotal } from "@/store/appStore";
import type { PaymentMethod } from "@/store/appStore";
import type { ReceivableRow } from "@/features/financial/types";

type QuickStatusFilter = "todos" | "atrasados" | "vence_hoje" | "proximos_7" | "pagos";
type DuePeriodFilter = "todos" | "hoje" | "7dias" | "30dias";

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date) {
  const v = new Date(d);
  v.setHours(0, 0, 0, 0);
  return v;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInCurrentMonth(d: Date) {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function pct(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

function toStatus(row: ReceivableRow): ReceivableRow["status"] {
  if (row.daysLate > 0) return "atrasado";
  if (row.daysLate === 0 && isSameDay(row.dueDate, new Date())) return "vence_hoje";
  return "a_vencer";
}

export function useFinancialData() {
  const { hydrated, orders, cashEntries, expenses, updateOrder, addCashEntry, cancelCashEntry } = useAppStore();
  const { periodRange, toInputDate, fromInputDate } = useFinancialFilters();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quickFilter, setQuickFilter] = useState<QuickStatusFilter>("todos");
  const [periodFilter, setPeriodFilter] = useState<DuePeriodFilter>("todos");
  const [customerFilter, setCustomerFilter] = useState("todos");
  const [technicianFilter, setTechnicianFilter] = useState("todos");
  const [methodFilter, setMethodFilter] = useState<"todos" | PaymentMethod>("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hydrated) {
      setLoading(true);
      return;
    }
    const timer = setTimeout(() => setLoading(false), 240);
    return () => clearTimeout(timer);
  }, [hydrated]);

  const {
    receivablesAging,
    markReceivableAsPaid,
    deleteReceivable,
    openCharge,
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
    onOpenCashDetail: () => {},
    navigateToOrders: () => {},
  });

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const cashById = useMemo(() => new Map(cashEntries.map((entry) => [entry.id, entry])), [cashEntries]);

  const enrichedReceivables = useMemo(() => {
    return receivablesAging.map((row) => {
      if (row.sourceKind === "pending_order") {
        const order = orderById.get(row.sourceId);
        return {
          ...row,
          paymentMethod: order?.paymentMethod,
          technician: order?.technician || "Sem tecnico",
          status: toStatus(row),
        };
      }

      const cash = cashById.get(row.sourceId);
      return {
        ...row,
        paymentMethod: cash?.paymentMethod,
        technician: cash?.employeeName || "Sem tecnico",
        status: toStatus(row),
      };
    });
  }, [receivablesAging, orderById, cashById]);

  const activeCash = useMemo(
    () => cashEntries.filter((entry) => entry.status !== "cancelada" && entry.status !== "estornada"),
    [cashEntries]
  );

  const receivedPaidEntries = useMemo(
    () => activeCash.filter((entry) => entry.type === "entrada" && entry.financialStatus !== "previsto"),
    [activeCash]
  );

  const today = startOfDay(new Date());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const receivedToday = useMemo(
    () =>
      receivedPaidEntries
        .filter((entry) => {
          const d = parseBrDate(entry.date);
          return !!d && isSameDay(d, today);
        })
        .reduce((sum, entry) => sum + entry.amount, 0),
    [receivedPaidEntries, today]
  );

  const receivedYesterday = useMemo(
    () =>
      receivedPaidEntries
        .filter((entry) => {
          const d = parseBrDate(entry.date);
          return !!d && isSameDay(d, yesterday);
        })
        .reduce((sum, entry) => sum + entry.amount, 0),
    [receivedPaidEntries, yesterday]
  );

  const receivedMonth = useMemo(
    () =>
      receivedPaidEntries
        .filter((entry) => {
          const d = parseBrDate(entry.date);
          return !!d && isInCurrentMonth(d);
        })
        .reduce((sum, entry) => sum + entry.amount, 0),
    [receivedPaidEntries]
  );

  const previousMonth = new Date();
  previousMonth.setMonth(previousMonth.getMonth() - 1);

  const receivedPreviousMonth = useMemo(
    () =>
      receivedPaidEntries
        .filter((entry) => {
          const d = parseBrDate(entry.date);
          return !!d && d.getFullYear() === previousMonth.getFullYear() && d.getMonth() === previousMonth.getMonth();
        })
        .reduce((sum, entry) => sum + entry.amount, 0),
    [receivedPaidEntries, previousMonth]
  );

  const currentBalance = useMemo(
    () =>
      activeCash
        .filter((entry) => entry.financialStatus !== "previsto")
        .reduce((sum, entry) => sum + (entry.type === "entrada" ? entry.amount : -entry.amount), 0),
    [activeCash]
  );

  const receivableTotal = useMemo(() => enrichedReceivables.reduce((sum, row) => sum + row.value, 0), [enrichedReceivables]);
  const overdueValue = useMemo(
    () => enrichedReceivables.filter((row) => row.daysLate > 0).reduce((sum, row) => sum + row.value, 0),
    [enrichedReceivables]
  );

  const openOrdersAwaitingPayment = useMemo(
    () => orders.filter((order) => order.paymentStatus !== "pago" && order.status !== "cancelled").length,
    [orders]
  );

  const receivedNext7 = useMemo(() => {
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 7);
    return enrichedReceivables
      .filter((row) => row.dueDate >= today && row.dueDate <= limit)
      .reduce((sum, row) => sum + row.value, 0);
  }, [enrichedReceivables, today]);

  const mainKpis = useMemo(
    () => [
      { key: "balance", title: "Saldo atual em caixa", value: currentBalance, delta: pct(currentBalance, currentBalance - receivedMonth), icon: "wallet", format: "currency" as const },
      { key: "today", title: "Recebido hoje", value: receivedToday, delta: pct(receivedToday, receivedYesterday), icon: "calendar", format: "currency" as const },
      { key: "month", title: "Recebido no mes", value: receivedMonth, delta: pct(receivedMonth, receivedPreviousMonth), icon: "trending", format: "currency" as const },
      { key: "toReceive", title: "A receber total", value: receivableTotal, delta: pct(receivableTotal, receivableTotal - receivedNext7), icon: "coins", format: "currency" as const },
      { key: "overdue", title: "Valores em atraso", value: overdueValue, delta: pct(overdueValue, receivedPreviousMonth || 1), icon: "alert", format: "currency" as const },
      { key: "openOs", title: "OS abertas aguardando pagamento", value: openOrdersAwaitingPayment, delta: 0, icon: "file", format: "count" as const },
    ],
    [currentBalance, receivedToday, receivedMonth, receivableTotal, overdueValue, openOrdersAwaitingPayment, receivedYesterday, receivedPreviousMonth, receivedNext7]
  );

  const paidOrdersMonth = useMemo(
    () =>
      orders.filter((order) => {
        if (order.paymentStatus !== "pago") return false;
        const d = parseBrDate(order.paymentDate || order.date);
        return !!d && isInCurrentMonth(d);
      }),
    [orders]
  );

  const operationalKpis = useMemo(() => {
    const orderRevenue = paidOrdersMonth.reduce((sum, order) => sum + getOrderTotal(order), 0);
    const finishedMonth = orders.filter((order) => {
      const d = parseBrDate(order.completedDate || order.date);
      return !!d && isInCurrentMonth(d) && (order.status === "completed" || order.status === "delivered");
    }).length;
    const customers = new Set(paidOrdersMonth.map((o) => o.customerName.trim().toLowerCase()).filter(Boolean));
    const avgRepair = paidOrdersMonth.length ? Math.round(orderRevenue / paidOrdersMonth.length) : 0;

    return {
      avgTicket: avgRepair,
      servicesFinished: finishedMonth,
      customersServed: customers.size,
      avgRepairValue: avgRepair,
    };
  }, [orders, paidOrdersMonth]);

  const cashFlow30 = useMemo(() => {
    const end = startOfDay(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return buildCashFlowSeries(activeCash, expenses, start, end, toInputDate);
  }, [activeCash, expenses, toInputDate]);

  const dailyRevenueBars = useMemo(
    () =>
      cashFlow30.map((point) => ({
        label: point.label,
        faturamento: Math.max(0, point.entradas),
      })),
    [cashFlow30]
  );

  const revenueOrigin = useMemo(() => {
    let servicos = 0;
    let pecas = 0;
    let acessorios = 0;

    paidOrdersMonth.forEach((order) => {
      servicos += getOrderTotal(order);
    });

    activeCash
      .filter((entry) => entry.type === "entrada" && entry.source === "venda_peca" && entry.financialStatus !== "previsto")
      .forEach((entry) => {
        if ((entry.description || "").toLowerCase().includes("acessor")) acessorios += entry.amount;
        else pecas += entry.amount;
      });

    return [
      { name: "Servicos", value: servicos / 100 },
      { name: "Pecas", value: pecas / 100 },
      { name: "Acessorios", value: acessorios / 100 },
    ];
  }, [paidOrdersMonth, activeCash]);

  const technicianRanking = useMemo(() => {
    const map = new Map<string, number>();
    paidOrdersMonth.forEach((order) => {
      const key = order.technician?.trim() || "Sem tecnico";
      map.set(key, (map.get(key) || 0) + getOrderTotal(order));
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [paidOrdersMonth]);

  const topCustomers = useMemo(() => {
    const map = new Map<string, number>();
    paidOrdersMonth.forEach((order) => {
      const key = order.customerName || "Sem nome";
      map.set(key, (map.get(key) || 0) + getOrderTotal(order));
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [paidOrdersMonth]);

  const delinquentCustomers = useMemo(() => {
    const map = new Map<string, number>();
    enrichedReceivables.filter((row) => row.daysLate > 0).forEach((row) => {
      map.set(row.customer, (map.get(row.customer) || 0) + row.value);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [enrichedReceivables]);

  const topParts = useMemo(() => {
    const map = new Map<string, number>();
    activeCash.filter((entry) => entry.source === "venda_peca" && entry.saleQty).forEach((entry) => {
      const key = entry.inventoryItemName || entry.description || "Peca avulsa";
      map.set(key, (map.get(key) || 0) + (entry.saleQty || 1));
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [activeCash]);

  const topServices = useMemo(() => {
    const map = new Map<string, number>();
    paidOrdersMonth.forEach((order) => {
      const key = (order.reportedProblem || order.repairActions || "Servico tecnico").trim();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [paidOrdersMonth]);

  const customerOptions = useMemo(() => {
    const set = new Set(enrichedReceivables.map((row) => row.customer));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enrichedReceivables]);

  const technicianOptions = useMemo(() => {
    const set = new Set(enrichedReceivables.map((row) => row.technician || "Sem tecnico"));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enrichedReceivables]);

  const methodOptions = useMemo(() => {
    const set = new Set(
      enrichedReceivables.map((row) => row.paymentMethod).filter((v): v is PaymentMethod => Boolean(v))
    );
    return Array.from(set);
  }, [enrichedReceivables]);

  const filteredByStatus = useMemo(() => {
    if (quickFilter === "todos") return enrichedReceivables;
    if (quickFilter === "atrasados") return enrichedReceivables.filter((row) => row.daysLate > 0);
    if (quickFilter === "vence_hoje") return enrichedReceivables.filter((row) => row.status === "vence_hoje");
    if (quickFilter === "proximos_7") {
      const max = new Date(today);
      max.setDate(max.getDate() + 7);
      return enrichedReceivables.filter((row) => row.dueDate >= today && row.dueDate <= max && row.daysLate === 0);
    }
    return [];
  }, [enrichedReceivables, quickFilter, today]);

  const filteredByPeriod = useMemo(() => {
    if (periodFilter === "todos") return filteredByStatus;
    if (periodFilter === "hoje") return filteredByStatus.filter((row) => isSameDay(row.dueDate, today));
    const max = new Date(today);
    if (periodFilter === "7dias") max.setDate(max.getDate() + 7);
    if (periodFilter === "30dias") max.setDate(max.getDate() + 30);
    return filteredByStatus.filter((row) => row.dueDate >= today && row.dueDate <= max);
  }, [filteredByStatus, periodFilter, today]);

  const filteredRows = useMemo(() => {
    let rows = filteredByPeriod;
    if (customerFilter !== "todos") rows = rows.filter((row) => row.customer === customerFilter);
    if (technicianFilter !== "todos") rows = rows.filter((row) => (row.technician || "Sem tecnico") === technicianFilter);
    if (methodFilter !== "todos") rows = rows.filter((row) => row.paymentMethod === methodFilter);
    return filterReceivables(rows, search);
  }, [filteredByPeriod, customerFilter, technicianFilter, methodFilter, search]);

  const allVisibleSelected = useMemo(
    () => filteredRows.length > 0 && filteredRows.every((row) => selectedIds.has(row.id)),
    [filteredRows, selectedIds]
  );

  const selectedRows = useMemo(() => filteredRows.filter((row) => selectedIds.has(row.id)), [filteredRows, selectedIds]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filteredRows.forEach((r) => next.delete(r.id));
      else filteredRows.forEach((r) => next.add(r.id));
      return next;
    });
  }, [allVisibleSelected, filteredRows]);

  const markSelectedAsPaid = useCallback(() => {
    if (selectedRows.length === 0) return;
    selectedRows.forEach((row) => markReceivableAsPaid(row));
    setSelectedIds(new Set());
  }, [selectedRows, markReceivableAsPaid]);

  const exportSelected = useCallback(() => {
    if (selectedRows.length === 0) return toast.error("Selecione ao menos um recebivel.");
    exportReceivablesCsv(`recebiveis-${toInputDate(new Date())}.csv`, selectedRows);
    toast.success("CSV exportado.");
  }, [selectedRows, toInputDate]);

  const sendWhatsappCharge = useCallback((row: ReceivableRow) => {
    const text = `Ola ${row.customer}, sua ordem ${row.reference} no valor de ${(row.value / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })} venceu em ${row.dueDate.toLocaleDateString("pt-BR")}. Favor realizar o pagamento.`;
    openCharge(row.phone, row.reference, row.value);
    navigator.clipboard?.writeText(text).catch(() => undefined);
  }, [openCharge]);

  return {
    loading,
    mainKpis,
    operationalKpis,
    charts: {
      cashFlow30,
      dailyRevenueBars,
      revenueOrigin,
      technicianRanking,
    },
    widgets: {
      topCustomers,
      delinquentCustomers,
      topParts,
      topServices,
    },
    table: {
      rows: filteredRows,
      total: enrichedReceivables.length,
      selectedIds,
      allVisibleSelected,
      selectedCount: selectedRows.length,
      search,
      quickFilter,
      periodFilter,
      customerFilter,
      technicianFilter,
      methodFilter,
      customerOptions,
      technicianOptions,
      methodOptions,
      setSearch,
      setQuickFilter,
      setPeriodFilter,
      setCustomerFilter,
      setTechnicianFilter,
      setMethodFilter,
      toggleSelect,
      toggleSelectAll,
      markSelectedAsPaid,
      exportSelected,
      onMarkAsPaid: markReceivableAsPaid,
      onDelete: deleteReceivable,
      onCharge: sendWhatsappCharge,
    },
    actions: {
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
    },
  };
}
