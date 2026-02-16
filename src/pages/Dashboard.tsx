import { Wrench, CheckCircle2, Clock, DollarSign, AlertTriangle, Package } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import RecentOrders from "@/components/dashboard/RecentOrders";
import RevenueChart from "@/components/dashboard/RevenueChart";

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Ordens Abertas"
          value="23"
          change="+3 hoje"
          changeType="neutral"
          icon={Wrench}
          iconBg="bg-accent/10 text-accent"
        />
        <StatCard
          title="Concluídas"
          value="147"
          change="+12% este mês"
          changeType="positive"
          icon={CheckCircle2}
          iconBg="bg-success/10 text-success"
        />
        <StatCard
          title="Aguardando Peça"
          value="8"
          change="2 urgentes"
          changeType="negative"
          icon={Clock}
          iconBg="bg-warning/10 text-warning"
        />
        <StatCard
          title="Receita (Mês)"
          value="R$ 10.4k"
          change="+8% vs mês anterior"
          changeType="positive"
          icon={DollarSign}
          iconBg="bg-primary/10 text-primary"
        />
        <StatCard
          title="Alertas"
          value="5"
          change="3 garantias vencendo"
          changeType="negative"
          icon={AlertTriangle}
          iconBg="bg-destructive/10 text-destructive"
        />
        <StatCard
          title="Estoque Baixo"
          value="12"
          change="itens abaixo do mínimo"
          changeType="negative"
          icon={Package}
          iconBg="bg-warning/10 text-warning"
        />
      </div>

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
