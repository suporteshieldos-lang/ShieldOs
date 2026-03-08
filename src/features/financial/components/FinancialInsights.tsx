import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/store/appStore";

function InsightBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium text-[#374151]">{label}</p>
        <p className="text-[#6B7280]">{formatCurrency(value)} ({percent}%)</p>
      </div>
      <div className="h-2 rounded-full bg-[#E5E7EB]">
        <div className="h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function FinancialInsights({ serviceRevenue, productRevenue }: { serviceRevenue: number; productRevenue: number }) {
  const total = serviceRevenue + productRevenue;

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="premium-block p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Receita por serviços</h3>
        <div className="mt-4">
          <InsightBar label="Serviços" value={serviceRevenue} total={total} color="#2563EB" />
        </div>
      </Card>
      <Card className="premium-block p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Receita por produtos</h3>
        <div className="mt-4">
          <InsightBar label="Produtos" value={productRevenue} total={total} color="#1D4ED8" />
        </div>
      </Card>
    </section>
  );
}
