import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "./Avatar";
import { StatusBadge } from "./StatusBadge";
import { TableActionsDropdown } from "./TableActionsDropdown";

export type ClientRow = {
  id: string;
  name: string;
  phone: string;
  cpf: string;
  lastVisit: string;
  totalOrders: number;
  totalSpent: number;
  status: "active" | "inactive";
};

type ClientsTableProps = {
  rows: ClientRow[];
  loading: boolean;
  view: "list" | "cards";
  onView: (customer: ClientRow) => void;
  onEdit: (customer: ClientRow) => void;
  onNewOrder: (customer: ClientRow) => void;
  onHistory: (customer: ClientRow) => void;
  formatCurrency: (value: number) => string;
  onCreateFirst?: () => void;
};

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "Não informado";
  if (digits.length >= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  if (digits.length >= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  return phone;
}

function EmptyState({ onCreateFirst }: { onCreateFirst?: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-white py-14 text-center">
      <Users className="mx-auto mb-3 h-10 w-10 text-[#9CA3AF]" />
      <p className="text-sm font-medium text-[#111827]">Nenhum cliente cadastrado</p>
      {onCreateFirst ? (
        <button
          type="button"
          onClick={onCreateFirst}
          className="mt-4 inline-flex items-center rounded-[10px] bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-[#1D4ED8]"
        >
          + Adicionar primeiro cliente
        </button>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function CardsGrid({ rows, onView, formatCurrency }: { rows: ClientRow[]; onView: (customer: ClientRow) => void; formatCurrency: (value: number) => string }) {
  return (
    <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
      {rows.map((customer) => (
        <article
          key={customer.id}
          className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_4px_10px_rgba(0,0,0,0.05)] transition-all duration-200 hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.15)]"
        >
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={customer.name} />
            <h3 className="text-base font-semibold text-[#111827]">{customer.name}</h3>
          </div>
          <p className="text-sm text-[#6B7280]">Última OS: {customer.totalOrders > 0 ? customer.lastVisit : "Sem OS"}</p>
          <p className="mt-1 text-sm text-[#6B7280]">{formatPhone(customer.phone)}</p>
          <p className="mt-1 text-xs text-[#6B7280]">{customer.cpf || "CPF não informado"}</p>
          <div className="mt-4 flex items-center justify-between">
            <StatusBadge status={customer.status} />
            <span className="text-base font-semibold text-[#111827]">{formatCurrency(customer.totalSpent)}</span>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-[10px] border border-[#E5E7EB] bg-white py-2 text-sm font-medium text-[#111827] transition-all duration-150 hover:bg-[#F9FAFB]"
            onClick={() => onView(customer)}
          >
            Ver cliente
          </button>
        </article>
      ))}
    </section>
  );
}

export function ClientsTable({
  rows,
  loading,
  view,
  onView,
  onEdit,
  onNewOrder,
  onHistory,
  formatCurrency,
  onCreateFirst,
}: ClientsTableProps) {
  if (loading) return <LoadingState />;
  if (!rows.length) return <EmptyState onCreateFirst={onCreateFirst} />;

  return (
    <>
      <div className="md:hidden">
        <CardsGrid rows={rows} onView={onView} formatCurrency={formatCurrency} />
      </div>

      <div className="hidden md:block">
        {view === "cards" ? (
          <CardsGrid rows={rows} onView={onView} formatCurrency={formatCurrency} />
        ) : (
          <section className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9FAFB]">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Cliente</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Telefone</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Última OS</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Total gasto</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((customer) => (
                    <tr key={customer.id} className="border-t border-[#E5E7EB] transition-all duration-150 hover:bg-[#F9FAFB]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={customer.name} />
                          <span className="font-medium text-[#111827]">{customer.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[#6B7280]">{formatPhone(customer.phone)}</td>
                      <td className="px-4 py-3.5 text-sm text-[#6B7280]">{customer.totalOrders > 0 ? customer.lastVisit : "-"}</td>
                      <td className="px-4 py-3.5 text-right text-sm font-semibold text-[#111827]">{formatCurrency(customer.totalSpent)}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={customer.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <TableActionsDropdown
                          onView={() => onView(customer)}
                          onEdit={() => onEdit(customer)}
                          onNewOrder={() => onNewOrder(customer)}
                          onHistory={() => onHistory(customer)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
