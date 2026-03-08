import { useMemo, useState } from "react";
import { ArrowUpDown, CheckCircle2, Eye, MessageCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/store/appStore";
import type { PaymentMethod } from "@/store/appStore";
import type { ReceivableRow } from "@/features/financial/types";

type SortKey = "customer" | "reference" | "value" | "dueDate" | "daysLate" | "status";
type SortDir = "asc" | "desc";

function statusStyle(status?: ReceivableRow["status"]) {
  if (status === "pago") return "bg-emerald-100 text-emerald-700";
  if (status === "a_vencer") return "bg-blue-100 text-blue-700";
  if (status === "vence_hoje") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function statusLabel(status?: ReceivableRow["status"]) {
  if (status === "pago") return "Pago";
  if (status === "a_vencer") return "A vencer";
  if (status === "vence_hoje") return "Vence hoje";
  return "Atrasado";
}

function paymentMethodLabel(method?: PaymentMethod) {
  if (!method) return "-";
  if (method === "debito") return "Debito";
  if (method === "credito") return "Credito";
  if (method === "dinheiro") return "Dinheiro";
  if (method === "cartao") return "Cartao";
  if (method === "pix") return "Pix";
  return "Outro";
}

export function ReceivablesTable({
  rows,
  total,
  search,
  quickFilter,
  periodFilter,
  customerFilter,
  technicianFilter,
  methodFilter,
  customerOptions,
  technicianOptions,
  methodOptions,
  onSearchChange,
  onQuickFilterChange,
  onPeriodFilterChange,
  onCustomerFilterChange,
  onTechnicianFilterChange,
  onMethodFilterChange,
  selectedIds,
  allSelected,
  onToggleSelect,
  onToggleSelectAll,
  onMarkSelected,
  onExportSelected,
  onMarkAsPaid,
  onCharge,
  onView,
  onDelete,
}: {
  rows: ReceivableRow[];
  total: number;
  search: string;
  quickFilter: "todos" | "atrasados" | "vence_hoje" | "proximos_7" | "pagos";
  periodFilter: "todos" | "hoje" | "7dias" | "30dias";
  customerFilter: string;
  technicianFilter: string;
  methodFilter: "todos" | PaymentMethod;
  customerOptions: string[];
  technicianOptions: string[];
  methodOptions: PaymentMethod[];
  onSearchChange: (value: string) => void;
  onQuickFilterChange: (value: "todos" | "atrasados" | "vence_hoje" | "proximos_7" | "pagos") => void;
  onPeriodFilterChange: (value: "todos" | "hoje" | "7dias" | "30dias") => void;
  onCustomerFilterChange: (value: string) => void;
  onTechnicianFilterChange: (value: string) => void;
  onMethodFilterChange: (value: "todos" | PaymentMethod) => void;
  selectedIds: Set<string>;
  allSelected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onMarkSelected: () => void;
  onExportSelected: () => void;
  onMarkAsPaid: (row: ReceivableRow) => void;
  onCharge: (row: ReceivableRow) => void;
  onView: (row: ReceivableRow) => void;
  onDelete: (row: ReceivableRow) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const selectedCount = selectedIds.size;

  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const direction = sortDir === "asc" ? 1 : -1;
      if (sortKey === "customer") return a.customer.localeCompare(b.customer) * direction;
      if (sortKey === "reference") return a.reference.localeCompare(b.reference) * direction;
      if (sortKey === "value") return (a.value - b.value) * direction;
      if (sortKey === "dueDate") return (a.dueDate.getTime() - b.dueDate.getTime()) * direction;
      if (sortKey === "daysLate") return (a.daysLate - b.daysLate) * direction;
      return statusLabel(a.status).localeCompare(statusLabel(b.status)) * direction;
    });
    return list;
  }, [rows, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedRows = useMemo(
    () => sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [sortedRows, currentPage]
  );

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((v) => (v === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <Card className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar cliente, telefone ou OS"
          className="h-10 min-w-[220px] flex-1 rounded-lg border border-[#E2E8F0] bg-white px-3 text-sm text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        />
        <Button variant={quickFilter === "todos" ? "default" : "outline"} onClick={() => onQuickFilterChange("todos")}>Todos</Button>
        <Button variant={quickFilter === "atrasados" ? "default" : "outline"} onClick={() => onQuickFilterChange("atrasados")}>Atrasados</Button>
        <Button variant={quickFilter === "vence_hoje" ? "default" : "outline"} onClick={() => onQuickFilterChange("vence_hoje")}>Vence hoje</Button>
        <Button variant={quickFilter === "proximos_7" ? "default" : "outline"} onClick={() => onQuickFilterChange("proximos_7")}>7 dias</Button>
        <Button variant={quickFilter === "pagos" ? "default" : "outline"} onClick={() => onQuickFilterChange("pagos")}>Pagos</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
        <select className="h-10 rounded-lg border border-[#E2E8F0] px-3 text-sm" value={periodFilter} onChange={(e) => onPeriodFilterChange(e.target.value as "todos" | "hoje" | "7dias" | "30dias")}> 
          <option value="todos">Periodo: todos</option>
          <option value="hoje">Periodo: hoje</option>
          <option value="7dias">Periodo: proximos 7 dias</option>
          <option value="30dias">Periodo: proximos 30 dias</option>
        </select>
        <select className="h-10 rounded-lg border border-[#E2E8F0] px-3 text-sm" value={customerFilter} onChange={(e) => onCustomerFilterChange(e.target.value)}>
          <option value="todos">Cliente: todos</option>
          {customerOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-[#E2E8F0] px-3 text-sm" value={technicianFilter} onChange={(e) => onTechnicianFilterChange(e.target.value)}>
          <option value="todos">Tecnico: todos</option>
          {technicianOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-[#E2E8F0] px-3 text-sm" value={methodFilter} onChange={(e) => onMethodFilterChange(e.target.value as "todos" | PaymentMethod)}>
          <option value="todos">Pagamento: todos</option>
          {methodOptions.map((m) => <option key={m} value={m}>{paymentMethodLabel(m)}</option>)}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#64748B]">Exibindo {rows.length} de {total} recebiveis</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-[#E2E8F0]" onClick={onMarkSelected} disabled={selectedCount === 0}>Registrar pagamento</Button>
          <Button variant="outline" className="border-[#E2E8F0]" onClick={onExportSelected} disabled={selectedCount === 0}>Exportar selecionados</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
        <table className="w-full min-w-[1120px] text-sm">
          <thead className="bg-[#F8FAFC] text-left text-[#64748B]">
            <tr>
              <th className="w-10 px-3 py-3"><input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} /></th>
              <th className="px-3 py-3"><button className="inline-flex items-center gap-1" onClick={() => handleSort("customer")}>Cliente <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              <th className="px-3 py-3"><button className="inline-flex items-center gap-1" onClick={() => handleSort("reference")}>Referencia <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              <th className="px-3 py-3">Telefone</th>
              <th className="px-3 py-3">Forma pag.</th>
              <th className="px-3 py-3"><button className="inline-flex items-center gap-1" onClick={() => handleSort("value")}>Valor <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              <th className="px-3 py-3"><button className="inline-flex items-center gap-1" onClick={() => handleSort("dueDate")}>Vencimento <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              <th className="px-3 py-3"><button className="inline-flex items-center gap-1" onClick={() => handleSort("daysLate")}>Dias atraso <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              <th className="px-3 py-3"><button className="inline-flex items-center gap-1" onClick={() => handleSort("status")}>Status <ArrowUpDown className="h-3.5 w-3.5" /></button></th>
              <th className="px-3 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={row.id} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC]">
                <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => onToggleSelect(row.id)} /></td>
                <td className="px-3 py-3 text-[#0F172A]">{row.customer}</td>
                <td className="px-3 py-3 text-[#64748B]">{row.reference}</td>
                <td className="px-3 py-3 text-[#64748B]">{row.phone || "-"}</td>
                <td className="px-3 py-3 text-[#64748B]">{paymentMethodLabel(row.paymentMethod)}</td>
                <td className="px-3 py-3 font-semibold text-[#0F172A]">{formatCurrency(row.value)}</td>
                <td className="px-3 py-3 text-[#64748B]">{row.dueDate.toLocaleDateString("pt-BR")}</td>
                <td className="px-3 py-3 text-[#64748B]">{row.daysLate}</td>
                <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyle(row.status)}`}>{statusLabel(row.status)}</span></td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={() => onMarkAsPaid(row)}><CheckCircle2 className="h-4 w-4 text-emerald-600" /></Button></TooltipTrigger><TooltipContent>Registrar pagamento</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={() => onCharge(row)}><MessageCircle className="h-4 w-4 text-amber-600" /></Button></TooltipTrigger><TooltipContent>Enviar cobranca WhatsApp</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={() => onView(row)}><Eye className="h-4 w-4 text-[#2563EB]" /></Button></TooltipTrigger><TooltipContent>Ver OS</TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button size="icon" variant="ghost" onClick={() => onDelete(row)}><Trash2 className="h-4 w-4 text-[#EF4444]" /></Button></TooltipTrigger><TooltipContent>Excluir cobranca</TooltipContent></Tooltip>
                  </div>
                </td>
              </tr>
            ))}
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-[#64748B]">Nenhum recebivel encontrado.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" className="border-[#E2E8F0]" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span className="text-sm text-[#64748B]">Pagina {currentPage} de {pageCount}</span>
        <Button variant="outline" className="border-[#E2E8F0]" disabled={currentPage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>Proxima</Button>
      </div>
    </Card>
  );
}
