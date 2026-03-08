type CustomerStatus = "active" | "inactive";

const labels: Record<CustomerStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

const styles: Record<CustomerStatus, string> = {
  active: "bg-[#DCFCE7] text-[#166534]",
  inactive: "bg-[#FEF3C7] text-[#92400E]",
};

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{labels[status]}</span>;
}
