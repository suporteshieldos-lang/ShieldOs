import { CreditCard, DollarSign, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";
import { FinancialDeltaSet, FinancialSnapshot } from "@/features/financial/selectors";
import { MetricCard } from "@/features/financial/components/MetricCard";
import { formatCurrency } from "@/store/appStore";

export function FinancialKpis({
  current,
  deltas,
  revenueTrend,
  costExpenseTrend,
  profitTrend,
  pendingTrend,
  onOpenDetail,
  onSetTab,
}: {
  current: FinancialSnapshot;
  deltas: FinancialDeltaSet;
  revenueTrend: Array<{ label: string; value: number }>;
  costExpenseTrend: Array<{ label: string; value: number }>;
  profitTrend: Array<{ label: string; value: number }>;
  pendingTrend: Array<{ label: string; value: number }>;
  onOpenDetail: (detail: "revenue" | "partsCost" | "expense" | "profit" | "cash" | "pending") => void;
  onSetTab: (tab: "resumo" | "movimentacoes" | "os") => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <section className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Resultado do período</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MetricCard title="Receita Total" value={formatCurrency(current.grossRevenue)} delta={deltas.grossRevenue} icon={DollarSign} onClick={() => onOpenDetail("revenue")} changeTone="goodWhenUp" helperText="Tudo o que entrou no período." trendData={revenueTrend} trendColor="hsl(var(--chart-3))" />
          <MetricCard title="Custos + Despesas" value={formatCurrency(current.totalCostsAndExpenses)} delta={deltas.totalCostsAndExpenses} icon={TrendingDown} onClick={() => onOpenDetail("expense")} changeTone="badWhenUp" helperText="Quanto custou para operar." trendData={costExpenseTrend} trendColor="hsl(var(--chart-5))" />
          <MetricCard title="Lucro Líquido" value={formatCurrency(current.netProfit)} delta={deltas.netProfit} icon={TrendingUp} onClick={() => onOpenDetail("profit")} changeTone="goodWhenUp" helperText="O que sobrou após custos e despesas." trendData={profitTrend} trendColor="hsl(var(--chart-1))" />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Composição da receita</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <MetricCard title="Receita por Serviço (OS)" value={formatCurrency(current.osRevenue)} delta={deltas.osRevenue} icon={ReceiptText} onClick={() => onSetTab("os")} changeTone="goodWhenUp" helperText={current.grossRevenue > 0 ? `${((current.osRevenue / current.grossRevenue) * 100).toFixed(1)}% da receita total` : "Sem receita no período"} />
          <MetricCard title="Receita por Produto (Venda Balcão)" value={formatCurrency(current.salesRevenue)} delta={deltas.salesRevenue} icon={CreditCard} onClick={() => onSetTab("movimentacoes")} changeTone="goodWhenUp" helperText={current.grossRevenue > 0 ? `${((current.salesRevenue / current.grossRevenue) * 100).toFixed(1)}% da receita total` : "Sem receita no período"} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Onde o dinheiro é consumido</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <MetricCard title="Custo de Peças" value={formatCurrency(current.partsCost)} delta={deltas.partsCost} icon={TrendingDown} onClick={() => onOpenDetail("partsCost")} changeTone="badWhenUp" helperText={current.grossRevenue > 0 ? `${((current.partsCost / current.grossRevenue) * 100).toFixed(1)}% da receita` : "Sem base de receita no período"} />
          <MetricCard title="Despesas Operacionais" value={formatCurrency(current.operationalExpense)} delta={deltas.operationalExpense} icon={ReceiptText} onClick={() => onOpenDetail("expense")} changeTone="badWhenUp" helperText={current.grossRevenue > 0 ? `${((current.operationalExpense / current.grossRevenue) * 100).toFixed(1)}% da receita` : "Sem base de receita no período"} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card/60 p-4">
        <div className="mb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recebíveis</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <MetricCard title="OS Pendentes (a receber)" value={formatCurrency(current.pendingValue)} delta={deltas.pendingValue} icon={CreditCard} onClick={() => onOpenDetail("pending")} changeTone="badWhenUp" helperText="Valor que ainda pode entrar no caixa da empresa após cobrança." trendData={pendingTrend} trendColor="hsl(var(--chart-4))" />
          <div className="glass-card flex h-full flex-col justify-center rounded-xl p-5 text-left">
            <p className="text-sm font-medium text-muted-foreground">Próxima ação recomendada</p>
            <p className="mt-1 text-base font-semibold text-foreground">Priorize a cobrança das OS pendentes para proteger o fluxo de caixa.</p>
            <p className="mt-2 text-xs text-muted-foreground">Use a aba de OS para identificar os clientes com maior valor em aberto.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
