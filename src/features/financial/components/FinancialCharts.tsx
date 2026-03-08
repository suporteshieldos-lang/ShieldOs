import { DollarSign, LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { paymentPalette } from "@/features/financial/constants";
import { FinancialChartRow } from "@/features/financial/selectors";

export function FinancialCharts({
  chartSeries,
  hasAnySeriesData,
  osProfitBars,
  osProfitBarsSafe,
  paymentPieDataSafe,
  hasPaymentData,
}: {
  chartSeries: FinancialChartRow[];
  hasAnySeriesData: boolean;
  osProfitBars: Array<{ os: string; lucro: number }>;
  osProfitBarsSafe: Array<{ os: string; lucro: number }>;
  paymentPieDataSafe: Array<{ name: string; value: number }>;
  hasPaymentData: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="premium-block p-4">
        <div className="mb-3 flex items-center gap-2">
          <LineChartIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Evolução: receita, custos e lucro</h3>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              <Legend />
              <Line dataKey="receita" stroke="hsl(var(--chart-3))" dot={false} strokeWidth={2.2} />
              <Line dataKey="custo" stroke="hsl(var(--chart-5))" dot={false} strokeWidth={2.2} />
              <Line dataKey="despesa" stroke="hsl(var(--warning))" dot={false} strokeWidth={2.2} />
              <Line dataKey="lucro" stroke="hsl(var(--chart-1))" dot={false} strokeWidth={2.2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {!hasAnySeriesData ? (
          <p className="mt-2 text-xs text-muted-foreground">Sem lançamentos no período. O gráfico permanece visível para referência.</p>
        ) : null}
      </div>

      <div className="premium-block p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Lucro por OS paga</h3>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={osProfitBarsSafe}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="os" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              <Bar dataKey="lucro" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {osProfitBars.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">Sem OS pagas no período. Gráfico mantido para comparação.</p> : null}
      </div>

      <div className="premium-block p-4">
        <div className="mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Composição por pagamento</h3>
        </div>
        <div className="relative h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={paymentPieDataSafe} dataKey="value" nameKey="name" innerRadius={60} outerRadius={92} paddingAngle={2}>
                {paymentPieDataSafe.map((d, i) => (
                  <Cell key={d.name} fill={hasPaymentData ? paymentPalette[i % paymentPalette.length] : "#cbd5e1"} />
                ))}
              </Pie>
              {hasPaymentData ? (
                <>
                  <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                  <Legend />
                </>
              ) : null}
            </PieChart>
          </ResponsiveContainer>
          {!hasPaymentData ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="rounded-full bg-muted/80 px-3 py-1 text-sm font-medium text-muted-foreground">Sem dados</span>
            </div>
          ) : null}
        </div>
        {!hasPaymentData ? <p className="mt-2 text-xs text-muted-foreground">Sem pagamentos no período. Gráfico mantido para referência visual.</p> : null}
      </div>
    </div>
  );
}
