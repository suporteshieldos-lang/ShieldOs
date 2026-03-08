import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/store/appStore";

export function FinancialAlerts({ overdueCount, overdueAmount }: { overdueCount: number; overdueAmount: number }) {
  if (overdueCount <= 0) return null;

  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-red-700">
        <AlertTriangle className="h-4 w-4" />
        {overdueCount} recebíveis em atraso — {formatCurrency(overdueAmount)}
      </p>
    </section>
  );
}
