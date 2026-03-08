import { describe, expect, it } from "vitest";
import {
  DAY_MS,
  daysLateFromDueDate,
  getAgingBadgeClass,
  parseAmountInputToCents,
} from "./useReceivablesActions";

describe("useReceivablesActions helpers", () => {
  it("parses currency inputs to cents", () => {
    expect(parseAmountInputToCents("10,50")).toEqual({ ok: true, cents: 1050, raw: 10.5 });
    expect(parseAmountInputToCents("0")).toEqual({ ok: false, cents: 0, raw: 0 });
    expect(parseAmountInputToCents("abc").ok).toBe(false);
  });

  it("calculates non-negative days late", () => {
    const today = new Date(2026, 2, 10);
    const dueYesterday = new Date(today.getTime() - DAY_MS);
    const dueTomorrow = new Date(today.getTime() + DAY_MS);
    expect(daysLateFromDueDate(dueYesterday, today)).toBe(1);
    expect(daysLateFromDueDate(dueTomorrow, today)).toBe(0);
  });

  it("returns expected badge classes", () => {
    expect(getAgingBadgeClass(0)).toContain("slate");
    expect(getAgingBadgeClass(2)).toContain("yellow");
    expect(getAgingBadgeClass(6)).toContain("orange");
    expect(getAgingBadgeClass(12)).toContain("red");
  });
});
