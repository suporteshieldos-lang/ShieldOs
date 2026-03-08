import { exportCsvFile } from "@/features/financial/export/csv";
import type { ReceivableRow } from "@/features/financial/types";

export function exportReceivablesCsv(filename: string, rows: ReceivableRow[]) {
  const data: string[][] = [
    ["Cliente", "Referencia", "Valor", "Vencimento", "Dias em atraso"],
    ...rows.map((row) => [
      row.customer,
      row.reference,
      String(row.value / 100),
      row.dueDate.toLocaleDateString("pt-BR"),
      String(row.daysLate),
    ]),
  ];

  exportCsvFile(filename, data);
}
