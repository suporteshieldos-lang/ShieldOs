import { useMemo } from "react";
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock3,
  DollarSign,
  Layers,
  Receipt,
  Star,
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
  const orderAmountById = useMemo(() => new Map(orders.map((o) => [o.id, getOrderTotal(o)])), [orders]);

  const activeCashEntries = useMemo(
    () => cashEntries.filter((entry) => entry.status !== "cancelada" && entry.status !== "estornada"),
    [cashEntries]
  );
  const normalizedEntryAmount = (entry: (typeof cashEntries)[number]) => {
    if (entry.source === "os" && entry.orderId && orderAmountById.has(entry.orderId)) {
      return orderAmountById.get(entry.orderId) || 0;
    }
    return entry.amount;
  };

  const osAbertas = orders.filter((o) => !["completed", "delivered", "cancelled"].includes(o.status)).length;
  const osEmAndamento = orders.filter((o) => ["diagnosing", "repairing", "waiting_parts"].includes(o.status)).length;
  const osFinalizadasPagas = orders.filter((o) => ["completed", "delivered"].includes(o.status) && o.paymentStatus === "pago").length;

  const receitaMesOS = activeCashEntries
    .filter((e) => e.type === "entrada" && e.source === "os" && inCurrentMonth(e.date))
    .reduce((sum, e) => sum + normalizedEntryAmount(e), 0);
  const receitaMesBalcao = activeCashEntries
    .filter((e) => e.type === "entrada" && e.source === "venda_peca" && inCurrentMonth(e.date))
    .reduce((sum, e) => sum + e.amount, 0);
  const faturamentoMes = receitaMesOS + receitaMesBalcao;

  const receitaMesAnteriorOS = activeCashEntries
    .filter((e) => {
      if (e.type !== "entrada" || e.source !== "os") return false;
      const date = parseBrDate(e.date);
      if (!date) return false;
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return date.getMonth() === prevMonth.getMonth() && date.getFullYear() === prevMonth.getFullYear();
    })
    .reduce((sum, e) => sum + normalizedEntryAmount(e), 0);
  const receitaMesAnteriorBalcao = activeCashEntries
    .filter((e) => {
      if (e.type !== "entrada" || e.source !== "venda_peca") return false;
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

  const paidOrderIdsInMonth = new Set(
    activeCashEntries
      .filter((e) => e.type === "entrada" && e.source === "os" && inCurrentMonth(e.date) && !!e.orderId)
      .map((e) => e.orderId as string)
  );
  const custoPecasMes = orders
    .filter((o) => paidOrderIdsInMonth.has(o.id))
    .reduce((sum, o) => sum + (o.partsCost || 0), 0);
  const custoBalcaoMes = activeCashEntries
    .filter((e) => e.type === "entrada" && e.source === "venda_peca" && inCurrentMonth(e.date))
    .reduce((sum, e) => sum + Math.max(0, Number(e.saleUnitCost || 0) * Math.max(0, Number(e.saleQty || 0))), 0);
  const despesasMes = expenses.filter((e) => inCurrentMonth(e.date)).reduce((sum, e) => sum + e.amount, 0);
  const custosDespesas = custoPecasMes + custoBalcaoMes + despesasMes;
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
      const date = parseBrDate(o.date);
      if (!date) return;
      const row = map.get(asShortDate(date));
      if (row) row.os += 1;
    });

    activeCashEntries
      .filter((e) => e.type === "entrada" && (e.source === "venda_peca" || e.source === "os"))
      .forEach((e) => {
        const date = parseBrDate(e.date);
        if (!date) return;
        const key = asShortDate(date);
        const row = map.get(key);
        if (!row) return;
        row.receita += Math.round(normalizedEntryAmount(e) / 100);
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
      if (paidOrderIdsInMonth.has(o.id)) {
        map.set(key, (map.get(key) || 0) + (o.serviceCost || 0));
      }
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
    <div className="premium-page">
      <section className="grid gap-4 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#DCE5EF] bg-gradient-to-br from-[#1F3A5F] via-[#29557F] to-[#2B6B8D] p-5 text-white shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/75">Receita do mês</p>
              <p className="mt-2 text-[44px] font-bold leading-none tracking-tight">{formatCurrency(faturamentoMes)}</p>
              <p className="mt-3 text-xs text-white/75">
                {variacaoMes >= 0 ? "Evolução positiva" : "Atenção na evolução"}: {Math.abs(variacaoMes)}% vs mês anterior
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
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


