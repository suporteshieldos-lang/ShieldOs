import { Badge } from "@/components/ui/badge";
import { CombinedCashEntry, FinancialSnapshot } from "@/features/financial/selectors";
import { paymentMethodLabels } from "@/features/financial/constants";
import { FinancialTab, MethodFilter, OriginFilter } from "@/features/financial/types";
import { PaymentMethod, RepairOrder, formatCurrency, getOrderTotal } from "@/store/appStore";

export function FinancialTabs({
  tab,
  setTab,
  current,
  orders,
  inRange,
  filteredFinancialEntries,
  originFilter,
  setOriginFilter,
  methodFilter,
  setMethodFilter,
}: {
  tab: FinancialTab;
  setTab: (tab: FinancialTab) => void;
  current: FinancialSnapshot;
  orders: RepairOrder[];
  inRange: (brDate?: string) => boolean;
  filteredFinancialEntries: CombinedCashEntry[];
  originFilter: OriginFilter;
  setOriginFilter: (value: OriginFilter) => void;
  methodFilter: MethodFilter;
  setMethodFilter: (value: MethodFilter) => void;
}) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {(["resumo", "movimentacoes", "os"] as const).map((item) => (
          <button
            key={item}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${tab === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            onClick={() => setTab(item)}
          >
            {item === "resumo" ? "Resumo" : item === "movimentacoes" ? "Movimentações" : "OS"}
          </button>
        ))}
      </div>

      {tab === "resumo" && <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><div className="rounded-xl border border-border p-4"><h3 className="font-semibold text-foreground">Totais por forma de pagamento</h3><p className="mt-1 text-xs text-muted-foreground">Mostra de forma simples como o cliente está pagando.</p>{Object.keys(current.byMethod).length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Não houve movimentações financeiras neste período. Vendas de produtos e OS pagas aparecerão aqui automaticamente.</p> : <div className="mt-3 space-y-2">{Object.entries(current.byMethod).map(([m, a]) => <div key={m} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{paymentMethodLabels[m] || m}</span><span className="font-semibold text-foreground">{formatCurrency(a)}</span></div>)}</div>}</div><div className="rounded-xl border border-border p-4"><h3 className="font-semibold text-foreground">Leitura rápida para decisão</h3><div className="mt-3 space-y-2 text-sm"><p className="flex justify-between"><span className="text-muted-foreground">Receita por Serviço (OS)</span><span className="font-semibold">{formatCurrency(current.osRevenue)}</span></p><p className="flex justify-between"><span className="text-muted-foreground">Receita por Produto (Venda Balcão)</span><span className="font-semibold">{formatCurrency(current.salesRevenue)}</span></p><p className="flex justify-between"><span className="text-muted-foreground">Quanto foi gasto com peças usadas em serviços e vendas</span><span className="font-semibold">{formatCurrency(current.partsCost)}</span></p><p className="flex justify-between"><span className="text-muted-foreground">Despesas para manter a operação</span><span className="font-semibold">{formatCurrency(current.operationalExpense)}</span></p><p className="flex justify-between border-t border-border pt-2"><span className="font-medium text-foreground">Receita Total consolidada</span><span className="font-semibold text-foreground">{formatCurrency(current.grossRevenue)}</span></p></div></div></div>}

      {tab === "movimentacoes" && <div className="space-y-3"><div className="grid grid-cols-1 gap-2 md:grid-cols-2"><select className="h-9 rounded-lg border border-input bg-card px-3 text-sm" value={originFilter} onChange={(e) => setOriginFilter(e.target.value as OriginFilter)}><option value="todos">Origem: todas</option><option value="os">Origem: OS</option><option value="venda_balcao">Origem: Venda Balcão</option></select><select className="h-9 rounded-lg border border-input bg-card px-3 text-sm" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value as MethodFilter)}><option value="todos">Pagamento: todos</option><option value="dinheiro">Dinheiro</option><option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="cartao">Cartão</option><option value="outro">Outros</option></select></div><div className="overflow-hidden rounded-lg border border-border/60"><table className="w-full table-fixed text-sm"><thead><tr className="border-b border-border bg-muted/30 text-left"><th className="w-[16%] px-3 py-2 font-medium text-muted-foreground">Data</th><th className="w-[14%] px-3 py-2 font-medium text-muted-foreground">Origem</th><th className="w-[12%] px-3 py-2 font-medium text-muted-foreground">Tipo</th><th className="w-[32%] px-3 py-2 font-medium text-muted-foreground">Descrição</th><th className="w-[14%] px-3 py-2 font-medium text-muted-foreground">Pagamento</th><th className="w-[12%] px-3 py-2 text-right font-medium text-muted-foreground">Valor</th></tr></thead><tbody>{filteredFinancialEntries.length === 0 ? <tr><td className="px-3 py-5 text-sm text-muted-foreground" colSpan={6}>Não houve movimentações financeiras neste período. Vendas de produtos e OS pagas aparecerão aqui automaticamente.</td></tr> : filteredFinancialEntries.map((e) => <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20"><td className="px-3 py-2 text-muted-foreground">{e.date}</td><td className="px-3 py-2 text-muted-foreground break-words">{e.source === "os" ? "OS" : e.source === "venda_peca" || (e.source as string) === "venda_Peça" ? "Venda Balcão" : "Operacional"}</td><td className="px-3 py-2">{e.type === "entrada" ? <span className="text-xs font-medium text-success">Entrada</span> : <span className="text-xs font-medium text-destructive">Saída</span>}</td><td className="px-3 py-2 text-foreground break-words">{e.description}</td><td className="px-3 py-2 text-muted-foreground break-words">{e.paymentMethod ? paymentMethodLabels[e.paymentMethod] : "-"}</td><td className={`px-3 py-2 text-right font-semibold ${e.type === "entrada" ? "text-success" : "text-destructive"}`}>{e.type === "entrada" ? "+" : "-"}{formatCurrency(e.amount)}</td></tr>)}</tbody></table></div></div>}

      {tab === "os" && <div className="overflow-hidden rounded-lg border border-border/60"><table className="w-full table-fixed text-sm"><thead><tr className="border-b border-border bg-muted/30 text-left"><th className="w-[12%] px-3 py-2 font-medium text-muted-foreground">OS</th><th className="w-[26%] px-3 py-2 font-medium text-muted-foreground">Cliente</th><th className="w-[14%] px-3 py-2 font-medium text-muted-foreground">Valor</th><th className="w-[18%] px-3 py-2 font-medium text-muted-foreground">Forma de pagamento</th><th className="w-[16%] px-3 py-2 font-medium text-muted-foreground">Status financeiro</th><th className="w-[14%] px-3 py-2 text-right font-medium text-muted-foreground">Impacto no lucro</th></tr></thead><tbody>{orders.filter((o) => inRange(o.date)).length === 0 ? <tr><td className="px-3 py-5 text-sm text-muted-foreground" colSpan={6}>Nenhuma OS no período selecionado. As ordens aparecerão aqui com impacto no lucro assim que forem registradas.</td></tr> : orders.filter((o) => inRange(o.date)).map((o) => { const parts = o.usedParts.reduce((s, p) => s + p.unitCost * p.qty, 0); const impact = getOrderTotal(o) - parts; return <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20"><td className="px-3 py-2 font-medium text-foreground break-words">{o.id}</td><td className="px-3 py-2 text-foreground break-words">{o.customerName}</td><td className="px-3 py-2 font-semibold text-foreground">{formatCurrency(getOrderTotal(o))}</td><td className="px-3 py-2 text-muted-foreground break-words">{paymentMethodLabels[o.paymentMethod] || "-"}</td><td className="px-3 py-2"><Badge variant={o.paymentStatus === "pago" ? "secondary" : o.paymentStatus === "parcial" ? "outline" : "destructive"}>{o.paymentStatus === "pago" ? "Pago" : o.paymentStatus === "parcial" ? "Parcial" : "Pendente"}</Badge></td><td className={`px-3 py-2 text-right font-semibold ${impact >= 0 ? "text-success" : "text-destructive"}`}>{impact >= 0 ? "+" : "-"}{formatCurrency(Math.abs(impact))}</td></tr>; })}</tbody></table></div>}
    </div>
  );
}
