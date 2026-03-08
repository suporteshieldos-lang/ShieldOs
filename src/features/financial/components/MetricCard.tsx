import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

export function MetricCard({
  title,
  value,
  delta,
  icon: Icon,
  onClick,
  changeTone = "neutral",
  helperText,
  trendData,
  trendColor = "hsl(var(--chart-1))",
}: {
  title: string;
  value: string;
  delta: number | null;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  changeTone?: "neutral" | "goodWhenUp" | "badWhenUp";
  helperText?: string;
  trendData?: Array<{ label: string; value: number }>;
  trendColor?: string;
}) {
  const hasDelta = delta !== null;
  const isUp = hasDelta ? delta >= 0 : false;
  const colorClass =
    !hasDelta || delta === 0
      ? "text-muted-foreground"
      : changeTone === "goodWhenUp"
        ? isUp
          ? "text-success"
          : "text-destructive"
        : changeTone === "badWhenUp"
          ? isUp
            ? "text-destructive"
            : "text-success"
          : "text-muted-foreground";

  return (
    <button onClick={onClick} className="glass-card h-full rounded-xl p-5 text-left transition hover:bg-muted/15">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {helperText ? <p className="mt-1 text-xs text-muted-foreground">{helperText}</p> : null}
          <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${colorClass}`}>
            {hasDelta ? (
              <>
                {delta === 0 ? null : isUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {delta === 0 ? "0,0% vs período anterior" : `${Math.abs(delta).toFixed(1)}% vs período anterior`}
              </>
            ) : (
              "Sem base comparativa"
            )}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></div>
      </div>
      {trendData && trendData.length > 0 ? (
        <div className="mt-3 h-14 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <Line type="monotone" dataKey="value" stroke={trendColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </button>
  );
}
