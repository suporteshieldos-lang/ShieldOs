import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useAppStore, formatCurrency, getOrderTotal, getOrderProfit } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";

const COLORS = ["hsl(215, 60%, 22%)", "hsl(190, 70%, 48%)", "hsl(150, 60%, 45%)", "hsl(40, 90%, 55%)", "hsl(0, 70%, 55%)"];

export default function Reports() {
  const { orders } = useAppStore();
  const paidOrders = orders.filter((o) => o.paymentStatus === "pago");

  const totalRevenue = paidOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const totalProfit = paidOrders.reduce((sum, o) => sum + getOrderProfit(o), 0);

  const problemCount: Record<string, number> = {};
  orders.forEach((o) => {
    const key = o.reportedProblem.toLowerCase().trim();
    if (key) problemCount[key] = (problemCount[key] || 0) + 1;
  });
  const topProblems = Object.entries(problemCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const brandCount: Record<string, number> = {};
  orders.forEach((o) => {
    brandCount[o.brand] = (brandCount[o.brand] || 0) + 1;
  });
  const brandData = Object.entries(brandCount).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

  const techStats: Record<string, { count: number; revenue: number }> = {};
  orders.forEach((o) => {
    if (!o.technician) return;
    if (!techStats[o.technician]) techStats[o.technician] = { count: 0, revenue: 0 };
    techStats[o.technician].count += 1;
    if (o.paymentStatus === "pago") techStats[o.technician].revenue += getOrderTotal(o);
  });

  const partCount: Record<string, number> = {};
  orders.forEach((o) =>
    o.usedParts.forEach((p) => {
      partCount[p.name] = (partCount[p.name] || 0) + p.qty;
    })
  );
  const topParts = Object.entries(partCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const customerOrderCount: Record<string, { name: string; count: number }> = {};
  orders.forEach((o) => {
    const key = o.customerCpf || o.customerName;
    if (!customerOrderCount[key]) customerOrderCount[key] = { name: o.customerName, count: 0 };
    customerOrderCount[key].count += 1;
  });
  const recurringCustomers = Object.values(customerOrderCount)
    .filter((c) => c.count > 1)
    .sort((a, b) => b.count - a.count);

  const exportPdf = () => {
    const doc = new jsPDF();
    let y = 12;
    doc.setFontSize(14);
    doc.text("Relatório Gerencial - ShieldOS", 10, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Total de OS: ${orders.length}`, 10, y);
    y += 6;
    doc.text(`Receita: ${formatCurrency(totalRevenue)}`, 10, y);
    y += 6;
    doc.text(`Lucro: ${formatCurrency(totalProfit)}`, 10, y);
    y += 8;
    doc.setFontSize(11);
    doc.text("Top problemas:", 10, y);
    y += 6;
    doc.setFontSize(10);
    topProblems.forEach(([problem, count]) => {
      doc.text(`- ${problem}: ${count}x`, 10, y);
      y += 5;
    });
    y += 4;
    doc.setFontSize(11);
    doc.text("Peças mais usadas:", 10, y);
    y += 6;
    doc.setFontSize(10);
    topParts.forEach(([name, count]) => {
      doc.text(`- ${name}: ${count} un.`, 10, y);
      y += 5;
    });
    doc.save(`relatorio-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Visão geral dos resultados operacionais.
        </div>
        <Button className="gap-2" onClick={exportPdf}>
          <FileDown className="h-4 w-4" />
          Gerar PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass-card flex h-full flex-col justify-center rounded-2xl border border-border/60 bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{orders.length}</p>
          <p className="text-xs text-muted-foreground">Total de OS</p>
        </div>
        <div className="glass-card flex h-full flex-col justify-center rounded-2xl border border-border/60 bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-muted-foreground">Receita</p>
        </div>
        <div className="glass-card flex h-full flex-col justify-center rounded-2xl border border-border/60 bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-success">{formatCurrency(totalProfit)}</p>
          <p className="text-xs text-muted-foreground">Lucro</p>
        </div>
        <div className="glass-card flex h-full flex-col justify-center rounded-2xl border border-border/60 bg-card p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-foreground">{recurringCustomers.length}</p>
          <p className="text-xs text-muted-foreground">Clientes recorrentes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card h-full rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-foreground">Marcas mais atendidas</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={brandData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78} label={({ name, value }) => `${name} (${value})`}>
                {brandData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card h-full rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-foreground">Desempenho dos técnicos</h3>
          <div className="space-y-3">
            {Object.entries(techStats).map(([name, stats]) => (
              <div key={name} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{stats.count} OS</p>
                </div>
                <span className="font-semibold text-foreground">{formatCurrency(stats.revenue)}</span>
              </div>
            ))}
            {Object.keys(techStats).length === 0 && <p className="text-sm text-muted-foreground">Sem dados de técnicos.</p>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card h-full rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-foreground">Problemas mais comuns</h3>
          <div className="space-y-2">
            {topProblems.map(([problem, count], i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm capitalize text-foreground">{problem}</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{count}x</span>
              </div>
            ))}
            {topProblems.length === 0 && <p className="text-sm text-muted-foreground">Sem dados de problemas.</p>}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card h-full rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-foreground">Peças mais usadas</h3>
          <div className="space-y-2">
            {topParts.map(([name, count], i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-foreground">{name}</span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">{count} un.</span>
              </div>
            ))}
            {topParts.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma peça registrada.</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
