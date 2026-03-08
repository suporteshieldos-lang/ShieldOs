import type { CashEntry, OperationalExpense } from "@/store/appStore";
import type { ReceivableRow } from "@/features/financial/types";
import { parseBrDate } from "@/features/financial/selectors";

export type KpiSnapshot = {
  currentBalance: number;
  projectedIncoming: number;
  projectedOutgoing: number;
  projectedBalance: number;
};

export type CashFlowPoint = {
  label: string;
  entradas: number;
  saidas: number;
  saldo: number;
};

export function calculateKpis(
  activeCash: CashEntry[],
  expenses: OperationalExpense[],
  receivables: ReceivableRow[]
): KpiSnapshot {
  const currentBalance = activeCash
    .filter((entry) => entry.financialStatus !== "previsto")
    .reduce((sum, entry) => sum + (entry.type === "entrada" ? entry.amount : -entry.amount), 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 30);

  const projectedIncoming = receivables
    .filter((row) => row.dueDate >= now && row.dueDate <= limit)
    .reduce((sum, row) => sum + row.value, 0);

  const expenseTotal = expenses
    .filter((expense) => {
      const d = parseBrDate(expense.date);
      return !!d && d >= now && d <= limit;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  const cashOutForecast = activeCash
    .filter((entry) => {
      if (entry.type !== "saida" || entry.financialStatus !== "previsto") return false;
      const d = parseBrDate(entry.date);
      return !!d && d >= now && d <= limit;
    })
    .reduce((sum, entry) => sum + entry.amount, 0);

  const projectedOutgoing = expenseTotal + cashOutForecast;
  const projectedBalance = currentBalance + projectedIncoming - projectedOutgoing;

  return { currentBalance, projectedIncoming, projectedOutgoing, projectedBalance };
}

export function buildCashFlowSeries(
  activeCash: CashEntry[],
  expenses: OperationalExpense[],
  start: Date,
  end: Date,
  toInputDate: (d: Date) => string
): CashFlowPoint[] {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999);

  const keyOf = (d: Date) => toInputDate(d);
  const bucket = new Map<string, { label: string; entradas: number; saidas: number }>();

  for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const key = keyOf(d);
    bucket.set(key, {
      label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      entradas: 0,
      saidas: 0,
    });
  }

  let balanceBefore = 0;

  activeCash.forEach((entry) => {
    const dt = parseBrDate(entry.date);
    if (!dt) return;

    if (dt < s && entry.financialStatus !== "previsto") {
      balanceBefore += entry.type === "entrada" ? entry.amount : -entry.amount;
    }

    const point = bucket.get(keyOf(dt));
    if (!point) return;
    if (entry.type === "entrada") point.entradas += entry.amount;
    if (entry.type === "saida") point.saidas += entry.amount;
  });

  expenses.forEach((expense) => {
    const dt = parseBrDate(expense.date);
    if (!dt) return;
    if (dt < s) balanceBefore -= expense.amount;

    const point = bucket.get(keyOf(dt));
    if (!point) return;
    point.saidas += expense.amount;
  });

  let running = balanceBefore / 100;

  return Array.from(bucket.values()).map((point) => {
    const entradas = point.entradas / 100;
    const saidas = point.saidas / 100;
    running += entradas - saidas;
    return { label: point.label, entradas, saidas, saldo: running };
  });
}

export function filterReceivables(rows: ReceivableRow[], query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return rows;
  const digits = query.replace(/\D/g, "");

  return rows.filter((row) => {
    const byCustomer = row.customer.toLowerCase().includes(q);
    const byReference = row.reference.toLowerCase().includes(q);
    const byPhone = row.phone.replace(/\D/g, "").includes(digits);
    return byCustomer || byReference || byPhone;
  });
}
