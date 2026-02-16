import jsPDF from "jspdf";
import { RepairOrder, getChecklistItems } from "@/store/appStore";

const NAVY = [30, 58, 95] as const;
const CYAN = [45, 180, 200] as const;
const GRAY = [120, 130, 145] as const;
const DARK = [30, 40, 55] as const;
const LIGHT_BG = [245, 247, 250] as const;

export function generateRepairOrderPDF(order: RepairOrder, responsibilityTerm: string) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  const drawLine = (yPos: number) => {
    doc.setDrawColor(...NAVY);
    doc.setLineWidth(0.3);
    doc.line(15, yPos, pageW - 15, yPos);
  };

  const sectionTitle = (title: string) => {
    y += 6;
    doc.setFillColor(...NAVY);
    doc.roundedRect(15, y, pageW - 30, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 18, y + 5.5);
    y += 13;
  };

  const addField = (label: string, value: string, x: number, w: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(value || "—", x, y + 4.5);
  };

  const checkPage = (needed: number) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 15;
    }
  };

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("ShieldOS", 15, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 220);
  doc.text("Sistema de Gestão de Assistência Técnica", 15, 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(order.id, pageW - 15, 14, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${order.date}`, pageW - 15, 21, { align: "right" });

  y = 35;

  // ORDEM DE SERVIÇO title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text("ORDEM DE SERVIÇO", pageW / 2, y, { align: "center" });
  y += 4;
  drawLine(y);

  // Cliente
  sectionTitle("DADOS DO CLIENTE");
  addField("Nome", order.customerName, 15, 80);
  addField("CPF", order.customerCpf, 105, 50);
  addField("Telefone", order.customerPhone, 160, 40);
  y += 10;
  addField("E-mail", order.customerEmail, 15, 80);
  y += 10;

  // Dispositivo
  sectionTitle("DADOS DO DISPOSITIVO");
  const deviceLabel = order.deviceType === "phone" ? "Smartphone" : order.deviceType === "notebook" ? "Notebook" : "Tablet";
  addField("Tipo", deviceLabel, 15, 40);
  addField("Marca", order.brand, 60, 40);
  addField("Modelo", order.model, 105, 50);
  addField("Cor", order.deviceColor, 160, 35);
  y += 10;
  addField("IMEI / Nº de Série", order.serialImei, 15, 60);
  addField("Senha", order.devicePassword || "Não informada", 85, 40);
  addField("Acessórios", order.accessories, 130, 65);
  y += 10;
  if (order.conditionNotes) {
    addField("Estado do aparelho", order.conditionNotes, 15, pageW - 30);
    y += 10;
  }

  // Checklist
  checkPage(50);
  sectionTitle("CHECKLIST DE ENTRADA");
  const items = getChecklistItems(order.deviceType);
  const colW = (pageW - 30) / 2;
  items.forEach((item, i) => {
    if (i > 0 && i % 2 === 0) y += 6;
    checkPage(8);
    const x = 15 + (i % 2) * colW;
    const checked = order.checklist[item];
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    if (checked) {
      doc.setTextColor(40, 160, 100);
      doc.text("✓", x, y);
    } else {
      doc.setTextColor(220, 60, 60);
      doc.text("✗", x, y);
    }
    doc.setTextColor(...DARK);
    doc.text(item, x + 5, y);
  });
  if (items.length % 2 !== 0) y += 6;
  y += 4;

  // Problema
  checkPage(30);
  sectionTitle("PROBLEMA RELATADO");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  const problemLines = doc.splitTextToSize(order.reportedProblem, pageW - 30);
  doc.text(problemLines, 15, y);
  y += problemLines.length * 5 + 4;

  if (order.technician || order.cost || order.estimatedDelivery) {
    checkPage(15);
    addField("Técnico", order.technician, 15, 60);
    addField("Valor", order.cost, 85, 40);
    addField("Previsão", order.estimatedDelivery, 135, 50);
    y += 12;
  }

  // Termo de Responsabilidade
  checkPage(60);
  sectionTitle("TERMO DE RESPONSABILIDADE");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  const termLines = doc.splitTextToSize(responsibilityTerm, pageW - 30);
  termLines.forEach((line: string) => {
    checkPage(5);
    doc.text(line, 15, y);
    y += 3.5;
  });
  y += 5;

  // Signature lines
  checkPage(35);
  y += 10;
  drawLine(y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...DARK);

  const sigW = (pageW - 50) / 2;
  // Client signature
  doc.line(15, y + 15, 15 + sigW, y + 15);
  doc.text("Assinatura do Cliente", 15 + sigW / 2, y + 20, { align: "center" });
  doc.text(order.customerName, 15 + sigW / 2, y + 24, { align: "center" });

  // Technician signature
  doc.line(pageW - 15 - sigW, y + 15, pageW - 15, y + 15);
  doc.text("Assinatura do Técnico", pageW - 15 - sigW / 2, y + 20, { align: "center" });
  doc.text(order.technician || "Técnico Responsável", pageW - 15 - sigW / 2, y + 24, { align: "center" });

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...NAVY);
  doc.rect(0, pageH - 10, pageW, 10, "F");
  doc.setFontSize(7);
  doc.setTextColor(180, 200, 220);
  doc.text("ShieldOS • Sistema de Gestão de Assistência Técnica", pageW / 2, pageH - 4, { align: "center" });

  doc.save(`${order.id}_${order.customerName.replace(/\s+/g, "_")}.pdf`);
}
