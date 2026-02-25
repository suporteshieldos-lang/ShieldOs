import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconBg?: string;
  highlight?: boolean;
  highlightLabel?: string;
  metricPill?: string;
  metricTone?: "positive" | "negative" | "neutral";
}

export default function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconBg = "bg-primary/10 text-primary",
  highlight = false,
  highlightLabel,
  metricPill,
  metricTone = "neutral",
}: StatCardProps) {
  const metricToneClass =
    metricTone === "positive"
      ? "bg-emerald-100 text-emerald-700"
      : metricTone === "negative"
        ? "bg-rose-100 text-rose-700"
        : "bg-slate-100 text-slate-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex h-full min-h-[172px] flex-col overflow-hidden rounded-2xl border p-5 shadow-sm transition ${
        highlight ? "border-primary/35 bg-white" : "border-border/70 bg-white"
      }`}
    >
      <div className="pointer-events-none absolute -bottom-9 -right-9 h-20 w-20 rounded-full bg-slate-100/80" />
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <p className="min-h-[20px] text-sm font-medium text-muted-foreground">{title}</p>
          <div className={`rounded-full p-2 ${iconBg}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="min-h-[58px]">
          <p className="truncate text-[48px] font-bold leading-none text-foreground">{value}</p>
        </div>

        <div className="min-h-[44px]">
          {change ? (
            <p
              className={`min-h-[1rem] truncate text-xs font-medium ${
                changeType === "positive"
                  ? "text-success"
                  : changeType === "negative"
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {change}
            </p>
          ) : (
            <div className="min-h-[1rem]" />
          )}
          {highlight && highlightLabel ? (
            <p className="mt-2 inline-flex h-[22px] items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {highlightLabel}
            </p>
          ) : (
            <div className="mt-2 h-[22px]" />
          )}
        </div>
      </div>

      {metricPill ? (
        <div
          className={`absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-[10px] font-semibold ${metricToneClass}`}
        >
          {metricPill}
        </div>
      ) : null}
    </motion.div>
  );
}
