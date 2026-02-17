import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Banknote, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAppStore, formatCurrency, getOrderTotal, getOrderProfit } from "@/store/appStore";
import StatCard from "@/components/dashboard/StatCard";

const paymentMethodLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartão",
  outro: "Outro",
};

export default function Financial() {
  const { orders, cashEntries } = useAppStore();
  const [tab, setTab] = useState<"resumo" | "caixa" | "os">("resumo");

  const paidOrders = orders.filter((o) => o.paymentStatus === "pago");
  const unpaidOrders = orders.filter((o) => o.paymentStatus === "pendente");
  const partialOrders = orders.filter((o) => o.paymentStatus === "parcial");

  const totalRevenue = paidOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const totalPartsCost = paidOrders.reduce((sum, o) => sum + o.usedParts.reduce((s, p) => s + p.unitCost * p.qty, 0), 0);
  const totalProfit = paidOrders.reduce((sum, o) => sum + getOrderProfit(o), 0);

  const today = new Date().toLocaleDateString("pt-BR");
  const todayEntries = cashEntries.filter((e) => e.date === today);
  const todayIn = todayEntries.filter((e) => e.type === "entrada").reduce((s, e) => s + e.amount, 0);
  const todayOut = todayEntries.filter((e) => e.type === "saida").reduce((s, e) => s + e.amount, 0);

  // Payment method breakdown
  const byMethod: Record<string, number> = {};
  paidOrders.forEach((o) => {
    byMethod[o.paymentMethod] = (byMethod[o.paymentMethod] || 0) + getOrderTotal(o);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Financeiro</h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Receita Bruta" value={formatCurrency(totalRevenue)} icon={DollarSign} iconBg="bg-primary/10 text-primary" />
        <StatCard title="Custo Peças" value={formatCurrency(totalPartsCost)} icon={TrendingDown} iconBg="bg-destructive/10 text-destructive" />
        <StatCard title="Lucro Líquido" value={formatCurrency(totalProfit)} icon={TrendingUp} iconBg="bg-success/10 text-success" />
        <StatCard title="Caixa Hoje" value={formatCurrency(todayIn - todayOut)} change={`+${formatCurrency(todayIn)} / -${formatCurrency(todayOut)}`} icon={Banknote} iconBg="bg-accent/10 text-accent" />
        <StatCard title="OS Pendentes" value={String(unpaidOrders.length + partialOrders.length)} change={formatCurrency(unpaidOrders.reduce((s, o) => s + getOrderTotal(o), 0)) + " a receber"} changeType="negative" icon={CreditCard} iconBg="bg-warning/10 text-warning" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["resumo", "caixa", "os"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {t === "resumo" ? "Resumo" : t === "caixa" ? "Caixa" : "OS"}
          </button>
        ))}
      </div>

      {/* Resumo */}
      {tab === "resumo" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Formas de Pagamento</h3>
            {Object.entries(byMethod).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{paymentMethodLabels[method] || method}</span>
                <span className="text-sm font-semibold text-foreground">{formatCurrency(amount)}</span>
              </div>
            ))}
            {Object.keys(byMethod).length === 0 && <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="font-semibold text-foreground">Lucro por OS (Pagas)</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {paidOrders.map((o) => {
                const profit = getOrderProfit(o);
                return (
                  <div key={o.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-foreground">{o.id}</span>
                      <span className="ml-2 text-muted-foreground">{o.customerName}</span>
                    </div>
                    <span className={`font-semibold ${profit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(profit)}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {/* Caixa */}
      {tab === "caixa" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-5 py-3 font-medium text-muted-foreground">Data</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Tipo</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Descrição</th>
                <th className="px-5 py-3 font-medium text-muted-foreground text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {cashEntries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 text-muted-foreground">{entry.date}</td>
                  <td className="px-5 py-3.5">
                    {entry.type === "entrada" ? (
                      <span className="flex items-center gap-1 text-success text-xs font-medium"><ArrowUpRight className="h-3.5 w-3.5" />Entrada</span>
                    ) : (
                      <span className="flex items-center gap-1 text-destructive text-xs font-medium"><ArrowDownRight className="h-3.5 w-3.5" />Saída</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-foreground">{entry.description}</td>
                  <td className={`px-5 py-3.5 text-right font-semibold ${entry.type === "entrada" ? "text-success" : "text-destructive"}`}>
                    {entry.type === "entrada" ? "+" : "-"}{formatCurrency(entry.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* OS Payment Status */}
      {tab === "os" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-5 py-3 font-medium text-muted-foreground">OS</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Cliente</th>
                <th className="px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Serviço</th>
                <th className="px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Peças</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Total</th>
                <th className="px-5 py-3 font-medium text-muted-foreground">Pagamento</th>
                <th className="px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Método</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const total = getOrderTotal(o);
                return (
                  <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground">{o.id}</td>
                    <td className="px-5 py-3.5 text-foreground">{o.customerName}</td>
                    <td className="px-5 py-3.5 text-foreground hidden sm:table-cell">{formatCurrency(o.serviceCost)}</td>
                    <td className="px-5 py-3.5 text-foreground hidden sm:table-cell">{formatCurrency(o.partsCost)}</td>
                    <td className="px-5 py-3.5 font-semibold text-foreground">{formatCurrency(total)}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={o.paymentStatus === "pago" ? "secondary" : o.paymentStatus === "parcial" ? "outline" : "destructive"}>
                        {o.paymentStatus === "pago" ? "Pago" : o.paymentStatus === "parcial" ? "Parcial" : "Pendente"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{paymentMethodLabels[o.paymentMethod] || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
