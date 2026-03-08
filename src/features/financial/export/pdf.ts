import jsPDF from "jspdf";
import { formatCurrency } from "@/store/appStore";
import { formatBrDate, CombinedCashEntry } from "@/features/financial/selectors";

type SnapshotLike = {
  grossRevenue: number;
  totalCostsAndExpenses: number;
  netProfit: number;
  osRevenue: number;
  salesRevenue: number;
  pendingValue: number;
};

export function exportFinancialPdf({
  periodStart,
  periodEnd,
  current,
  combinedCashEntries,
  fileDate,
}: {
  periodStart: Date;
  periodEnd: Date;
  current: SnapshotLike;
  combinedCashEntries: CombinedCashEntry[];
  fileDate: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const contentW = pageW - marginX * 2;

  const drawHeader = () => {
    doc.setFillColor(17, 45, 78);
    doc.rect(0, 0, pageW, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("ShieldOS - Financeiro", marginX, 11.5);
    doc.setFontSize(9.5);
    doc.text(`Periodo: ${formatBrDate(periodStart)} a ${formatBrDate(periodEnd)}`, marginX, 18.5);
    doc.setTextColor(22, 30, 46);
  };

  const drawFooter = (page: number, total: number) => {
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 148);
    doc.text(`Gerado em ${new Date().toLocaleString("pt-BR", { hour12: false })}`, marginX, pageH - 6);
    doc.text(`Pagina ${page}/${total}`, pageW - marginX, pageH - 6, { align: "right" });
    doc.setTextColor(22, 30, 46);
  };

  drawHeader();

  const cards = [
    ["Receita Total", formatCurrency(current.grossRevenue)],
    ["Custos + Despesas", formatCurrency(current.totalCostsAndExpenses)],
    ["Lucro Líquido", formatCurrency(current.netProfit)],
    ["Receita por Serviço (OS)", formatCurrency(current.osRevenue)],
    ["Receita por Produto (Venda Balcão)", formatCurrency(current.salesRevenue)],
    ["OS Pendentes", formatCurrency(current.pendingValue)],
  ] as const;

  const cardW = (contentW - 8) / 2;
  const cardY = 29;
  cards.forEach((card, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = marginX + col * (cardW + 8);
    const y = cardY + row * 17;
    doc.setFillColor(246, 248, 252);
    doc.roundedRect(x, y, cardW, 14, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, cardW, 14, 2, 2, "S");
    doc.setFontSize(8.5);
    doc.setTextColor(95, 111, 135);
    doc.text(card[0], x + 2.5, y + 4.8);
    doc.setFontSize(11);
    doc.setTextColor(22, 30, 46);
    doc.text(card[1], x + 2.5, y + 10.8);
  });

  const tableTop = 84;
  const colData = marginX + 3;
  const colDesc = marginX + 35;
  const colTipo = marginX + 136;
  const colValor = pageW - marginX - 3;
  const descMaxWidth = colTipo - colDesc - 3;

  const drawTableHeader = (y: number) => {
    doc.setFillColor(233, 238, 246);
    doc.rect(marginX, y, contentW, 8, "F");
    doc.setDrawColor(214, 223, 236);
    doc.rect(marginX, y, contentW, 8, "S");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Data", colData, y + 5.2);
    doc.text("Descrição", colDesc, y + 5.2);
    doc.text("Tipo", colTipo, y + 5.2);
    doc.text("Valor", colValor, y + 5.2, { align: "right" });
    doc.setTextColor(22, 30, 46);
    return y + 8;
  };

  let y = drawTableHeader(tableTop);
  const rows = combinedCashEntries.slice(0, 140);
  rows.forEach((entry, idx) => {
    const typeLabel = entry.type === "entrada" ? "Entrada" : "Saida";
    const valueLabel = `${entry.type === "entrada" ? "+" : "-"}${formatCurrency(entry.amount)}`;
    const descText = entry.description || "-";
    const descLines = doc.splitTextToSize(descText, descMaxWidth) as string[];
    const rowLines = Math.max(1, Math.min(descLines.length, 2));
    const rowH = rowLines * 4.3 + 3.3;

    if (y + rowH > pageH - 14) {
      doc.addPage();
      drawHeader();
      y = drawTableHeader(28);
    }

    if (idx % 2 === 0) {
      doc.setFillColor(250, 252, 255);
      doc.rect(marginX, y, contentW, rowH, "F");
    }
    doc.setDrawColor(234, 239, 247);
    doc.line(marginX, y + rowH, marginX + contentW, y + rowH);

    doc.setFontSize(8.5);
    doc.setTextColor(95, 111, 135);
    doc.text(entry.date, colData, y + 4.8);
    doc.setTextColor(22, 30, 46);
    doc.text(descLines.slice(0, rowLines), colDesc, y + 4.8);
    doc.text(typeLabel, colTipo, y + 4.8);
    doc.text(valueLabel, colValor, y + 4.8, { align: "right" });
    y += rowH;
  });

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(page, totalPages);
  }

  doc.save(`financeiro-${fileDate}.pdf`);
}
