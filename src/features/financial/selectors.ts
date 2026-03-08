import { CashEntry, OperationalExpense, RepairOrder, getOrderTotal } from "@/store/appStore";

export type DateRange = {
  start: Date;
  end: Date;
};

export type FinancialSnapshot = {
  paidOrders: RepairOrder[];
  pendingOrders: RepairOrder[];
  salesEntries: CashEntry[];
  manualIn: CashEntry[];
  operationalCashOut: CashEntry[];
  expenseRows: OperationalExpense[];
  expenseDetailRows: Array<{ data: string; Descrição: string; valor: number }>;
  grossRevenue: number;
  osRevenue: number;
  salesRevenue: number;
  partsCost: number;
  operationalExpense: number;
  totalCostsAndExpenses: number;
  netProfit: number;
  cashPeriod: number;
  pendingValue: number;
  byMethod: Record<string, number>;
};

export type FinancialChartRow = {
  date: string;
  receita: number;
  custo: number;
  despesa: number;
  lucro: number;
};

export type CombinedCashEntry = {
  id: string;
  date: string;
  type: "entrada" | "saida";
  description: string;
  amount: number;
  paymentMethod?: string;
  source?: string;
};

export type FinancialDeltaSet = {
  grossRevenue: number | null;
  partsCost: number | null;
  operationalExpense: number | null;
  totalCostsAndExpenses: number | null;
  netProfit: number | null;
  osRevenue: number | null;
  salesRevenue: number | null;
  pendingValue: number | null;
};

const isCounterSaleSource = (source?: string) => source === "venda_peca" || source === "venda_Peça";
const paymentMethodLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  cartao: "Cartão",
  outro: "Outro",
};

export function parseBrDate(value?: string) {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function formatBrDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

export function inDateRange(brDate: string | undefined, range: DateRange) {
  const d = parseBrDate(brDate);
  return !!d && d >= range.start && d <= range.end;
}

export function calculateFinancialSnapshot({
  orders,
  cashEntries,
  expenses,
  range,
}: {
  orders: RepairOrder[];
  cashEntries: CashEntry[];
  expenses: OperationalExpense[];
  range: DateRange;
}): FinancialSnapshot {
  const activeCash = cashEntries.filter((entry) => entry.status !== "cancelada");
  const paidOrders = orders.filter(
    (order) => order.paymentStatus === "pago" && inDateRange(order.paymentDate || order.date, range)
  );
  const pendingOrders = orders.filter(
    (order) => order.paymentStatus !== "pago" && inDateRange(order.date, range)
  );
  const salesEntries = activeCash.filter(
    (entry) => entry.type === "entrada" && isCounterSaleSource(entry.source) && inDateRange(entry.date, range)
  );
  const manualIn = activeCash.filter(
    (entry) => entry.type === "entrada" && entry.source === "manual" && inDateRange(entry.date, range)
  );
  const operationalCashOut = activeCash.filter(
    (entry) => entry.type === "saida" && entry.source === "despesa" && inDateRange(entry.date, range)
  );
  const expenseRows = expenses.filter((expense) => inDateRange(expense.date, range));

  const osRevenue = paidOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
  const salesRevenue = salesEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const grossRevenue = osRevenue + salesRevenue;

  const osPartsCost = paidOrders.reduce(
    (sum, order) => sum + order.usedParts.reduce((acc, part) => acc + part.unitCost * part.qty, 0),
    0
  );
  const salesPartsCost = salesEntries.reduce(
    (sum, entry) => sum + (entry.saleUnitCost || 0) * (entry.saleQty || 0),
    0
  );
  const partsCost = osPartsCost + salesPartsCost;

  const expenseDetailRows = [
    ...expenseRows.map((expense) => ({
      data: expense.date,
      Descrição: `${expense.category}${expense.notes ? ` - ${expense.notes}` : ""}`,
      valor: -expense.amount,
    })),
    ...operationalCashOut.map((entry) => ({
      data: entry.date,
      Descrição: entry.description || "Saida operacional",
      valor: -entry.amount,
    })),
  ];

  const operationalExpense = Math.abs(expenseDetailRows.reduce((sum, row) => sum + row.valor, 0));
  const totalCostsAndExpenses = partsCost + operationalExpense;
  const netProfit = grossRevenue - partsCost - operationalExpense;
  const cashPeriod = activeCash
    .filter((entry) => inDateRange(entry.date, range))
    .reduce((sum, entry) => sum + (entry.type === "entrada" ? entry.amount : -entry.amount), 0);
  const pendingValue = pendingOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);

  const byMethod = activeCash
    .filter((entry) => entry.type === "entrada" && inDateRange(entry.date, range))
    .reduce((acc, entry) => {
      const method = entry.paymentMethod || "outro";
      acc[method] = (acc[method] || 0) + entry.amount;
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
}

export function buildFinancialChartSeries(range: DateRange, snapshot: FinancialSnapshot): FinancialChartRow[] {
  const bucket = new Map<string, { receita: number; custo: number; despesa: number }>();
  for (const d = new Date(range.start); d <= range.end; d.setDate(d.getDate() + 1)) {
    bucket.set(formatBrDate(d), { receita: 0, custo: 0, despesa: 0 });
  }

  snapshot.paidOrders.forEach((order) => {
    const key = order.paymentDate || order.date;
    const day = bucket.get(key);
    if (!day) return;
    day.receita += getOrderTotal(order);
    day.custo += order.usedParts.reduce((sum, part) => sum + part.unitCost * part.qty, 0);
  });

  snapshot.salesEntries.forEach((entry) => {
    const day = bucket.get(entry.date);
    if (!day) return;
    day.receita += entry.amount;
    day.custo += (entry.saleUnitCost || 0) * (entry.saleQty || 0);
  });

  snapshot.expenseRows.forEach((expense) => {
    const day = bucket.get(expense.date);
    if (!day) return;
    day.despesa += expense.amount;
  });

  return Array.from(bucket.entries()).map(([date, value]) => ({
    date,
    receita: value.receita / 100,
    custo: value.custo / 100,
    despesa: -(value.despesa / 100),
    lucro: (value.receita - value.custo - value.despesa) / 100,
  }));
}

export function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function calculateFinancialDeltas(
  current: FinancialSnapshot,
  previous: FinancialSnapshot
): FinancialDeltaSet {
  return {
    grossRevenue: percentageChange(current.grossRevenue, previous.grossRevenue),
    partsCost: percentageChange(current.partsCost, previous.partsCost),
    operationalExpense: percentageChange(current.operationalExpense, previous.operationalExpense),
    totalCostsAndExpenses: percentageChange(current.totalCostsAndExpenses, previous.totalCostsAndExpenses),
    netProfit: percentageChange(current.netProfit, previous.netProfit),
    osRevenue: percentageChange(current.osRevenue, previous.osRevenue),
    salesRevenue: percentageChange(current.salesRevenue, previous.salesRevenue),
    pendingValue: percentageChange(current.pendingValue, previous.pendingValue),
  };
}

export function buildPendingTrend(chartSeries: FinancialChartRow[], pendingOrders: RepairOrder[]) {
  const bucket = new Map<string, number>();
  chartSeries.forEach((row) => bucket.set(row.date, 0));
  pendingOrders.forEach((order) => {
    const key = order.date;
    if (!bucket.has(key)) return;
    bucket.set(key, (bucket.get(key) || 0) + getOrderTotal(order) / 100);
  });
  return Array.from(bucket.entries()).map(([label, value]) => ({ label, value }));
}

export function buildCombinedCashEntries(
  paidOrders: RepairOrder[],
  cashEntries: CashEntry[],
  range: DateRange
): CombinedCashEntry[] {
  const osCashEntries = paidOrders.map((order) => ({
    id: `os-${order.id}`,
    date: order.paymentDate || order.date,
    type: "entrada" as const,
    description: `Recebimento ${order.id} (${paymentMethodLabels[order.paymentMethod] || order.paymentMethod})`,
    amount: getOrderTotal(order),
    paymentMethod: order.paymentMethod,
    source: "os" as const,
  }));

  return [...osCashEntries, ...cashEntries.filter((entry) => entry.status !== "cancelada" && inDateRange(entry.date, range))].sort(
    (a, b) => (parseBrDate(b.date)?.getTime() || 0) - (parseBrDate(a.date)?.getTime() || 0)
  );
}
