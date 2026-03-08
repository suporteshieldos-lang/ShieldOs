export type FinanceStatus = "paid" | "pending" | "overdue";

const statusStyles: Record<FinanceStatus, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};

const statusLabel: Record<FinanceStatus, string> = {
  paid: "Pago",
  pending: "Pendente",
  overdue: "Atrasado",
};

export function StatusBadge({ status }: { status: FinanceStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {statusLabel[status]}
    </span>
  );
}
