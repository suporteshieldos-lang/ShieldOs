import { cn } from "@/lib/utils";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { TooltipProps } from "recharts";

type UnifiedTooltipKind = "currency" | "number";

type UnifiedChartTooltipProps = TooltipProps<ValueType, NameType> & {
  kind?: UnifiedTooltipKind;
  unit?: string;
};

type UnifiedLegendItem = {
  label: string;
  color: string;
};

export function UnifiedLegend({ items, className }: { items: UnifiedLegendItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <div className={cn("mt-3 flex flex-wrap gap-x-4 gap-y-2", className)}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2 text-xs font-medium text-[#5B6B7F]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function formatValue(value: ValueType, kind: UnifiedTooltipKind, unit?: string) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? "-");
  if (kind === "currency") {
    return `R$ ${numeric.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${numeric.toLocaleString("pt-BR")}${unit ? ` ${unit}` : ""}`;
}

export function UnifiedChartTooltip({
  active,
  payload,
  label,
  kind = "number",
  unit,
}: UnifiedChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#DCE5EF] bg-white/95 px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm">
      {label ? <p className="mb-1 text-xs font-semibold text-[#334155]">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={`${entry.name}-${entry.dataKey}`} className="flex items-center justify-between gap-4 text-xs">
            <span className="inline-flex items-center gap-2 text-[#64748B]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color || "#94A3B8" }} aria-hidden="true" />
              {entry.name}
            </span>
            <span className="font-semibold text-[#0F172A]">{formatValue(entry.value, kind, unit)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
