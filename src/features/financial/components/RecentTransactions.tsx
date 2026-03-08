import { CombinedCashEntry } from "@/features/financial/selectors";
import { paymentMethodLabels } from "@/features/financial/constants";
import { formatCurrency } from "@/store/appStore";

export function RecentTransactions({ entries }: { entries: CombinedCashEntry[] }) {
  const recent = entries.slice(0, 5);

  return (
    <section className="premium-block p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Atividade recente</h3>
        <span className="text-xs text-[#6B7280]">Ultimas 5 movimentacoes</span>
      </div>

      <div className="space-y-2">
        {recent.length === 0 ? (
          <p className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-6 text-center text-sm text-[#6B7280]">
            Nenhuma movimentacao recente.
          </p>
        ) : (
          recent.map((entry) => (
            <article
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#111827]">{entry.description}</p>
                <p className="text-xs text-[#6B7280]">
                  {entry.date} - {entry.paymentMethod ? paymentMethodLabels[entry.paymentMethod] : "Sem metodo"}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-semibold ${entry.type === "entrada" ? "text-emerald-600" : "text-red-500"}`}>
                {entry.type === "entrada" ? "+" : "-"}
                {formatCurrency(entry.amount)}
              </p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
