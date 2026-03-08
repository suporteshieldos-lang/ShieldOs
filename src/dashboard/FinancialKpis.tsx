import { DollarSign, Layers, Receipt, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { formatCurrency } from "@/store/appStore";

type FinancialKpisProps = {
  faturamentoMes: number;
  lucroLiquido: number;
  custosDespesas: number;
  backlogFinanceiro: number;
};

type CardProps = {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
};

function KpiCard({ title, value, description, icon }: CardProps) {
  return (
    <article className="premium-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-[#0F2A44]">{icon}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(value)}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </article>
  );
}

export function FinancialKpis({ faturamentoMes, lucroLiquido, custosDespesas, backlogFinanceiro }: FinancialKpisProps) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores financeiros">
      <KpiCard title="Faturamento do mês" value={faturamentoMes} description="Entradas de OS e balcão no mês atual." icon={<DollarSign className="h-5 w-5" />} />
      <KpiCard title="Lucro líquido" value={lucroLiquido} description="Resultado após custos e despesas." icon={<Wallet className="h-5 w-5" />} />
      <KpiCard title="Custos + despesas" value={custosDespesas} description="Peças, despesas fixas e variáveis." icon={<Receipt className="h-5 w-5" />} />
      <KpiCard title="Backlog financeiro" value={backlogFinanceiro} description="OS abertas/em andamento sem pagamento." icon={<Layers className="h-5 w-5" />} />
    </section>
  );
}
