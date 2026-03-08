import type { ReactNode } from "react";
import { AlertTriangle, CalendarCheck2, Coins, FileClock, HandCoins, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/store/appStore";

type MainKpi = {
  key: string;
  title: string;
  value: number;
  delta: number;
  icon: "wallet" | "calendar" | "trending" | "coins" | "alert" | "file";
  format: "currency" | "count";
};

type OperationalKpis = {
  avgTicket: number;
  servicesFinished: number;
  customersServed: number;
  avgRepairValue: number;
};

function kpiIcon(icon: MainKpi["icon"]) {
  if (icon === "wallet") return Wallet;
  if (icon === "calendar") return CalendarCheck2;
  if (icon === "trending") return TrendingUp;
  if (icon === "coins") return Coins;
  if (icon === "alert") return AlertTriangle;
  return FileClock;
}

function Delta({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <p className={`mt-2 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}>
      {positive ? "+" : ""}
      {value.toFixed(1)}% vs periodo anterior
    </p>
  );
}

function MainCard({ item }: { item: MainKpi }) {
  const Icon = kpiIcon(item.icon);
  const value = item.format === "currency" ? formatCurrency(item.value) : String(item.value);

  return (
    <Card className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#64748B]">{item.title}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2FF] text-[#2563EB]">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A]">{value}</p>
      <Delta value={item.delta} />
    </Card>
  );
}

function OperationalCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <Card className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[#64748B]">{title}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-[#0F172A]">{value}</p>
    </Card>
  );
}

export function FinancialKPIs({ main, operational }: { main: MainKpi[]; operational: OperationalKpis }) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {main.map((item) => (
          <MainCard key={item.key} item={item} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OperationalCard title="Ticket medio por OS" value={formatCurrency(operational.avgTicket)} icon={<HandCoins className="h-4 w-4" />} />
        <OperationalCard title="Servicos finalizados no mes" value={String(operational.servicesFinished)} icon={<TrendingUp className="h-4 w-4" />} />
        <OperationalCard title="Clientes atendidos" value={String(operational.customersServed)} icon={<CalendarCheck2 className="h-4 w-4" />} />
        <OperationalCard title="Valor medio de reparo" value={formatCurrency(operational.avgRepairValue)} icon={<Wallet className="h-4 w-4" />} />
      </section>
    </div>
  );
}
