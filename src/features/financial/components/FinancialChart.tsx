import { Card } from "@/components/ui/Card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/store/appStore";

type CashPoint = { label: string; entradas: number; saidas: number; saldo: number };
type DailyRevenuePoint = { label: string; faturamento: number };
type OriginPoint = { name: string; value: number };
type TechnicianPoint = { name: string; value: number };

const PIE_COLORS = ["#0F2747", "#2563EB", "#38BDF8"];

function moneyFormatter(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function FinancialChart({
  cashFlow,
  dailyRevenue,
  origin,
  technicians,
}: {
  cashFlow: CashPoint[];
  dailyRevenue: DailyRevenuePoint[];
  origin: OriginPoint[];
  technicians: TechnicianPoint[];
}) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Card className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm xl:col-span-8">
        <p className="mb-4 text-sm font-semibold text-[#0F172A]">Fluxo de caixa (30 dias)</p>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
              <Tooltip formatter={(v: number) => moneyFormatter(v)} />
              <Legend />
              <Area type="monotone" dataKey="entradas" stroke="#10B981" fill="#10B981" fillOpacity={0.14} strokeWidth={2} name="Entradas" />
              <Area type="monotone" dataKey="saidas" stroke="#EF4444" fill="#EF4444" fillOpacity={0.12} strokeWidth={2} name="Saidas" />
              <Area type="monotone" dataKey="saldo" stroke="#2563EB" fill="#2563EB" fillOpacity={0.08} strokeWidth={2} name="Saldo" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm xl:col-span-4">
        <p className="mb-4 text-sm font-semibold text-[#0F172A]">Origem da receita</p>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={origin} dataKey="value" nameKey="name" outerRadius={90} innerRadius={54} paddingAngle={3}>
                {origin.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => moneyFormatter(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm xl:col-span-7">
        <p className="mb-4 text-sm font-semibold text-[#0F172A]">Faturamento por dia</p>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
              <Tooltip formatter={(v: number) => moneyFormatter(v)} />
              <Bar dataKey="faturamento" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm xl:col-span-5">
        <p className="mb-4 text-sm font-semibold text-[#0F172A]">Receita por tecnico</p>
        <div className="space-y-3">
          {technicians.length === 0 ? (
            <p className="text-sm text-[#64748B]">Sem dados de receita por tecnico neste periodo.</p>
          ) : (
            technicians.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                <p className="text-sm text-[#0F172A]">{index + 1}. {item.name}</p>
                <p className="text-sm font-semibold text-[#0F172A]">{formatCurrency(item.value)}</p>
              </div>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}
