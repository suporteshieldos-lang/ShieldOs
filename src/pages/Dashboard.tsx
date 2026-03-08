import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getOrderTotal, useAppStore } from "@/store/appStore";
import { DashboardSkeleton } from "@/dashboard/DashboardSkeleton";
import { QuickActions } from "@/dashboard/QuickActions";
import { FinancialKpis } from "@/dashboard/FinancialKpis";
import { ChartsSection } from "@/dashboard/ChartsSection";
import { OperationalKpis } from "@/dashboard/OperationalKpis";

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

const DASHBOARD_PREFS_KEY = "shieldos_dashboard_preferences_v1";

type DashboardPreferences = {
  showQuickActions: boolean;
  showFinancialKpis: boolean;
  showCharts: boolean;
  showOperationalKpis: boolean;
  compactDensity: boolean;
};

const defaultPreferences: DashboardPreferences = {
  showQuickActions: true,
  showFinancialKpis: true,
  showCharts: true,
  showOperationalKpis: true,
  compactDensity: false,
};

function readDashboardPreferences(): DashboardPreferences {
  try {
    const raw = localStorage.getItem(DASHBOARD_PREFS_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<DashboardPreferences>;
    return { ...defaultPreferences, ...parsed };
  } catch {
    return defaultPreferences;
  }
}

export default function Dashboard() {
  const { orders, cashEntries, expenses, hydrated } = useAppStore();
  const [preferences, setPreferences] = useState<DashboardPreferences>(readDashboardPreferences);

  const orderAmountById = useMemo(() => new Map(orders.map((order) => [order.id, getOrderTotal(order)])), [orders]);

  const activeCashEntries = useMemo(
    () => cashEntries.filter((entry) => entry.status !== "cancelada" && entry.status !== "estornada"),
    [cashEntries]
  );

  useEffect(() => {
    localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const metrics = useMemo(() => {
    const normalizedEntryAmount = (entry: (typeof cashEntries)[number]) => {
      if (entry.source === "os" && entry.orderId && orderAmountById.has(entry.orderId)) {
        return orderAmountById.get(entry.orderId) || 0;
      }
      return entry.amount;
    };

    const faturamentoMesOS = activeCashEntries
      .filter((entry) => entry.type === "entrada" && entry.source === "os" && inCurrentMonth(entry.date))
      .reduce((sum, entry) => sum + normalizedEntryAmount(entry), 0);
    const faturamentoMesBalcao = activeCashEntries
      .filter((entry) => entry.type === "entrada" && entry.source === "venda_peca" && inCurrentMonth(entry.date))
      .reduce((sum, entry) => sum + entry.amount, 0);
    const faturamentoMes = faturamentoMesOS + faturamentoMesBalcao;

    const backlogFinanceiro = orders
      .filter((order) => ["received", "diagnosing", "repairing", "waiting_parts"].includes(order.status) && order.paymentStatus !== "pago")
      .reduce((sum, order) => sum + getOrderTotal(order), 0);

    const paidOrderIdsInMonth = new Set(
      activeCashEntries
        .filter((entry) => entry.type === "entrada" && entry.source === "os" && inCurrentMonth(entry.date) && !!entry.orderId)
        .map((entry) => entry.orderId as string)
    );

    const custoPecasMes = orders
      .filter((order) => paidOrderIdsInMonth.has(order.id))
      .reduce((sum, order) => sum + (order.partsCost || 0), 0);

    const custoBalcaoMes = activeCashEntries
      .filter((entry) => entry.type === "entrada" && entry.source === "venda_peca" && inCurrentMonth(entry.date))
      .reduce((sum, entry) => sum + Math.max(0, Number(entry.saleUnitCost || 0) * Math.max(0, Number(entry.saleQty || 0))), 0);

    const despesasMes = expenses.filter((expense) => inCurrentMonth(expense.date)).reduce((sum, expense) => sum + expense.amount, 0);
    const custosDespesas = custoPecasMes + custoBalcaoMes + despesasMes;
    const lucroLiquido = faturamentoMes - custosDespesas;

    const osAbertas = orders.filter((order) => !["completed", "delivered", "cancelled"].includes(order.status)).length;
    const osEmAndamento = orders.filter((order) => ["diagnosing", "repairing", "waiting_parts"].includes(order.status)).length;
    const osFinalizadasPagas = orders.filter((order) => ["completed", "delivered"].includes(order.status) && order.paymentStatus === "pago").length;

    const tempoMedioDias = (() => {
      const concluidas = orders.filter((order) => order.completedDate && order.date);
      if (!concluidas.length) return 0;
      const totalDias = concluidas.reduce((acc, order) => {
        const inicio = parseBrDate(order.date);
        const fim = parseBrDate(order.completedDate);
        if (!inicio || !fim) return acc;
        return acc + Math.max(Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)), 0);
      }, 0);
      return Number((totalDias / concluidas.length).toFixed(1));
    })();

    const slaCumprido = (() => {
      const concluidas = orders.filter((order) => order.completedDate && order.date);
      if (!concluidas.length) return 100;
      const dentroPrazo = concluidas.filter((order) => {
        const inicio = parseBrDate(order.date);
        const fim = parseBrDate(order.completedDate);
        if (!inicio || !fim) return false;
        return Math.max(Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)), 0) <= 3;
      }).length;
      return Math.round((dentroPrazo / concluidas.length) * 100);
    })();

    const today = new Date();
    const revenueBase = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(today);
      day.setDate(today.getDate() - (6 - index));
      return { label: asShortDate(day), receita: 0 };
    });
    const revenueMap = new Map(revenueBase.map((item) => [item.label, item]));
    activeCashEntries
      .filter((entry) => entry.type === "entrada" && (entry.source === "venda_peca" || entry.source === "os"))
      .forEach((entry) => {
        const date = parseBrDate(entry.date);
        if (!date) return;
        const row = revenueMap.get(asShortDate(date));
        if (!row) return;
        row.receita += normalizedEntryAmount(entry) / 100;
      });

    const statusData = [
      { label: "Abertas", value: orders.filter((order) => order.status === "received").length },
      { label: "Diagnóstico", value: orders.filter((order) => order.status === "diagnosing").length },
      { label: "Reparo", value: orders.filter((order) => order.status === "repairing").length },
      { label: "Aguard. peça", value: orders.filter((order) => order.status === "waiting_parts").length },
      { label: "Prontas", value: orders.filter((order) => order.status === "completed").length },
    ];

    return {
      faturamentoMes,
      lucroLiquido,
      custosDespesas,
      backlogFinanceiro,
      osAbertas,
      osEmAndamento,
      osFinalizadasPagas,
      tempoMedioDias,
      slaCumprido,
      revenueData: revenueBase,
      statusData,
    };
  }, [activeCashEntries, cashEntries, expenses, orderAmountById, orders]);

  if (!hydrated) return <DashboardSkeleton />;

  const personalizeButton = (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-xl border-slate-200 bg-white">
          <SlidersHorizontal className="h-4 w-4" />
          Personalizar dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Preferências do dashboard</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.showQuickActions}
              onChange={(event) => setPreferences((prev) => ({ ...prev, showQuickActions: event.target.checked }))}
            />
            Ações rápidas
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.showFinancialKpis}
              onChange={(event) => setPreferences((prev) => ({ ...prev, showFinancialKpis: event.target.checked }))}
            />
            KPIs financeiros
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.showCharts}
              onChange={(event) => setPreferences((prev) => ({ ...prev, showCharts: event.target.checked }))}
            />
            Gráficos
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={preferences.showOperationalKpis}
              onChange={(event) => setPreferences((prev) => ({ ...prev, showOperationalKpis: event.target.checked }))}
            />
            KPIs operacionais
          </label>
          <label className="inline-flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={preferences.compactDensity}
              onChange={(event) => setPreferences((prev) => ({ ...prev, compactDensity: event.target.checked }))}
            />
            Densidade compacta
          </label>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setPreferences(defaultPreferences)}>
            Restaurar padrão
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className={preferences.compactDensity ? "space-y-3" : "space-y-4"}>
      {preferences.showQuickActions ? (
        <section className="premium-card p-3.5 md:p-4">
          <QuickActions action={personalizeButton} />
        </section>
      ) : (
        <section className="flex justify-end">{personalizeButton}</section>
      )}

      {preferences.showFinancialKpis ? (
        <FinancialKpis
          faturamentoMes={metrics.faturamentoMes}
          lucroLiquido={metrics.lucroLiquido}
          custosDespesas={metrics.custosDespesas}
          backlogFinanceiro={metrics.backlogFinanceiro}
        />
      ) : null}

      {preferences.showCharts ? <ChartsSection revenueData={metrics.revenueData} statusData={metrics.statusData} /> : null}

      {preferences.showOperationalKpis ? (
        <OperationalKpis
          osAbertas={metrics.osAbertas}
          osEmAndamento={metrics.osEmAndamento}
          osFinalizadasPagas={metrics.osFinalizadasPagas}
          tempoMedioDias={metrics.tempoMedioDias}
          slaCumprido={metrics.slaCumprido}
        />
      ) : null}
    </div>
  );
}
