import { Wrench, CheckCircle2, Clock, DollarSign, AlertTriangle, Package, TrendingUp, CreditCard } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RecentOrders from "@/components/dashboard/RecentOrders";
import RevenueChart from "@/components/dashboard/RevenueChart";
import { useAppStore, formatCurrency, getOrderTotal } from "@/store/appStore";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { orders, inventory, cashEntries } = useAppStore();

  // Operational
  const openOrders = orders.filter((o) => !["completed", "delivered"].includes(o.status)).length;
  const repairing = orders.filter((o) => o.status === "repairing").length;
  const waitingParts = orders.filter((o) => o.status === "waiting_parts").length;
  const completed = orders.filter((o) => o.status === "completed").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;

  // Financial
  const paidOrders = orders.filter((o) => o.paymentStatus === "pago");
  const unpaidOrders = orders.filter((o) => o.paymentStatus === "pendente");
  const revenueMonth = paidOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const profitMonth = paidOrders.reduce((sum, o) => {
    const partsCostReal = o.usedParts.reduce((s, p) => s + p.unitCost * p.qty, 0);
    return sum + getOrderTotal(o) - partsCostReal;
  }, 0);

  // Today
  const today = new Date().toLocaleDateString("pt-BR");
  const revenueToday = paidOrders.filter((o) => o.paymentDate === today).reduce((sum, o) => sum + getOrderTotal(o), 0);

  // Inventory
  const lowStock = inventory.filter((i) => i.qty <= i.minQty).length;
  const stockValue = inventory.reduce((sum, i) => sum + i.qty * i.costPrice, 0);

  // Alerts
  const noChecklistOrders = orders.filter((o) => Object.keys(o.checklist).length === 0 && !["delivered"].includes(o.status)).length;
  const noPhotosOrders = orders.filter((o) => o.entryPhotos.length === 0 && !["delivered"].includes(o.status)).length;

  // Warranty alerts
  const warrantyAlerts = orders.filter((o) => {
    if (!o.completedDate || o.status !== "delivered") return false;
    const parts = o.completedDate.split("/");
    if (parts.length !== 3) return false;
    const completedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const expiryDate = new Date(completedDate);
    expiryDate.setDate(expiryDate.getDate() + o.warrantyDays);
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 15;
  }).length;

  const totalAlerts = warrantyAlerts + noChecklistOrders + noPhotosOrders + unpaidOrders.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Operational Stats */}
      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">Operacional</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title="OS Abertas" value={String(openOrders)} change={`${repairing} em reparo`} changeType="neutral" icon={Wrench} iconBg="bg-accent/10 text-accent" />
          <StatCard title="Em Reparo" value={String(repairing)} icon={Wrench} iconBg="bg-primary/10 text-primary" />
          <StatCard title="Aguard. Peça" value={String(waitingParts)} changeType="negative" icon={Clock} iconBg="bg-warning/10 text-warning" />
          <StatCard title="Prontas" value={String(completed)} change="para retirada" changeType="positive" icon={CheckCircle2} iconBg="bg-success/10 text-success" />
          <StatCard title="Entregues" value={String(delivered)} icon={CheckCircle2} iconBg="bg-muted text-muted-foreground" />
        </div>
      </div>

      {/* Financial Stats */}
      <div>
        <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">Financeiro</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard title="Receita (Mês)" value={formatCurrency(revenueMonth)} icon={DollarSign} iconBg="bg-primary/10 text-primary" />
          <StatCard title="Receita (Hoje)" value={formatCurrency(revenueToday)} icon={DollarSign} iconBg="bg-accent/10 text-accent" />
          <StatCard title="Lucro Estimado" value={formatCurrency(profitMonth)} changeType="positive" icon={TrendingUp} iconBg="bg-success/10 text-success" />
          <StatCard title="OS Pagas" value={String(paidOrders.length)} change={`${unpaidOrders.length} pendentes`} changeType={unpaidOrders.length > 0 ? "negative" : "positive"} icon={CreditCard} iconBg="bg-success/10 text-success" />
          <StatCard title="Estoque (Valor)" value={formatCurrency(stockValue)} change={`${lowStock} itens baixos`} changeType={lowStock > 0 ? "negative" : "neutral"} icon={Package} iconBg="bg-warning/10 text-warning" />
        </div>
      </div>

      {/* Alerts */}
      {totalAlerts > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="text-sm font-semibold text-foreground">Alertas ({totalAlerts})</h3>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {warrantyAlerts > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-warning/5 px-3 py-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-warning" />
                <span className="text-foreground">{warrantyAlerts} garantia(s) vencendo</span>
              </div>
            )}
            {unpaidOrders.length > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-foreground">{unpaidOrders.length} OS sem pagamento</span>
              </div>
            )}
            {noChecklistOrders > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-accent/5 px-3 py-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-accent" />
                <span className="text-foreground">{noChecklistOrders} OS sem checklist</span>
              </div>
            )}
            {noPhotosOrders > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-info/5 px-3 py-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-info" />
                <span className="text-foreground">{noPhotosOrders} OS sem fotos</span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Charts & Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <RevenueChart />
        </div>
        <div className="lg:col-span-3">
          <RecentOrders />
        </div>
      </div>
    </div>
  );
}
