import { describe, expect, it } from "vitest";
import { createId } from "@/lib/id";
import { formatCurrency, getOrderTotal, parseCurrency, RepairOrder } from "@/store/appStore";

function makeOrder(overrides: Partial<RepairOrder> = {}): RepairOrder {
  return {
    id: "OS-1",
    customerName: "Cliente",
    customerPhone: "11999999999",
    customerEmail: "",
    customerCpf: "",
    deviceType: "phone",
    brand: "Marca",
    model: "Modelo",
    serialImei: "",
    devicePassword: "",
    deviceColor: "",
    accessories: "",
    conditionNotes: "",
    checklist: {},
    reportedProblem: "",
    technicianDiagnosis: "",
    repairActions: "",
    serviceCost: 10000,
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
    date: "01/01/2026",
    completedDate: "",
    warrantyDays: 90,
    termAccepted: true,
    entryPhotos: [],
    exitPhotos: [],
    ...overrides,
  };
}

describe("core utils", () => {
  it("parseCurrency handles BRL and plain numbers", () => {
    expect(parseCurrency("R$ 1.234,56")).toBe(123456);
    expect(parseCurrency("1234,56")).toBe(123456);
    expect(parseCurrency("1234.56")).toBe(123456);
    expect(parseCurrency("")).toBe(0);
  });

  it("formatCurrency renders BRL", () => {
    expect(formatCurrency(123456)).toContain("1.234,56");
  });

  it("getOrderTotal never returns negative", () => {
    expect(getOrderTotal(makeOrder({ serviceCost: 10000, discount: 2000 }))).toBe(8000);
    expect(getOrderTotal(makeOrder({ serviceCost: 1000, discount: 2000 }))).toBe(0);
  });

  it("createId returns uuid-like values", () => {
    const id = createId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  });
});

