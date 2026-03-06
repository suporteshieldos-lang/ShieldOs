import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock3,
  DollarSign,
  Layers,
  Plus,
  Receipt,
  SlidersHorizontal,
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedChartTooltip, UnifiedLegend } from "@/components/charts/UnifiedChart";
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

const quickActions = [
  { title: "Nova OS", description: "Cadastrar ordem de serviço", to: "/ordens/nova", shortcut: "Alt+O", key: "o" },
  { title: "Novo cliente", description: "Adicionar novo cadastro", to: "/clientes/novo", shortcut: "Alt+C", key: "c" },
  { title: "Novo item", description: "Adicionar peça ao estoque", to: "/estoque/nova", shortcut: "Alt+E", key: "e" },
  { title: "Relatórios", description: "Analisar indicadores", to: "/relatorios", shortcut: "Alt+R", key: "r" },
] as const;

const DASHBOARD_PREFS_KEY = "shieldos_dashboard_preferences_v1";

type DashboardPreferences = {
  showQuickActions: boolean;
  showFinancialKpis: boolean;
  showCharts: boolean;
  showOperationalKpis: boolean;
  showInsights: boolean;
  compactDensity: boolean;
  pinnedQuickActionKeys: string[];
};

const defaultPreferences: DashboardPreferences = {
  showQuickActions: true,
  showFinancialKpis: true,
  showCharts: true,
  showOperationalKpis: true,
  showInsights: true,
  compactDensity: false,
  pinnedQuickActionKeys: quickActions.map((item) => item.key),
};

function readDashboardPreferences(): DashboardPreferences {
  try {
    const raw = localStorage.getItem(DASHBOARD_PREFS_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<DashboardPreferences>;
    const pinned = Array.isArray(parsed.pinnedQuickActionKeys)
      ? parsed.pinnedQuickActionKeys.filter((key): key is string => typeof key === "string")
      : defaultPreferences.pinnedQuickActionKeys;
    return {
      ...defaultPreferences,
      ...parsed,
      pinnedQuickActionKeys: pinned.length ? pinned : defaultPreferences.pinnedQuickActionKeys,
    };
  } catch {
    return defaultPreferences;
  }
}

function DashboardSkeleton() {
  return (
    <div className="premium-page" aria-busy="true" aria-live="polite" aria-label="Carregando dashboard">
      <section className="rounded-2xl border border-[#DCE5EF] bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-[#E6EDF5] bg-[#F8FAFC] p-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <Skeleton className="min-h-[208px] rounded-2xl" />
        <Skeleton className="min-h-[178px] rounded-2xl" />
        <Skeleton className="min-h-[178px] rounded-2xl" />
        <Skeleton className="min-h-[178px] rounded-2xl" />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[2.3fr_1fr]">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-[124px] rounded-2xl" />
        <Skeleton className="h-[124px] rounded-2xl" />
        <Skeleton className="h-[124px] rounded-2xl" />
      </section>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { orders, cashEntries, expenses, hydrated } = useAppStore();
  const [preferences, setPreferences] = useState<DashboardPreferences>(readDashboardPreferences);
  const orderAmountById = useMemo(() => new Map(orders.map((o) => [o.id, getOrderTotal(o)])), [orders]);
  const activeCashEntries = useMemo(
    () => cashEntries.filter((entry) => entry.status !== "cancelada" && entry.status !== "estornada"),
    [cashEntries]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const isEditable = target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
        if (isEditable) return;
      }

      const action = quickActions.find((item) => item.key === event.key.toLowerCase());
      if (!action) return;
      event.preventDefault();
      navigate(action.to);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(preferences));
  }, [preferences]);

  if (!hydrated) return <DashboardSkeleton />;

  const today = new Date();
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
  const custoPecasMes = orders.filter((o) => paidOrderIdsInMonth.has(o.id)).reduce((sum, o) => sum + (o.partsCost || 0), 0);
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
      return acc + Math.max(Math.round((fim.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24)), 0);
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
        const row = map.get(asShortDate(date));
        if (row) row.receita += Math.round(normalizedEntryAmount(e) / 100);
      });
    return base;
  })();

  const osPorStatus = [
    { label: "Abertas", value: orders.filter((o) => o.status === "received").length },
    { label: "Diagnóstico", value: orders.filter((o) => o.status === "diagnosing").length },
    { label: "Reparo", value: orders.filter((o) => o.status === "repairing").length },
    { label: "Aguard. peça", value: orders.filter((o) => o.status === "waiting_parts").length },
    { label: "Prontas", value: orders.filter((o) => o.status === "completed").length },
  ];

  const topServicos = (() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const key = o.reportedProblem || o.model || "Servico";
      if (paidOrderIdsInMonth.has(o.id)) map.set(key, (map.get(key) || 0) + (o.serviceCost || 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
  })();

  const volumePorCategoria = [
    { label: "Smartphone", value: orders.filter((o) => o.deviceType === "phone").length },
    { label: "Notebook", value: orders.filter((o) => o.deviceType === "notebook").length },
    { label: "Tablet", value: orders.filter((o) => o.deviceType === "tablet").length },
    { label: "Impressora", value: orders.filter((o) => o.deviceType === "printer").length },
  ];

  const hasEvolucao = evolucaoData.some((item) => item.receita > 0 || item.os > 0);
  const hasStatus = osPorStatus.some((item) => item.value > 0);
  const visibleQuickActions = quickActions.filter((item) => preferences.pinnedQuickActionKeys.includes(item.key));

  return (
    <div className={preferences.compactDensity ? "space-y-4" : "premium-page"}>
      <section className="flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-xl"><SlidersHorizontal className="h-4 w-4" />Personalizar dashboard</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Preferências do dashboard</DialogTitle></DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={preferences.showQuickActions} onChange={(e) => setPreferences((p) => ({ ...p, showQuickActions: e.target.checked }))} />Ações rápidas</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={preferences.showFinancialKpis} onChange={(e) => setPreferences((p) => ({ ...p, showFinancialKpis: e.target.checked }))} />KPIs financeiros</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={preferences.showCharts} onChange={(e) => setPreferences((p) => ({ ...p, showCharts: e.target.checked }))} />Gráficos</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={preferences.showOperationalKpis} onChange={(e) => setPreferences((p) => ({ ...p, showOperationalKpis: e.target.checked }))} />KPIs operacionais</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={preferences.showInsights} onChange={(e) => setPreferences((p) => ({ ...p, showInsights: e.target.checked }))} />Análises</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={preferences.compactDensity} onChange={(e) => setPreferences((p) => ({ ...p, compactDensity: e.target.checked }))} />Densidade compacta</label>
              </div>
              <div className="rounded-xl border border-[#E2EAF4] bg-[#F8FAFC] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Fixar ações rápidas</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {quickActions.map((action) => {
                    const checked = preferences.pinnedQuickActionKeys.includes(action.key);
                    return (
                      <label key={action.key} className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setPreferences((p) => ({
                              ...p,
                              pinnedQuickActionKeys: e.target.checked
                                ? Array.from(new Set([...p.pinnedQuickActionKeys, action.key]))
                                : p.pinnedQuickActionKeys.filter((k) => k !== action.key),
                            }))
                          }
                        />
                        {action.title}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end"><Button variant="outline" onClick={() => setPreferences(defaultPreferences)}>Restaurar padrão</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      {preferences.showQuickActions ? (
        <section className="rounded-2xl border border-[#DCE5EF] bg-white p-4 shadow-sm md:p-5" aria-labelledby="quick-actions-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="quick-actions-title" className="text-base font-semibold tracking-tight text-[#0F172A] md:text-lg">Ações rápidas</h2>
            <p className="text-xs text-[#64748B]">Atalhos operacionais para acelerar a rotina da equipe.</p>
          </div>
          <div className="flex items-center gap-2">
              <Button asChild variant="outline" className="rounded-xl"><Link to="/ordens">Ver ordens</Link></Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visibleQuickActions.map((action) => (
              <Link key={action.to} to={action.to} aria-keyshortcuts={action.shortcut.toLowerCase()} className="group rounded-2xl border border-[#E5ECF4] bg-[#F8FAFC] p-3 transition-all hover:border-[#BFD4EA] hover:bg-[#F2F7FD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F3A5F]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#1F3A5F] shadow-sm"><Plus className="h-4 w-4" /></div>
                  <span className="rounded-md border border-[#DCE5EF] bg-white px-2 py-0.5 text-[11px] font-medium text-[#64748B]">{action.shortcut}</span>
                </div>
                <p className="text-sm font-semibold text-[#0F172A]">{action.title}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-[#64748B]"><span>{action.description}</span><ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {preferences.showFinancialKpis ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4" aria-label="Indicadores financeiros">
          <article className="min-h-[208px] rounded-2xl border border-[#DCE5EF] bg-gradient-to-br from-[#1F3A5F] via-[#29557F] to-[#2B6B8D] p-5 text-white shadow-sm">
            <div className="flex items-start justify-between"><div><p className="text-xs uppercase tracking-wide text-white/75">Receita do mês</p><p className="mt-2 text-[34px] font-bold leading-none tracking-tight sm:text-[40px] xl:text-[44px]">{formatCurrency(faturamentoMes)}</p><p className="mt-3 text-xs text-white/75">{variacaoMes >= 0 ? "Evolução positiva" : "Atenção na evolução"}: {Math.abs(variacaoMes)}% vs mês anterior</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15" aria-hidden="true"><DollarSign className="h-6 w-6" /></div></div>
          </article>
          <article className="min-h-[178px] rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-wide text-[#64748B]">Lucro líquido</p><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ECFDF3]" aria-hidden="true"><Wallet className="h-5 w-5 text-emerald-600" /></div></div><p className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A]">{formatCurrency(lucroLiquido)}</p><p className="mt-1 text-xs text-[#64748B]">Resultado após custos e despesas</p></article>
          <article className="min-h-[178px] rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-wide text-[#64748B]">Custos + despesas</p><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F6FC]" aria-hidden="true"><Receipt className="h-5 w-5 text-[#2F5D8A]" /></div></div><p className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A]">{formatCurrency(custosDespesas)}</p><p className="mt-1 text-xs text-[#64748B]">Peças usadas e despesas operacionais</p></article>
          <article className="min-h-[178px] rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs uppercase tracking-wide text-[#64748B]">Backlog financeiro</p><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF2FF]" aria-hidden="true"><Layers className="h-5 w-5 text-indigo-600" /></div></div><p className="mt-3 text-3xl font-bold tracking-tight text-[#0F172A]">{formatCurrency(backlogFinanceiro)}</p><p className="mt-1 text-xs text-[#64748B]">OS abertas e em andamento não pagas</p></article>
        </section>
      ) : null}

      {preferences.showCharts ? (
        <section className="grid gap-4 2xl:grid-cols-[2.3fr_1fr]" aria-label="Gráficos do dashboard">
          <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between"><div><h3 id="chart-evolucao-title" className="text-lg font-semibold text-[#0F172A]">Tendência de receita e operações</h3><p className="text-xs text-[#64748B]">Leitura rápida da última semana</p></div><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F6FC]" aria-hidden="true"><BarChart3 className="h-5 w-5 text-[#2F5D8A]" /></div></div>
            {hasEvolucao ? (
              <div className="h-72" role="img" aria-labelledby="chart-evolucao-title" aria-describedby="chart-evolucao-summary">
                <p id="chart-evolucao-summary" className="sr-only">Receita acumulada da última semana de {formatCurrency(evolucaoData.reduce((sum, item) => sum + item.receita * 100, 0))} e {evolucaoData.reduce((sum, item) => sum + item.os, 0)} ordens de serviço registradas.</p>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evolucaoData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="evoReceitaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f87ff" stopOpacity={0.28} /><stop offset="95%" stopColor="#4f87ff" stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip content={<UnifiedChartTooltip kind="currency" />} />
                    <Area type="monotone" dataKey="receita" stroke="#4f87ff" fill="url(#evoReceitaFill)" strokeWidth={2.6} />
                    <Area type="monotone" dataKey="os" stroke="#7ECAD3" fillOpacity={0} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#DCE5EF] bg-[#F8FAFC] text-sm text-[#64748B]">Sem dados no período. O gráfico será exibido automaticamente.</div>}
            <UnifiedLegend items={[{ label: "Receita", color: "#4f87ff" }, { label: "OS", color: "#7ECAD3" }]} />
          </article>

          <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between"><div><h3 id="chart-status-title" className="text-lg font-semibold text-[#0F172A]">OS por status</h3><p className="text-xs text-[#64748B]">Visão rápida da fila</p></div><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F1F6FC]" aria-hidden="true"><Briefcase className="h-5 w-5 text-[#2F5D8A]" /></div></div>
            {hasStatus ? (
              <div className="h-72" role="img" aria-labelledby="chart-status-title" aria-describedby="chart-status-summary">
                <p id="chart-status-summary" className="sr-only">Distribuição atual de ordens por status. Total de {osPorStatus.reduce((sum, item) => sum + item.value, 0)} ordens exibidas.</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={osPorStatus} margin={{ top: 6, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} interval={0} />
                    <YAxis tick={{ fontSize: 11, fill: "#7A8DA5" }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                    <Tooltip content={<UnifiedChartTooltip kind="number" unit="OS" />} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>{osPorStatus.map((entry, index) => <Cell key={entry.label} fill={statusColors[index % statusColors.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#DCE5EF] bg-[#F8FAFC] text-sm text-[#64748B]">Sem OS no período selecionado.</div>}
            <UnifiedLegend items={osPorStatus.map((entry, index) => ({ label: entry.label, color: statusColors[index % statusColors.length] }))} />
          </article>
        </section>
      ) : null}

      {preferences.showOperationalKpis ? (
        <section className="grid gap-4 md:grid-cols-3" aria-label="Indicadores operacionais">
          <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-[#64748B]">OS abertas</p><Wrench className="h-4 w-4 text-[#2F5D8A]" aria-hidden="true" /></div><p className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{osAbertas}</p></article>
          <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-[#64748B]">OS em andamento</p><Clock3 className="h-4 w-4 text-amber-600" aria-hidden="true" /></div><p className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{osEmAndamento}</p></article>
          <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-[#64748B]">OS finalizadas (pagas)</p><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" /></div><p className="mt-2 text-3xl font-bold tracking-tight text-[#0F172A]">{osFinalizadasPagas}</p></article>
        </section>
      ) : null}

      {preferences.showInsights ? (
        <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-[1.5fr_1.2fr_1fr]" aria-label="Análises complementares">
          <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-[#0F172A]">Serviços mais rentáveis</p><Receipt className="h-4 w-4 text-[#64748B]" aria-hidden="true" /></div>{topServicos.length ? <div className="space-y-3">{topServicos.map((item) => <div key={item.label} className="flex items-center justify-between text-sm text-[#334155]"><span className="truncate pr-2">{item.label}</span><span className="font-semibold text-[#0F172A]">{formatCurrency(item.value)}</span></div>)}</div> : <p className="text-sm text-[#64748B]">Sem serviços rentáveis no período.</p>}</article>
          <article className="rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm"><div className="mb-3 flex items-center justify-between"><p id="chart-volume-title" className="text-sm font-semibold text-[#0F172A]">Volume por categoria</p><BarChart3 className="h-4 w-4 text-[#64748B]" aria-hidden="true" /></div><div className="h-48" role="img" aria-labelledby="chart-volume-title" aria-describedby="chart-volume-summary"><p id="chart-volume-summary" className="sr-only">Distribuição de ordens por tipo de dispositivo, com total de {volumePorCategoria.reduce((sum, item) => sum + item.value, 0)} entradas.</p><ResponsiveContainer width="100%" height="100%"><BarChart data={volumePorCategoria} layout="vertical" margin={{ top: 4, right: 8, left: 12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#EEF3F8" horizontal={false} /><XAxis type="number" hide /><YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: "#7A8DA5" }} axisLine={false} tickLine={false} /><Tooltip content={<UnifiedChartTooltip kind="number" unit="itens" />} /><Bar dataKey="value" radius={[6, 6, 6, 6]} fill="#7ECAD3" /></BarChart></ResponsiveContainer></div><UnifiedLegend items={[{ label: "Volume por categoria", color: "#7ECAD3" }]} /></article>
          <article className="md:col-span-2 rounded-2xl border border-[#DCE5EF] bg-white p-5 shadow-sm 2xl:col-span-1"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-[#0F172A]">Performance</p><Star className="h-4 w-4 text-[#64748B]" aria-hidden="true" /></div><dl className="space-y-3 text-sm text-[#334155]"><div className="flex items-center justify-between"><dt>SLA cumprido</dt><dd className="font-semibold text-emerald-600">{slaCumprido}%</dd></div><div className="flex items-center justify-between"><dt>Tempo médio</dt><dd className="font-semibold text-[#0F172A]">{tempoMedioDias}d</dd></div><div className="flex items-center justify-between"><dt>Satisfação</dt><dd className="font-semibold text-[#0F172A]">{satisfacao}%</dd></div></dl></article>
        </section>
      ) : null}
    </div>
  );
}
