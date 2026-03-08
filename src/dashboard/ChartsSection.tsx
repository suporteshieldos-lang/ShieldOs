import { BarChart3, Briefcase } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { UnifiedChartTooltip, UnifiedLegend } from "@/components/charts/UnifiedChart";

type RevenuePoint = { label: string; receita: number };
type StatusPoint = { label: string; value: number };

type ChartsSectionProps = {
  revenueData: RevenuePoint[];
  statusData: StatusPoint[];
};

const statusColors = ["#4f87ff", "#8b5cf6", "#f97316", "#f59e0b", "#14b8a6"];

export function ChartsSection({ revenueData, statusData }: ChartsSectionProps) {
  const hasRevenueData = revenueData.some((item) => item.receita > 0);
  const hasStatusData = statusData.some((item) => item.value > 0);

  return (
    <section className="grid grid-cols-1 gap-4 2xl:grid-cols-2" aria-label="Gráficos do dashboard">
      <article className="premium-card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 id="chart-revenue-title" className="text-lg font-semibold text-slate-900">
              Receita últimos 7 dias
            </h3>
            <p className="text-xs text-slate-500">Evolução diária de entradas.</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#0F2A44]">
            <BarChart3 className="h-5 w-5" />
          </span>
        </div>
        {hasRevenueData ? (
          <div className="h-72" role="img" aria-labelledby="chart-revenue-title">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f87ff" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#4f87ff" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} width={30} />
                <Tooltip content={<UnifiedChartTooltip kind="currency" />} />
                <Area type="monotone" dataKey="receita" stroke="#4f87ff" fill="url(#revenueFill)" strokeWidth={2.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            Sem dados de receita no período.
          </div>
        )}
        <UnifiedLegend items={[{ label: "Receita", color: "#4f87ff" }]} />
      </article>

      <article className="premium-card p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 id="chart-status-title" className="text-lg font-semibold text-slate-900">
              OS por status
            </h3>
            <p className="text-xs text-slate-500">Distribuição atual da fila operacional.</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-[#0F2A44]">
            <Briefcase className="h-5 w-5" />
          </span>
        </div>
        {hasStatusData ? (
          <div className="h-72" role="img" aria-labelledby="chart-status-title">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                <Tooltip content={<UnifiedChartTooltip kind="number" unit="OS" />} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                  {statusData.map((entry, index) => (
                    <Cell key={entry.label} fill={statusColors[index % statusColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
            Sem OS no período selecionado.
          </div>
        )}
        <UnifiedLegend items={statusData.map((entry, index) => ({ label: entry.label, color: statusColors[index % statusColors.length] }))} />
      </article>
    </section>
  );
}
