import { CalendarDays, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodPreset } from "@/features/financial/types";

export function FinancialHeader({
  preset,
  setPreset,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  periodLabel,
  onExportPdf,
  onExportExcel,
}: {
  preset: PeriodPreset;
  setPreset: (preset: PeriodPreset) => void;
  customStart: string;
  setCustomStart: (value: string) => void;
  customEnd: string;
  setCustomEnd: (value: string) => void;
  periodLabel: string;
  onExportPdf: () => void;
  onExportExcel: () => void;
}) {
  const filterClass = (key: PeriodPreset) =>
    `rounded-full px-4 py-2 text-xs font-medium transition ${preset === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`;

  return (
    <div className="glass-card rounded-xl border border-border/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className={filterClass("today")} onClick={() => setPreset("today")}>Hoje</button>
        <button className={filterClass("last7")} onClick={() => setPreset("last7")}>Últimos 7 dias</button>
        <button className={filterClass("month")} onClick={() => setPreset("month")}>Este mês</button>
        <button className={filterClass("custom")} onClick={() => setPreset("custom")}>Personalizado</button>
        {preset === "custom" && (
          <div className="ml-0 flex flex-wrap items-center gap-2 md:ml-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input className="h-9 rounded-lg border border-input bg-card px-3 text-sm" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            <span className="text-muted-foreground">até</span>
            <input className="h-9 rounded-lg border border-input bg-card px-3 text-sm" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Período: {periodLabel}</span>
          <Button variant="outline" className="gap-2" onClick={onExportPdf}><FileText className="h-4 w-4" />PDF</Button>
          <Button variant="outline" className="gap-2" onClick={onExportExcel}><FileSpreadsheet className="h-4 w-4" />Excel</Button>
        </div>
      </div>
    </div>
  );
}
