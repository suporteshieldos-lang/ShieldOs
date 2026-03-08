import { CombinedCashEntry } from "@/features/financial/selectors";
import { ReceivableRow } from "@/features/financial/types";
import { formatBrDate } from "@/features/financial/selectors";
import { formatCurrency } from "@/store/appStore";

type AgingBucket = { label: string; count: number; amount: number };

export function FinancialHealthPanels({ receivables, entries }: { receivables: ReceivableRow[]; entries: CombinedCashEntry[] }) {
  const aging: AgingBucket[] = [
    {
      label: "0-30 dias",
      count: receivables.filter((r) => r.daysLate >= 0 && r.daysLate <= 30).length,
      amount: receivables.filter((r) => r.daysLate >= 0 && r.daysLate <= 30).reduce((s, r) => s + r.value, 0),
    },
    {
      label: "31-60 dias",
      count: receivables.filter((r) => r.daysLate >= 31 && r.daysLate <= 60).length,
      amount: receivables.filter((r) => r.daysLate >= 31 && r.daysLate <= 60).reduce((s, r) => s + r.value, 0),
    },
    {
      label: "61-90 dias",
      count: receivables.filter((r) => r.daysLate >= 61 && r.daysLate <= 90).length,
      amount: receivables.filter((r) => r.daysLate >= 61 && r.daysLate <= 90).reduce((s, r) => s + r.value, 0),
    },
    {
      label: "+90 dias",
      count: receivables.filter((r) => r.daysLate > 90).length,
      amount: receivables.filter((r) => r.daysLate > 90).reduce((s, r) => s + r.value, 0),
    },
  ];

  const nextDue = receivables
    .filter((r) => r.daysLate === 0)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, 5);

  const topDebtors = Array.from(
    receivables
      .filter((r) => r.daysLate > 0)
      .reduce((map, row) => {
        const prev = map.get(row.customer) || 0;
        map.set(row.customer, prev + row.value);
        return map;
      }, new Map<string, number>())
      .entries()
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const byMethod = Array.from(
    entries
      .filter((e) => e.type === "entrada")
      .reduce((map, entry) => {
        const method = entry.paymentMethod || "outro";
        map.set(method, (map.get(method) || 0) + entry.amount);
        return map;
      }, new Map<string, number>())
      .entries()
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalByMethod = byMethod.reduce((s, [, value]) => s + value, 0);

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="premium-block p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Aging de recebíveis</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {aging.map((bucket) => (
            <div key={bucket.label} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
              <p className="text-xs text-[#6B7280]">{bucket.label}</p>
              <p className="mt-1 text-lg font-semibold text-[#111827]">{bucket.count}</p>
              <p className="text-xs text-[#6B7280]">{formatCurrency(bucket.amount)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="premium-block p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Próximos vencimentos</h3>
        <div className="mt-3 space-y-2">
          {nextDue.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Sem contas previstas para os próximos dias.</p>
          ) : (
            nextDue.map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#111827]">{row.customer}</p>
                  <p className="text-xs text-[#6B7280]">{formatBrDate(row.dueDate)}</p>
                </div>
                <p className="text-sm font-semibold text-[#111827]">{formatCurrency(row.value)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="premium-block p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Top inadimplentes</h3>
        <div className="mt-3 space-y-2">
          {topDebtors.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Sem inadimplência no período.</p>
          ) : (
            topDebtors.map(([customer, amount]) => (
              <div key={customer} className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2">
                <p className="truncate text-sm font-medium text-[#111827]">{customer}</p>
                <p className="text-sm font-semibold text-[#B91C1C]">{formatCurrency(amount)}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="premium-block p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Métodos de pagamento</h3>
        <div className="mt-3 space-y-3">
          {byMethod.length === 0 ? (
            <p className="text-sm text-[#6B7280]">Sem entradas registradas no período.</p>
          ) : (
            byMethod.map(([method, amount]) => {
              const percent = totalByMethod > 0 ? Math.round((amount / totalByMethod) * 100) : 0;
              return (
                <div key={method}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-[#374151]">{method}</span>
                    <span className="text-[#6B7280]">{formatCurrency(amount)} ({percent}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E5E7EB]">
                    <div className="h-2 rounded-full bg-[#2563EB]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
