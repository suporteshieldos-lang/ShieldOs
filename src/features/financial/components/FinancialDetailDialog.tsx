import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/store/appStore";

export function FinancialDetailDialog({
  open,
  onClose,
  detailRows,
}: {
  open: boolean;
  onClose: () => void;
  detailRows: Array<{ data: string; Descrição: string; valor: number }>;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhamento financeiro</DialogTitle>
        </DialogHeader>
        {detailRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sem dados para esse indicador.</p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-2 py-2 text-muted-foreground">Data</th>
                  <th className="px-2 py-2 text-muted-foreground">Descrição</th>
                  <th className="px-2 py-2 text-right text-muted-foreground">Valor</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, index) => (
                  <tr key={`${row.data}-${index}`} className="border-b border-border/40">
                    <td className="px-2 py-2 text-muted-foreground">{row.data}</td>
                    <td className="px-2 py-2 text-foreground">{row.Descrição}</td>
                    <td className={`px-2 py-2 text-right font-semibold ${row.valor >= 0 ? "text-success" : "text-destructive"}`}>
                      {row.valor >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(row.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
