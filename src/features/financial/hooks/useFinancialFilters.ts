import { useMemo, useState } from "react";
import { DateRange } from "@/features/financial/selectors";
import { FinancialTab, MethodFilter, OriginFilter, PeriodPreset } from "@/features/financial/types";

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

export function useFinancialFilters() {
  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [customStart, setCustomStart] = useState(() => toInputDate(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toInputDate(new Date()));
  const [tab, setTab] = useState<FinancialTab>("resumo");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("todos");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("todos");

  const periodRange: DateRange = useMemo(() => {
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
      if (s && e && s.getTime() > e.getTime()) {
        start.setTime(e.getTime());
        end.setTime(s.getTime());
      } else {
        if (s) start.setTime(s.getTime());
        if (e) end.setTime(e.getTime());
      }
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  }, [preset, customStart, customEnd]);

  const previousRange: DateRange = useMemo(() => {
    const days = daysBetweenInclusive(periodRange.start, periodRange.end);
    const end = new Date(periodRange.start);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }, [periodRange]);

  return {
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
  };
}
