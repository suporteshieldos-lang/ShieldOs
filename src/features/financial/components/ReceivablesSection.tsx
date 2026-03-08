import { CheckCircle2, MessageCircle, MoreVertical, PlusCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ReceivableRow } from "@/features/financial/types";
import { formatCurrency } from "@/store/appStore";

export function ReceivablesSection({
  receivablesAging,
  receivablesTotals,
  agingBadgeClass,
  onNewReceivable,
  onChargeAllOverdue,
  onOpenRecord,
  onMarkAsPaid,
  onOpenCharge,
  onDelete,
}: {
  receivablesAging: ReceivableRow[];
  receivablesTotals: { overdue: number; dueToday: number; total: number };
  agingBadgeClass: (daysLate: number) => string;
  onNewReceivable: () => void;
  onChargeAllOverdue: () => void;
  onOpenRecord: (row: ReceivableRow) => void;
  onMarkAsPaid: (row: ReceivableRow) => void;
  onOpenCharge: (row: ReceivableRow) => void;
  onDelete: (row: ReceivableRow) => void;
}) {
  return (
    <section className="glass-card rounded-xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">Recebíveis (aging)</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onNewReceivable}>
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Novo recebível
          </Button>
          <Button size="sm" variant="outline" onClick={onChargeAllOverdue}>
            Enviar cobrança em lote
          </Button>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-red-700">Total em atraso</p>
          <p className="text-lg font-semibold text-red-800">{formatCurrency(receivablesTotals.overdue)}</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-yellow-700">Vencendo hoje</p>
          <p className="text-lg font-semibold text-yellow-800">{formatCurrency(receivablesTotals.dueToday)}</p>
        </div>
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-violet-700">Total a receber</p>
          <p className="text-lg font-semibold text-violet-800">{formatCurrency(receivablesTotals.total)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="min-w-[840px] w-full table-fixed text-sm">
          <thead>
            <tr className="bg-muted/25 text-left">
              <th className="w-[28%] px-3 py-2">Cliente</th>
              <th className="w-[12%] px-3 py-2">Ref.</th>
              <th className="w-[16%] px-3 py-2">Valor</th>
              <th className="w-[14%] px-3 py-2">Dias em atraso</th>
              <th className="w-[150px] px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {receivablesAging.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-muted-foreground" colSpan={5}>
                  Nenhum recebível pendente.
                </td>
              </tr>
            ) : (
              receivablesAging.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-border/60 transition-colors hover:bg-muted/20"
                  onClick={() => onOpenRecord(row)}
                >
                  <td className="px-3 py-2">{row.customer}</td>
                  <td className="px-3 py-2 font-medium">{row.reference}</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(row.value)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex min-w-9 justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${agingBadgeClass(row.daysLate)}`}>
                      {row.daysLate}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        title="Marcar como pago"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsPaid(row);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="h-8 w-8"
                        title="Cobrar no WhatsApp"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCharge(row);
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" title="Mais ações" onClick={(e) => e.stopPropagation()}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(row);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir recebível
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
