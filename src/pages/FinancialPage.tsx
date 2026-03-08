import { useMemo, useState } from "react";
import { Download, FilePlus2, FolderOpen, HandCoins, PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FinancialKPIs } from "@/features/financial/components/FinancialKpis";
import { FinancialChart } from "@/features/financial/components/FinancialChart";
import { ReceivablesTable } from "@/features/financial/components/ReceivablesTable";
import { NewReceivableDialog } from "@/features/financial/components/NewReceivableDialog";
import { useFinancialData } from "@/features/financial/hooks/useFinancialData";
import { formatBrDate } from "@/features/financial/selectors";
import { formatCurrency } from "@/store/appStore";
import type { ReceivableRow } from "@/features/financial/types";

function WidgetList({ title, rows, currency = true }: { title: string; rows: Array<{ label: string; value: number }>; currency?: boolean }) {
  return (
    <Card className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-[#0F172A]">{title}</p>
      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-[#64748B]">Sem dados no periodo.</p>
        ) : (
          rows.map((item, index) => (
            <div key={`${title}-${index}`} className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
              <p className="truncate pr-3 text-sm text-[#0F172A]">{item.label}</p>
              <p className="text-sm font-semibold text-[#0F172A]">{currency ? formatCurrency(item.value) : item.value}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export default function FinancialPage() {
  const navigate = useNavigate();
  const [detailsRow, setDetailsRow] = useState<ReceivableRow | null>(null);
  const [newChargeOpen, setNewChargeOpen] = useState(false);

  const { loading, mainKpis, operationalKpis, charts, widgets, table, actions } = useFinancialData();

  const detailsStatus = useMemo(() => {
    if (!detailsRow) return "-";
    if (detailsRow.daysLate > 0) return "Atrasado";
    if (detailsRow.status === "vence_hoje") return "Vence hoje";
    return "A vencer";
  }, [detailsRow]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-4 md:px-6">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
        <Skeleton className="h-[320px] w-full rounded-xl" />
        <Skeleton className="h-[380px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8 px-4 py-4 md:px-6">
      <section className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" className="border-[#E2E8F0]" onClick={() => navigate("/ordens/nova")}><FilePlus2 className="h-4 w-4" />Nova OS</Button>
        <Button variant="outline" className="border-[#E2E8F0]" onClick={() => setNewChargeOpen(true)}><PlusCircle className="h-4 w-4" />Nova cobranca</Button>
        <Button variant="outline" className="border-[#E2E8F0]" onClick={table.markSelectedAsPaid}><HandCoins className="h-4 w-4" />Registrar pagamento</Button>
        <Button variant="outline" className="border-[#E2E8F0]" onClick={table.exportSelected}><Download className="h-4 w-4" />Exportar relatorio</Button>
        <Button className="bg-[#0F2747] text-white hover:bg-[#1E3A5F]" onClick={() => navigate("/caixa")}><FolderOpen className="h-4 w-4" />Abrir caixa</Button>
      </section>

      <FinancialKPIs main={mainKpis} operational={operationalKpis} />

      <FinancialChart
        cashFlow={charts.cashFlow30}
        dailyRevenue={charts.dailyRevenueBars}
        origin={charts.revenueOrigin}
        technicians={charts.technicianRanking}
      />

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <WidgetList title="Top clientes do mes" rows={widgets.topCustomers} />
        <WidgetList title="Clientes inadimplentes" rows={widgets.delinquentCustomers} />
        <WidgetList title="Pecas mais vendidas" rows={widgets.topParts} currency={false} />
        <WidgetList title="Servicos mais realizados" rows={widgets.topServices} currency={false} />
      </section>

      <ReceivablesTable
        rows={table.rows}
        total={table.total}
        search={table.search}
        quickFilter={table.quickFilter}
        periodFilter={table.periodFilter}
        customerFilter={table.customerFilter}
        technicianFilter={table.technicianFilter}
        methodFilter={table.methodFilter}
        customerOptions={table.customerOptions}
        technicianOptions={table.technicianOptions}
        methodOptions={table.methodOptions}
        onSearchChange={table.setSearch}
        onQuickFilterChange={table.setQuickFilter}
        onPeriodFilterChange={table.setPeriodFilter}
        onCustomerFilterChange={table.setCustomerFilter}
        onTechnicianFilterChange={table.setTechnicianFilter}
        onMethodFilterChange={table.setMethodFilter}
        selectedIds={table.selectedIds}
        allSelected={table.allVisibleSelected}
        onToggleSelect={table.toggleSelect}
        onToggleSelectAll={table.toggleSelectAll}
        onMarkSelected={table.markSelectedAsPaid}
        onExportSelected={table.exportSelected}
        onMarkAsPaid={(row) => {
          table.onMarkAsPaid(row);
          toast.success("Pagamento registrado.");
        }}
        onCharge={table.onCharge}
        onView={setDetailsRow}
        onDelete={(row) => {
          table.onDelete(row);
          toast.success("Cobranca excluida.");
        }}
      />

      <Dialog open={detailsRow !== null} onOpenChange={(open) => !open && setDetailsRow(null)}>
        <DialogContent className="max-w-xl border-[#E2E8F0]">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A]">Detalhes da cobranca</DialogTitle>
          </DialogHeader>
          {detailsRow ? (
            <div className="space-y-3 text-sm text-[#0F172A]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#64748B]">Cliente</p>
                  <p className="font-medium">{detailsRow.customer}</p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                  <p className="text-xs text-[#64748B]">Valor</p>
                  <p className="font-semibold">{formatCurrency(detailsRow.value)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-[#E2E8F0] p-3">
                  <p className="text-xs text-[#64748B]">Referencia</p>
                  <p className="font-medium">{detailsRow.reference}</p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] p-3">
                  <p className="text-xs text-[#64748B]">Vencimento</p>
                  <p className="font-medium">{formatBrDate(detailsRow.dueDate)}</p>
                </div>
                <div className="rounded-lg border border-[#E2E8F0] p-3">
                  <p className="text-xs text-[#64748B]">Status</p>
                  <p className="font-medium">{detailsStatus}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <NewReceivableDialog
        open={newChargeOpen}
        onOpenChange={setNewChargeOpen}
        customer={actions.newReceivableCustomer}
        setCustomer={actions.setNewReceivableCustomer}
        phone={actions.newReceivablePhone}
        setPhone={actions.setNewReceivablePhone}
        description={actions.newReceivableDescription}
        setDescription={actions.setNewReceivableDescription}
        amount={actions.newReceivableAmount}
        setAmount={actions.setNewReceivableAmount}
        dueDate={actions.newReceivableDueDate}
        setDueDate={actions.setNewReceivableDueDate}
        method={actions.newReceivableMethod}
        setMethod={actions.setNewReceivableMethod}
        onSubmit={() => actions.createManualReceivable(() => setNewChargeOpen(false))}
      />
    </div>
  );
}
