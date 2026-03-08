import jsPDF from "jspdf";
import logoUrl from "@/assets/logo.jpeg";
import { RepairOrder, CompanyInfo } from "@/store/appStore";

const NAVY = [30, 58, 95] as const;
const GRAY = [110, 120, 135] as const;
const DARK = [35, 45, 60] as const;

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

function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoneyTextToCents(value: string): number {
  const digits = (value || "").replace(/[^\d]/g, "");
  if (!digits) return 0;
  return Number(digits);
}

function stripLegalTerms(text: string): string {
  if (!text) return "-";
  const cleaned = text
    .replace(/n[aã]o\s+possui\s+garantia[^.]*\.?/gi, "")
    .replace(/sem\s+garantia[^.]*\.?/gi, "")
    .replace(/garantia[^.]*\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || "-";
}

function imageFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

async function normalizePhotoForPdf(dataUrl: string): Promise<string | null> {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const lower = dataUrl.toLowerCase();
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg") || lower.startsWith("data:image/png")) {
    return dataUrl;
  }
  if (!lower.startsWith("data:image/")) return null;

  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width || 1;
        canvas.height = img.naturalHeight || img.height || 1;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

export async function generateRepairOrderPDF(order: RepairOrder, responsibilityTerm: string, companyInfo: CompanyInfo) {
  const doc = new jsPDF("p", "mm", "a4");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentW = pageW - margin * 2;

  if (!logoDataUrl) logoDataUrl = await loadLogo();

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
    doc.roundedRect(margin, y, contentW, 6, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.2);
    doc.text(title, margin + 2, y + 4.1);
  };

  const drawLabel = (label: string, value: string, x: number, y: number) => {
    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.text(label, x, y);
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(value || "-", x, y + 3.4);
  };

  const deviceLabel =
    order.deviceType === "phone"
      ? "Smartphone"
      : order.deviceType === "notebook"
        ? "Notebook"
        : order.deviceType === "printer"
          ? "Impressora"
          : "Tablet";

  const cleanProblem = (order.reportedProblem || "").trim() || "-";
  const serviceExecutedRaw = order.repairActions || order.technicianDiagnosis || "";
  const serviceExecutedClean = stripLegalTerms(serviceExecutedRaw);
  const serviceExecuted = serviceExecutedClean !== "-" ? serviceExecutedClean : "Serviço técnico executado conforme diagnóstico.";

  const serviceValue = order.serviceCost > 0 ? order.serviceCost : parseMoneyTextToCents(order.cost || "");
  const usedParts = order.usedParts || [];
  const partsValue = usedParts.reduce((sum, p) => sum + p.qty * p.unitCost, 0);
  const discountValue = Math.max(0, order.discount);
  const totalValue = Math.max(0, serviceValue + partsValue - discountValue);

  const entryPhotos = order.entryPhotos || [];
  const exitPhotos = order.exitPhotos || [];
  const rawPhotoItems = [
    ...entryPhotos.map((src) => ({ src, label: "Entrada" as const })),
    ...exitPhotos.map((src) => ({ src, label: "Saída" as const })),
  ].slice(0, 3);
  const normalizedPhotoItems: Array<{ src: string; label: "Entrada" | "Saída" }> = [];
  for (const item of rawPhotoItems) {
    const normalized = await normalizePhotoForPdf(item.src);
    if (normalized) normalizedPhotoItems.push({ src: normalized, label: item.label });
  }
  const hasAnyPhoto = normalizedPhotoItems.length > 0;

  // PAGINA 1 - ORDEM DE SERVICO
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 22, "F");
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", margin, 3, 14, 14);
    } catch {
      // ignore
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.1);
  doc.text(companyInfo.name || "Assistência Técnica", margin + 18, 8.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.text(companyInfo.address || "-", margin + 18, 12.1);
  doc.text(`Tel: ${companyInfo.phone || "-"} | E-mail: ${companyInfo.email || "-"}`, margin + 18, 15.3);
  if (companyInfo.cnpj) doc.text(`CNPJ: ${companyInfo.cnpj}`, margin + 18, 18.4);

  const orderCode = order.id || "-";
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("OS Nº", pageW - margin, 8.2, { align: "right" });
  doc.setFontSize(11);
  doc.text(orderCode, pageW - margin, 13.5, { align: "right" });

  let y = 26;

  drawSectionTitle("DADOS DO CLIENTE", y);
  y += 9;
  drawLabel("Nome", order.customerName, margin, y);
  drawLabel("CPF", order.customerCpf || "-", 105, y);
  y += 7;
  drawLabel("Telefone", order.customerPhone, margin, y);
  drawLabel("E-mail", order.customerEmail || "-", 105, y);

  y += 10;
  drawSectionTitle("DADOS DO DISPOSITIVO", y);
  y += 9;
  drawLabel("Tipo", deviceLabel, margin, y);
  drawLabel("Marca", order.brand, 55, y);
  drawLabel("Modelo", order.model, 100, y);
  drawLabel("Cor", order.deviceColor || "-", 155, y);
  y += 7;
  drawLabel("IMEI / Série", order.serialImei || "-", margin, y);
  drawLabel("Senha", order.devicePassword || "Não informada", 80, y);
  drawLabel("Acessórios", order.accessories || "-", 140, y);

  y += 10;
  drawSectionTitle("PROBLEMA RELATADO", y);
  y += 8.5;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.9);
  const problemLines = doc.splitTextToSize(cleanProblem, contentW - 2);
  doc.text(problemLines, margin + 1, y);

  y += Math.max(12, problemLines.length * 4.3 + 4.5);
  drawSectionTitle("CHECKLIST DE ENTRADA", y);
  y += 8.5;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);

  const checklistEntries = Object.entries(order.checklist || {});
  const groupIsOk = (patterns: string[]) => {
    const matched = checklistEntries.filter(([key]) =>
      patterns.some((p) => key.toLowerCase().includes(p.toLowerCase())),
    );
    if (matched.length === 0) return false;
    return matched.every(([, value]) => !!value);
  };

  const checklistReduced: Array<{ label: string; ok: boolean }> = [
    { label: "Tela / Display", ok: groupIsOk(["tela", "display"]) },
    { label: "Áudio (alto-falante e microfone)", ok: groupIsOk(["alto-falante", "microfone", "audio", "áudio"]) },
    { label: "Câmeras", ok: groupIsOk(["camera", "câmera"]) },
    { label: "Conectividade (Wi-Fi, Bluetooth, Chip)", ok: groupIsOk(["wi-fi", "wifi", "bluetooth", "chip", "sinal"]) },
    { label: "Sensores (biometria, proximidade, vibração)", ok: groupIsOk(["biometria", "proximidade", "vibra", "sensor"]) },
    { label: "Bateria / Carregamento", ok: groupIsOk(["bateria", "carregamento"]) },
  ];

  checklistReduced.forEach((item, index) => {
    const rowY = y + index * 4.4;
    const bulletX = margin + 2;
    doc.setFillColor(item.ok ? 27 : 220, item.ok ? 156 : 53, item.ok ? 87 : 69);
    doc.circle(bulletX, rowY - 0.9, 0.9, "F");
    doc.setTextColor(...DARK);
    doc.text(item.label, margin + 5, rowY);
  });

  y += 30;
  drawSectionTitle("SERVIÇO EXECUTADO", y);
  y += 8.5;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.9);
  doc.text((doc.splitTextToSize(serviceExecuted, contentW - 2)[0] || "-").trim(), margin + 1, y);

  y += 10;
  drawSectionTitle("VALORES", y);
  y += 8.5;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text(`Técnico responsável: ${order.technician || "-"}`, margin + 1, y);
  y += 4.8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.9);
  const valuesText = `Mão de obra: ${formatMoney(serviceValue)} | Peças: ${formatMoney(partsValue)} | Desconto: ${formatMoney(discountValue)} | Total: ${formatMoney(totalValue)}`;
  const valueLines = doc.splitTextToSize(valuesText, contentW - 2);
  doc.text(valueLines, margin + 1, y);

  y += valueLines.length * 4.8 + 12;
  drawSectionTitle("PEÇAS UTILIZADAS", y);
  y += 12.5;
  doc.setFillColor(236, 241, 247);
  doc.rect(margin, y - 5.8, contentW, 7.2, "F");
  doc.setTextColor(...GRAY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text("Peça", margin + 2, y - 0.4);
  doc.text("Qtd", 108, y - 0.4);
  doc.text("Valor unit.", 128, y - 0.4);
  doc.text("Subtotal", pageW - margin - 2, y - 0.4, { align: "right" });

  const rowH = 9.6;
  y += 5.8;
  if (usedParts.length === 0) {
    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    doc.text("Nenhuma peça utilizada.", margin + 2, y + 3.4);
    y += rowH;
  } else {
    doc.setDrawColor(224, 230, 238);
    usedParts.slice(0, 4).forEach((part, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 253);
        doc.rect(margin, y - 4.4, contentW, rowH, "F");
      }
      const subtotal = part.qty * part.unitCost;
      doc.setTextColor(...DARK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.6);
      doc.text(doc.splitTextToSize(part.name || "-", 86)[0] || "-", margin + 2, y + 2.9);
      doc.text(String(part.qty), 108, y + 2.9);
      doc.text(formatMoney(part.unitCost), 128, y + 2.9);
      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(subtotal), pageW - margin - 2, y + 2.9, { align: "right" });
      doc.line(margin, y + 5, pageW - margin, y + 5);
      y += rowH;
    });
    if (usedParts.length > 4) {
      doc.setTextColor(...GRAY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.3);
      doc.text(`+ ${usedParts.length - 4} peça(s) no sistema`, margin + 2, y + 2.4);
      y += 4.8;
    }
  }

  y += 12;
  drawSectionTitle("REGISTRO FOTOGRÁFICO", y);
  y += 10;
  if (!hasAnyPhoto) {
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Registro fotográfico: não realizado neste atendimento.", margin + 1, y);
  } else {
    const cols = Math.max(1, Math.min(3, normalizedPhotoItems.length));
    const gap = 4;
    const thumbW = (contentW - gap * (cols - 1)) / cols;
    const thumbH = 18.5;
    const labelY = y + 2.8;
    const imageY = y + 4.8;

    const drawThumb = (img: string, x: number, w: number, label: string) => {
      doc.setTextColor(...GRAY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(label, x + 1.5, labelY);
      doc.setDrawColor(198, 205, 216);
      doc.rect(x, imageY, w, thumbH);
      try {
        const props = doc.getImageProperties(img);
        const iw = Number(props.width) || w;
        const ih = Number(props.height) || thumbH;
        const scale = Math.min(w / iw, thumbH / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = x + (w - dw) / 2;
        const dy = imageY + (thumbH - dh) / 2;
        doc.addImage(img, imageFormat(img), dx, dy, dw, dh);
      } catch {
        doc.setTextColor(...GRAY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("Imagem indisponível", x + w / 2, imageY + thumbH / 2, { align: "center" });
      }
    };

    normalizedPhotoItems.forEach((item, index) => {
      const x = margin + index * (thumbW + gap);
      drawThumb(item.src, x, thumbW, item.label);
    });
  }

  drawFooter();

  // QUEBRA EXPLICITA ENTRE PAGINA 1 E 2
  doc.addPage();

  // PAGINA 2 - TERMO
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("TERMO DE NÃO GARANTIA E RESPONSABILIDADE", margin, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`OS Nº: ${orderCode}`, pageW - margin, 12, { align: "right" });

  const termY = 28;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.1);
  const legalClauses = [
    "1. A assistência técnica não oferece garantia ampla de funcionamento futuro do aparelho além do serviço descrito na OS.",
    "2. Peças adquiridas pelo cliente, fornecidas por terceiros ou previamente instaladas não possuem garantia da assistência.",
    "3. O cliente declara ciência do estado de entrada do aparelho, inclusive quando entregue desmontado e/ou com defeitos pré-existentes.",
    "4. A assistência não responde por danos decorrentes de mau uso, quedas, líquidos, oscilação elétrica ou intervenção de terceiros.",
    "5. Ao assinar, o cliente confirma leitura e concordância com este termo.",
  ];
  const body = responsibilityTerm?.trim()
    ? `${responsibilityTerm.trim()}\n\n${legalClauses.join("\n")}`
    : legalClauses.join("\n");
  const lines = doc.splitTextToSize(body, contentW - 2);
  doc.text(lines.slice(0, 34), margin + 1, termY);

  const sigY = 242;
  doc.setDrawColor(140, 150, 165);
  doc.line(15, sigY, pageW / 2 - 10, sigY);
  doc.line(pageW / 2 + 10, sigY, pageW - 15, sigY);
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Assinatura do Cliente", pageW / 4, sigY + 5, { align: "center" });
  doc.text("Assinatura do Técnico", (pageW * 3) / 4, sigY + 5, { align: "center" });
  doc.setTextColor(...GRAY);
  doc.setFontSize(7);
  doc.text(order.customerName || "Cliente", pageW / 4, sigY + 9, { align: "center" });
  doc.text(order.technician || "Técnico responsável", (pageW * 3) / 4, sigY + 9, { align: "center" });
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Data: ${order.date || "____/____/______"}`, margin + 1, sigY + 18);

  drawFooter();
  doc.save(`${order.id}_${order.customerName.replace(/\s+/g, "_")}.pdf`);
}
