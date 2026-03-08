import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFinancialFilters } from "./useFinancialFilters";

describe("useFinancialFilters", () => {
  it("initializes with sane defaults", () => {
    const { result } = renderHook(() => useFinancialFilters());
    expect(result.current.preset).toBe("today");
    expect(result.current.tab).toBe("resumo");
    expect(result.current.originFilter).toBe("todos");
    expect(result.current.methodFilter).toBe("todos");
  });

  it("normalizes custom range when start is after end", () => {
    const { result } = renderHook(() => useFinancialFilters());

    act(() => {
      result.current.setPreset("custom");
      result.current.setCustomStart("2026-03-20");
      result.current.setCustomEnd("2026-03-10");
    });

    const { periodRange } = result.current;
    expect(periodRange.start.getTime()).toBeLessThanOrEqual(periodRange.end.getTime());
  });
});
