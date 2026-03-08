import { describe, expect, it } from "vitest";
import { CashEntry, OperationalExpense, RepairOrder } from "@/store/appStore";
import {
  buildCombinedCashEntries,
  buildFinancialChartSeries,
  buildPendingTrend,
  calculateFinancialDeltas,
  calculateFinancialSnapshot,
  inDateRange,
  parseBrDate,
} from "./selectors";

function makeOrder(overrides: Partial<RepairOrder>): RepairOrder {
  return {
    id: "OS-1",
    customerName: "Cliente",
    customerPhone: "",
    customerEmail: "",
    customerCpf: "",
    deviceType: "phone",
    brand: "",
    model: "",
    serialImei: "",
    devicePassword: "",
    deviceColor: "",
    accessories: "",
    conditionNotes: "",
    checklist: {},
    reportedProblem: "",
    technicianDiagnosis: "",
    repairActions: "",
    serviceCost: 0,
    partsCost: 0,
    discount: 0,
    paymentMethod: "pix",
    paymentStatus: "pendente",
    paymentDate: "",
    usedParts: [],
    cost: "",
    partsUsed: "",
    estimatedDelivery: "",
    technician: "",
    status: "received",
    date: "01/03/2026",
    completedDate: "",
    warrantyDays: 0,
    termAccepted: false,
    entryPhotos: [],
    exitPhotos: [],
    ...overrides,
  };
}

function makeCashEntry(overrides: Partial<CashEntry>): CashEntry {
  return {
    id: "cash-1",
    date: "01/03/2026",
    type: "entrada",
    description: "",
    amount: 0,
    status: "ativa",
    source: "manual",
    ...overrides,
  };
}

function makeExpense(overrides: Partial<OperationalExpense>): OperationalExpense {
  return {
    id: "exp-1",
    date: "01/03/2026",
    amount: 0,
    category: "Geral",
    ...overrides,
  };
}

describe("financial selectors", () => {
  const range = {
    start: new Date(2026, 2, 1),
    end: new Date(2026, 2, 7, 23, 59, 59, 999),
  };

  it("parses pt-BR dates and checks ranges", () => {
    expect(parseBrDate("05/03/2026")?.getDate()).toBe(5);
    expect(inDateRange("05/03/2026", range)).toBe(true);
    expect(inDateRange("20/02/2026", range)).toBe(false);
  });

  it("computes financial snapshot totals", () => {
    const orders = [
      makeOrder({
        id: "OS-100",
        paymentStatus: "pago",
        paymentDate: "03/03/2026",
        serviceCost: 20000,
        discount: 2000,
        usedParts: [{ inventoryId: "p1", name: "Tela", qty: 1, unitCost: 5000 }],
      }),
      makeOrder({
        id: "OS-101",
        paymentStatus: "pendente",
        date: "04/03/2026",
        serviceCost: 15000,
      }),
    ];
    const cashEntries = [
      makeCashEntry({
        id: "sale-1",
        date: "04/03/2026",
        amount: 8000,
        type: "entrada",
        source: "venda_peca",
        saleQty: 1,
        saleUnitCost: 3000,
        paymentMethod: "dinheiro",
      }),
      makeCashEntry({
        id: "out-1",
        date: "05/03/2026",
        type: "saida",
        source: "despesa",
        amount: 2000,
      }),
    ];
    const expenses = [makeExpense({ amount: 5000, date: "06/03/2026", category: "Aluguel" })];

    const snapshot = calculateFinancialSnapshot({ orders, cashEntries, expenses, range });

    expect(snapshot.grossRevenue).toBe(26000); // 18000 OS + 8000 venda
    expect(snapshot.partsCost).toBe(8000); // 5000 OS + 3000 venda
    expect(snapshot.operationalExpense).toBe(7000); // 5000 expense + 2000 cash out
    expect(snapshot.netProfit).toBe(11000);
    expect(snapshot.pendingValue).toBe(15000);
    expect(snapshot.byMethod.dinheiro).toBe(8000);
  });

  it("builds chart, pending trend and combined cash entries", () => {
    const orders = [
      makeOrder({
        id: "OS-200",
        paymentStatus: "pago",
        paymentDate: "02/03/2026",
        date: "01/03/2026",
        serviceCost: 10000,
        usedParts: [{ inventoryId: "p1", name: "Bateria", qty: 1, unitCost: 2500 }],
        paymentMethod: "pix",
      }),
      makeOrder({
        id: "OS-201",
        paymentStatus: "pendente",
        date: "03/03/2026",
        serviceCost: 5000,
      }),
    ];
    const cashEntries = [makeCashEntry({ id: "manual-1", date: "04/03/2026", amount: 2000, paymentMethod: "pix" })];
    const expenses = [makeExpense({ date: "02/03/2026", amount: 1000 })];
    const current = calculateFinancialSnapshot({ orders, cashEntries, expenses, range });

    const chart = buildFinancialChartSeries(range, current);
    const dayTwo = chart.find((row) => row.date === "02/03/2026");
    expect(dayTwo?.receita).toBe(100);
    expect(dayTwo?.custo).toBe(25);
    expect(dayTwo?.despesa).toBe(-10);
    expect(dayTwo?.lucro).toBe(65);

    const pending = buildPendingTrend(chart, current.pendingOrders);
    const dayThree = pending.find((row) => row.label === "03/03/2026");
    expect(dayThree?.value).toBe(50);

    const combined = buildCombinedCashEntries(current.paidOrders, cashEntries, range);
    expect(combined[0].id).toBe("manual-1");
    expect(combined.some((row) => row.id === "os-OS-200")).toBe(true);
  });

  it("computes deltas with zero baseline", () => {
    const deltas = calculateFinancialDeltas(
      {
        paidOrders: [],
        pendingOrders: [],
        salesEntries: [],
        manualIn: [],
        operationalCashOut: [],
        expenseRows: [],
        expenseDetailRows: [],
        grossRevenue: 1000,
        osRevenue: 0,
        salesRevenue: 0,
        partsCost: 0,
        operationalExpense: 0,
        totalCostsAndExpenses: 0,
        netProfit: 1000,
        cashPeriod: 0,
        pendingValue: 0,
        byMethod: {},
      },
      {
        paidOrders: [],
        pendingOrders: [],
        salesEntries: [],
        manualIn: [],
        operationalCashOut: [],
        expenseRows: [],
        expenseDetailRows: [],
        grossRevenue: 0,
        osRevenue: 0,
        salesRevenue: 0,
        partsCost: 0,
        operationalExpense: 0,
        totalCostsAndExpenses: 0,
        netProfit: 0,
        cashPeriod: 0,
        pendingValue: 0,
        byMethod: {},
      }
    );
    expect(deltas.grossRevenue).toBeNull();
    expect(deltas.partsCost).toBe(0);
  });
});
