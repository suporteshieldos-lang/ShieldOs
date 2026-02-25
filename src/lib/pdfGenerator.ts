import jsPDF from "jspdf";
import logoUrl from "@/assets/logo.jpeg";
import { RepairOrder, getChecklistItems, CompanyInfo } from "@/store/appStore";

const NAVY = [30, 58, 95] as const;
const GRAY = [110, 120, 135] as const;
const DARK = [35, 45, 60] as const;
const LIGHT = [245, 247, 250] as const;

let logoDataUrl: string | null = null;

async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function imageFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

export async function generateRepairOrderPDF(order: RepairOrder, responsibilityTerm: string, companyInfo: CompanyInfo) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  if (!logoDataUrl) {
    logoDataUrl = await loadLogo();
  }

  const drawFooter = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 10, pageW, 10, "F");
    doc.setTextColor(220, 230, 240);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("ShieldOS - Ordem de Serviço", pageW / 2, pageH - 4, { align: "center" });
  };

  const drawSectionTitle = (title: string, y: number) => {
    doc.setFillColor(...NAVY);
    doc.roundedRect(10, y, pageW - 20, 7, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, 12, y + 4.8);
  };

  const drawLabel = (label: string, value: string, x: number, y: number) => {
    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(label, x, y);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(value || "-", x, y + 3.8);
  };

  const deviceLabel =
    order.deviceType === "phone"
      ? "Smartphone"
      : order.deviceType === "notebook"
        ? "Notebook"
        : order.deviceType === "printer"
          ? "Impressora"
          : "Tablet";
  const checklistItems = getChecklistItems(order.deviceType);

  // Page 1
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 24, "F");

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", 10, 3, 16, 16);
    } catch {
      // ignored
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(companyInfo.name || "Assistência Técnica", 30, 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(companyInfo.address || "-", 30, 13);
  doc.text(`Tel: ${companyInfo.phone || "-"} | Email: ${companyInfo.email || "-"}`, 30, 16.8);
  if (companyInfo.cnpj) {
    doc.text(`CNPJ: ${companyInfo.cnpj}`, 30, 20.3);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(order.id, pageW - 10, 9, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Data: ${order.date}`, pageW - 10, 14, { align: "right" });

  let y = 28;
  drawSectionTitle("CLIENTE", y);
  y += 11;
  drawLabel("Nome", order.customerName, 10, y);
  drawLabel("CPF", order.customerCpf || "-", 105, y);
  y += 8;
  drawLabel("Telefone", order.customerPhone, 10, y);
  drawLabel("E-mail", order.customerEmail || "-", 105, y);

  y += 10;
  drawSectionTitle("DISPOSITIVO", y);
  y += 11;
  drawLabel("Tipo", deviceLabel, 10, y);
  drawLabel("Marca", order.brand, 55, y);
  drawLabel("Modelo", order.model, 100, y);
  drawLabel("Cor", order.deviceColor || "-", 155, y);
  y += 8;
  drawLabel("IMEI / Série", order.serialImei || "-", 10, y);
  drawLabel("Senha", order.devicePassword || "Não informada", 80, y);
  drawLabel("Acessórios", order.accessories || "-", 140, y);

  y += 10;
  drawSectionTitle("PROBLEMA E FINANCEIRO", y);
  y += 10;
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Problema", 10, y);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const problemLines = doc.splitTextToSize(order.reportedProblem || "-", 125);
  doc.text(problemLines.slice(0, 3), 10, y + 4);
  drawLabel("Técnico", order.technician || "-", 140, y);
  drawLabel("Valor", order.cost || "-", 140, y + 8);

  y += 18;
  drawSectionTitle("CHECKLIST DE ENTRADA", y);
  y += 10;
  const colWidth = (pageW - 20) / 2;
  checklistItems.slice(0, 14).forEach((item, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const x = 10 + col * colWidth;
    const cy = y + row * 5;
    const ok = !!order.checklist[item];
    doc.setTextColor(ok ? 35 : 200, ok ? 150 : 60, ok ? 90 : 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(ok ? "OK" : "X", x, cy);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.text(item, x + 6, cy);
  });
  if (checklistItems.length > 14) {
    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.text(`+ ${checklistItems.length - 14} itens no sistema`, 10, y + 37);
  }

  y = 175;
  drawSectionTitle("REGISTRO FOTOGRÁFICO (ENTRADA X SAÍDA)", y);
  y += 9;

  doc.setFillColor(...LIGHT);
  doc.roundedRect(10, y, pageW - 20, 101, 1, 1, "F");
  doc.setDrawColor(220, 225, 232);
  doc.line(pageW / 2, y + 2, pageW / 2, y + 99);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.setFontSize(8);
  doc.text("Fotos de Entrada", 12, y + 6);
  doc.text("Fotos de Saída", pageW / 2 + 2, y + 6);

  const colX = [12, pageW / 2 + 2];
  const colW = pageW / 2 - 14;
  const thumbH = 27;
  const maxThumbs = 3;

  const drawPhotoColumn = (photos: string[], index: 0 | 1) => {
    for (let i = 0; i < maxThumbs; i += 1) {
      const py = y + 9 + i * (thumbH + 3);
      const current = photos[i];
      if (current) {
        try {
          doc.addImage(current, imageFormat(current), colX[index], py, colW, thumbH);
        } catch {
          doc.setDrawColor(180, 185, 195);
          doc.rect(colX[index], py, colW, thumbH);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...GRAY);
          doc.text("Imagem indisponível", colX[index] + colW / 2, py + thumbH / 2, { align: "center" });
        }
      } else {
        doc.setDrawColor(180, 185, 195);
        doc.rect(colX[index], py, colW, thumbH);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        doc.text("Sem foto", colX[index] + colW / 2, py + thumbH / 2, { align: "center" });
      }
    }
    if (photos.length > maxThumbs) {
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(`+${photos.length - maxThumbs} foto(s)`, colX[index], y + 98);
    }
  };

  drawPhotoColumn(order.entryPhotos || [], 0);
  drawPhotoColumn(order.exitPhotos || [], 1);
  drawFooter();

  // Page 2
  doc.addPage();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TERMO DE RESPONSABILIDADE", 10, 11);
  doc.text(order.id, pageW - 10, 11, { align: "right" });

  let termY = 24;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Cliente: ${order.customerName}`, 10, termY);
  doc.text(`CPF: ${order.customerCpf || "Não informado"}`, pageW - 10, termY, { align: "right" });
  termY += 6;

  doc.setDrawColor(205, 215, 225);
  doc.line(10, termY, pageW - 10, termY);
  termY += 6;

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const termLines = doc.splitTextToSize(responsibilityTerm, pageW - 20);
  const maxLines = 52;
  doc.text(termLines.slice(0, maxLines), 10, termY);

  const sigBaseY = 248;
  doc.setDrawColor(140, 150, 165);
  doc.line(15, sigBaseY, pageW / 2 - 10, sigBaseY);
  doc.line(pageW / 2 + 10, sigBaseY, pageW - 15, sigBaseY);
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text("Assinatura do Cliente", pageW / 4, sigBaseY + 5, { align: "center" });
  doc.text("Assinatura do Técnico", (pageW * 3) / 4, sigBaseY + 5, { align: "center" });
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.text(order.customerName, pageW / 4, sigBaseY + 9, { align: "center" });
  doc.text(order.technician || "Técnico responsável", (pageW * 3) / 4, sigBaseY + 9, { align: "center" });
  drawFooter();

  doc.save(`${order.id}_${order.customerName.replace(/\s+/g, "_")}.pdf`);
}
