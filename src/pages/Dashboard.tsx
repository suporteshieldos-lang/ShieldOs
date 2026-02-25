import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock3,
  DollarSign,
  Layers,
  Receipt,
  Star,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, getOrderTotal, useAppStore } from "@/store/appStore";

function parseBrDate(value?: string) {
  if (!value) return null;
  const [d, m, y] = value.split("/").map(Number);
  if (!d || !m || !y) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function asShortDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function inCurrentMonth(value?: string) {
  const date = parseBrDate(value);
  if (!date) return false;
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function diffPercent(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const statusColors = ["#4f87ff", "#86a9ff", "#5f7de4", "#f0b552", "#4dbf99"];

export default function Dashboard() {
  const { orders, cashEntries, expenses } = useAppStore();
  const today = new Date();

  const osAbertas = orders.filter((o) => !["completed", "delivered", "cancelled"].includes(o.status)).length;
  const osEmAndamento = orders.filter((o) => ["diagnosing", "repairing", "waiting_parts"].includes(o.status)).length;
  const osFinalizadasPagas = orders.filter((o) => ["completed", "delivered"].includes(o.status) && o.paymentStatus === "pago").length;

  const receitaMesOS = orders
    .filter((o) => o.paymentStatus === "pago" && inCurrentMonth(o.paymentDate || o.date))
    .reduce((sum, o) => sum + getOrderTotal(o), 0);
  const receitaMesBalcao = cashEntries
    .filter((e) => e.status !== "cancelada" && e.type === "entrada" && e.source === "venda_peca" && inCurrentMonth(e.date))
    .reduce((sum, e) => sum + e.amount, 0);
  const faturamentoMes = receitaMesOS + receitaMesBalcao;

  const receitaMesAnteriorOS = orders
    .filter((o) => {
      if (o.paymentStatus !== "pago") return false;
      const date = parseBrDate(o.paymentDate || o.date);
      if (!date) return false;
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return date.getMonth() === prevMonth.getMonth() && date.getFullYear() === prevMonth.getFullYear();
    })
    .reduce((sum, o) => sum + getOrderTotal(o), 0);
  const receitaMesAnteriorBalcao = cashEntries
    .filter((e) => {
      if (e.status === "cancelada" || e.type !== "entrada" || e.source !== "venda_peca") return false;
      const date = parseBrDate(e.date);
      if (!date) return false;
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return date.getMonth() === prevMonth.getMonth() && date.getFullYear() === prevMonth.getFullYear();
    })
    .reduce((sum, e) => sum + e.amount, 0);
  const faturamentoMesAnterior = receitaMesAnteriorOS + receitaMesAnteriorBalcao;
  const variacaoMes = diffPercent(faturamentoMes, faturamentoMesAnterior);

  const backlogFinanceiro = orders
    .filter((o) => ["received", "diagnosing", "repairing", "waiting_parts"].includes(o.status) && o.paymentStatus !== "pago")
    .reduce((sum, o) => sum + getOrderTotal(o), 0);

  const custoPecasMes = orders
    .filter((o) => inCurrentMonth(o.paymentDate || o.date))
    .reduce((sum, o) => sum + (o.partsCost || 0), 0);
  const despesasMes = expenses.filter((e) => inCurrentMonth(e.date)).reduce((sum, e) => sum + e.amount, 0);
  const custosDespesas = custoPecasMes + despesasMes;
  const lucroLiquido = faturamentoMes - custosDespesas;

  const entregues = orders.filter((o) => o.status === "delivered").length;
  const canceladas = orders.filter((o) => o.status === "cancelled").length;
  const satisfacao = entregues + canceladas > 0 ? Math.round((entregues / (entregues + canceladas)) * 100) : 100;

  const tempoMedioDias = (() => {
    const concluido = orders.filter((o) => o.completedDate && o.date);
    if (!concluido.length) return 0;
    const total = concluido.reduce((acc, o) => {
      const ini = parseBrDate(o.date);
      const fim = parseBrDate(o.completedDate);
      if (!ini || !fim) return acc;
      const diff = Math.max(Math.round((fim.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24)), 0);
      return acc + diff;
    }, 0);
    return Number((total / concluido.length).toFixed(1));
  })();

  const slaCumprido = (() => {
    const concluido = orders.filter((o) => o.completedDate && o.date);
    if (!concluido.length) return 100;
    const dentro = concluido.filter((o) => {
      const ini = parseBrDate(o.date);
      const fim = parseBrDate(o.completedDate);
      if (!ini || !fim) return false;
      return Math.max(Math.round((fim.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24)), 0) <= 3;
    }).length;
    return Math.round((dentro / concluido.length) * 100);
  })();
  const evolucaoData = (() => {
    const base = Array.from({ length: 8 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (7 - index));
      return { label: asShortDate(day), receita: 0, os: 0 };
    });
    const map = new Map(base.map((row) => [row.label, row]));

    orders.forEach((o) => {
      const date = parseBrDate(o.paymentDate || o.date);
      if (!date) return;
      const key = asShortDate(date);
      const row = map.get(key);
      if (!row) return;
      if (o.paymentStatus === "pago") row.receita += Math.round(getOrderTotal(o) / 100);
      row.os += 1;
    });

    cashEntries
      .filter((e) => e.status !== "cancelada" && e.type === "entrada" && e.source === "venda_peca")
      .forEach((e) => {
        const date = parseBrDate(e.date);
        if (!date) return;
        const key = asShortDate(date);
        const row = map.get(key);
        if (!row) return;
        row.receita += Math.round(e.amount / 100);
      });

    return base;
  })();

  const osPorStatus = [
    { label: "Abertas", value: orders.filter((o) => o.status === "received").length },
    { label: "Diagnostico", value: orders.filter((o) => o.status === "diagnosing").length },
    { label: "Reparo", value: orders.filter((o) => o.status === "repairing").length },
    { label: "Aguard. peca", value: orders.filter((o) => o.status === "waiting_parts").length },
    { label: "Prontas", value: orders.filter((o) => o.status === "completed").length },
  ];

  const hasEvolucao = evolucaoData.some((item) => item.receita > 0 || item.os > 0);
  const hasStatus = osPorStatus.some((item) => item.value > 0);

  const topServicos = (() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const key = o.reportedProblem || o.model || "Servico";
      map.set(key, (map.get(key) || 0) + getOrderTotal(o));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value]) => ({ label, value }));
  })();

  const volumePorCategoria = [
    { label: "Smartphone", value: orders.filter((o) => o.deviceType === "phone").length },
    { label: "Notebook", value: orders.filter((o) => o.deviceType === "notebook").length },
    { label: "Tablet", value: orders.filter((o) => o.deviceType === "tablet").length },
    { label: "Impressora", value: orders.filter((o) => o.deviceType === "printer").length },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="grid gap-4 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#DCE5EF] bg-gradient-to-br from-[#1F3A5F] via-[#2F5D8A] to-[#2B6B8D] p-5 text-white shadow-md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Receita total do mês</p>
              <p className="mt-2 text-5xl font-bold tracking-tight">{formatCurrency(faturamentoMes)}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm">
                {variacaoMes >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{Math.abs(variacaoMes)}% vs mês anterior</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-[#64748B]">Custos + despesas</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F6FC]">
              <Receipt className="h-5 w-5 text-[#2F5D8A]" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A]">{formatCurrency(custosDespesas)}</p>
          <p className="mt-1 text-xs text-[#64748B]">Peças usadas e despesas operacionais</p>
        </article>

        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-[#64748B]">Lucro líquido</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF3]">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A]">{formatCurrency(lucroLiquido)}</p>
          <p className="mt-1 text-xs text-[#64748B]">Resultado após custos e despesas</p>
        </article>

        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-[#64748B]">Backlog financeiro</p>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF]">
              <Layers className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A]">{formatCurrency(backlogFinanceiro)}</p>
          <p className="mt-1 text-xs text-[#64748B]">OS abertas e em andamento não pagas</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[2.3fr_1fr]">
        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">Tendência de receita e operações</h3>
              <p className="text-xs text-[#64748B]">Leitura rápida da última semana</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F6FC]">
              <BarChart3 className="h-5 w-5 text-[#2F5D8A]" />
            </div>
          </div>
          {hasEvolucao ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucaoData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="evoReceitaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f87ff" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#4f87ff" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} width={28} />
                  <Tooltip formatter={(value: number, name: string) => (name === "receita" ? `R$ ${value.toLocaleString("pt-BR")}` : `${value} OS`)} />
                  <Area type="monotone" dataKey="receita" stroke="#4f87ff" fill="url(#evoReceitaFill)" strokeWidth={2.6} />
                  <Area type="monotone" dataKey="os" stroke="#7ECAD3" fillOpacity={0} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#DCE5EF] bg-[#F8FAFC] text-sm text-[#64748B]">
              Sem dados no período. O gráfico será exibido automaticamente.
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A]">OS por status</h3>
              <p className="text-xs text-[#64748B]">Visão rápida da fila</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F6FC]">
              <Briefcase className="h-5 w-5 text-[#2F5D8A]" />
            </div>
          </div>
          {hasStatus ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={osPorStatus} margin={{ top: 6, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {osPorStatus.map((entry, index) => (
                      <Cell key={entry.label} fill={statusColors[index % statusColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#DCE5EF] bg-[#F8FAFC] text-sm text-[#64748B]">
              Sem OS no período selecionado.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#64748B]">OS abertas</p>
            <Wrench className="h-4 w-4 text-[#2F5D8A]" />
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{osAbertas}</p>
        </article>
        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#64748B]">OS em andamento</p>
            <Clock3 className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{osEmAndamento}</p>
        </article>
        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[#64748B]">OS finalizadas (pagas)</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{osFinalizadasPagas}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1.2fr_1fr]">
        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0F172A]">Serviços mais rentáveis</p>
            <Receipt className="h-4 w-4 text-[#64748B]" />
          </div>
          {topServicos.length ? (
            <div className="space-y-3">
              {topServicos.map((item) => (
                <div key={item.label} className="flex items-center justify-between text-sm text-[#334155]">
                  <span className="truncate pr-2">{item.label}</span>
                  <span className="font-semibold text-[#0F172A]">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#64748B]">Sem serviços rentáveis no período.</p>
          )}
        </article>

        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#0F172A]">Volume por categoria</p>
            <BarChart3 className="h-4 w-4 text-[#64748B]" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumePorCategoria} layout="vertical" margin={{ top: 4, right: 8, left: 12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: "#7A8DA5" }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[6, 6, 6, 6]} fill="#7ECAD3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#0F172A]">Performance</p>
            <Star className="h-4 w-4 text-[#64748B]" />
          </div>
          <div className="space-y-3 text-sm text-[#334155]">
            <div className="flex items-center justify-between">
              <span>SLA cumprido</span>
              <span className="font-semibold text-emerald-600">{slaCumprido}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tempo médio</span>
              <span className="font-semibold text-[#0F172A]">{tempoMedioDias}d</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Satisfação</span>
              <span className="font-semibold text-[#0F172A]">{satisfacao}%</span>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

