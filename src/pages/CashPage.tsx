import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import logoUrl from "@/assets/logo.jpeg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CashEntry, PaymentMethod, formatCurrency, parseCurrency, useAppStore } from "@/store/appStore";

type PeriodPreset = "today" | "yesterday" | "last7" | "custom";
type MovementKind = "entrada" | "saida" | "venda" | "compra";

const paymentLabels: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  debito: "Débito",
  credito: "Crédito",
  cartao: "Cartão",
  outro: "Outro",
};

function brDateTime(iso?: string) {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("pt-BR", { hour12: false });
}

function brDate(iso?: string) {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleDateString("pt-BR");
}

function dayKey(iso?: string) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, "0");
  const d = `${dt.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayGroupLabel(iso?: string) {
  if (!iso) return "-";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "-";
  const today = startOfDay(new Date()).getTime();
  const target = startOfDay(dt).getTime();
  const diffDays = Math.round((today - target) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return `Hoje - ${dt.toLocaleDateString("pt-BR")}`;
  if (diffDays === 1) return `Ontem - ${dt.toLocaleDateString("pt-BR")}`;
  return dt.toLocaleDateString("pt-BR");
}

function toInputDate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromInputDate(value: string) {
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function startOfDay(date: Date) {
  const x = new Date(date);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(date: Date) {
  const x = new Date(date);
  x.setHours(23, 59, 59, 999);
  return x;
}

function isOpeningEntry(entry: CashEntry) {
  return entry.description === "Abertura de caixa" || entry.description === "Caixa inicial";
}

function affectPhysicalCash(entry: CashEntry) {
  return entry.affectsPhysicalCash ?? entry.paymentMethod === "dinheiro";
}

async function loadLogoDataUrl() {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function CashPage() {
  const { cashRegisters, cashEntries, companyInfo, openCashRegister, closeCashRegister, addCashMovement, reverseCashEntry } =
    useAppStore();

  const [preset, setPreset] = useState<PeriodPreset>("today");
  const [customStart, setCustomStart] = useState(toInputDate(new Date()));
  const [customEnd, setCustomEnd] = useState(toInputDate(new Date()));
  const [openingOpen, setOpeningOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  const [estornoOpen, setEstornoOpen] = useState(false);
  const [estornoReason, setEstornoReason] = useState("");
  const [targetEntry, setTargetEntry] = useState<CashEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [openingEmployee, setOpeningEmployee] = useState(localStorage.getItem("shieldos_last_cash_employee") || "");
  const [openingAmountInput, setOpeningAmountInput] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");

  const [movementKind, setMovementKind] = useState<MovementKind>("entrada");
  const [movementAmountInput, setMovementAmountInput] = useState("");
  const [movementDescription, setMovementDescription] = useState("");
  const [movementEmployee, setMovementEmployee] = useState(localStorage.getItem("shieldos_last_cash_employee") || "");
  const [movementNotes, setMovementNotes] = useState("");
  const [cashReceivedInput, setCashReceivedInput] = useState("");

  const [closingEmployee, setClosingEmployee] = useState(localStorage.getItem("shieldos_last_cash_employee") || "");
  const [countedInput, setCountedInput] = useState("");
  const [closingNotes, setClosingNotes] = useState("");

  const currentOpenRegister = useMemo(() => cashRegisters.find((register) => register.status === "aberto"), [cashRegisters]);

  const range = useMemo(() => {
    const now = new Date();
    if (preset === "today") return { start: startOfDay(now), end: endOfDay(now) };
    if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    if (preset === "last7") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { start: startOfDay(start), end: endOfDay(now) };
    }
    const s = fromInputDate(customStart) || now;
    const e = fromInputDate(customEnd) || now;
    return { start: startOfDay(s), end: endOfDay(e) };
  }, [preset, customStart, customEnd]);

  const sessionsInRange = useMemo(
    () =>
      cashRegisters
        .filter((session) => {
          const opened = new Date(session.openedAtIso);
          return opened >= range.start && opened <= range.end;
        })
        .sort((a, b) => b.openedAtIso.localeCompare(a.openedAtIso)),
    [cashRegisters, range]
  );

  const selectedSession = useMemo(() => sessionsInRange[0] || null, [sessionsInRange]);

  const entriesForSession = useMemo(() => {
    if (!selectedSession) return [] as CashEntry[];
    return cashEntries
      .filter((entry) => entry.registerId === selectedSession.id)
      .sort((a, b) => (a.createdAtIso || "").localeCompare(b.createdAtIso || ""));
  }, [cashEntries, selectedSession]);

  const displayRows = useMemo(() => {
    if (!selectedSession) return [] as Array<CashEntry & { runningAfter: number }>;
    let running = selectedSession.openingAmount;
    const enriched = entriesForSession.map((entry) => {
      const active = entry.status !== "cancelada" && entry.status !== "estornada";
      const affects = affectPhysicalCash(entry) && !isOpeningEntry(entry);
      if (active && affects) running += entry.type === "entrada" ? entry.amount : -entry.amount;
      return { ...entry, runningAfter: running };
    });
    return [...enriched].sort((a, b) => (b.createdAtIso || "").localeCompare(a.createdAtIso || ""));
  }, [entriesForSession, selectedSession]);

  const summary = useMemo(() => {
    if (!selectedSession) return { opening: 0, in: 0, out: 0, final: 0, estornos: 0 };
    const valid = entriesForSession.filter((entry) => entry.status !== "cancelada" && entry.status !== "estornada");
    const cashValid = valid.filter((entry) => affectPhysicalCash(entry) && !isOpeningEntry(entry));
    const totalIn = cashValid.filter((entry) => entry.type === "entrada").reduce((sum, entry) => sum + entry.amount, 0);
    const totalOut = cashValid.filter((entry) => entry.type === "saida").reduce((sum, entry) => sum + entry.amount, 0);
    return {
      opening: selectedSession.openingAmount,
      in: totalIn,
      out: totalOut,
      final: selectedSession.openingAmount + totalIn - totalOut,
      estornos: entriesForSession.filter((entry) => entry.status === "estornada").length,
    };
  }, [selectedSession, entriesForSession]);

  const closePreview = useMemo(() => {
    if (!selectedSession) return { expected: 0, diff: 0 };
    const counted = parseCurrency(countedInput);
    return { expected: summary.final, diff: counted - summary.final };
  }, [selectedSession, countedInput, summary.final]);

  const changeDue = useMemo(() => {
    const amount = parseCurrency(movementAmountInput);
    const received = parseCurrency(cashReceivedInput);
    return Math.max(0, received - amount);
  }, [movementAmountInput, cashReceivedInput]);

  const periodLabel = `${range.start.toLocaleDateString("pt-BR")} a ${range.end.toLocaleDateString("pt-BR")}`;

  const openCash = async () => {
    const openingAmount = parseCurrency(openingAmountInput);
    setSubmitting(true);
    const result = openCashRegister({ employeeName: openingEmployee, openingAmount, notes: openingNotes });
    setSubmitting(false);
    if (!result.ok) return toast.error(result.message || "Não foi possível abrir o caixa.");
    localStorage.setItem("shieldos_last_cash_employee", openingEmployee.trim());
    setOpeningOpen(false);
    setOpeningAmountInput("");
    setOpeningNotes("");
    toast.success("Caixa aberto com sucesso.");
  };

  const registerMovement = async () => {
    const amount = parseCurrency(movementAmountInput);
    const map: Record<MovementKind, { type: "entrada" | "saida"; category: "venda" | "compra" | "suprimento" | "sangria" }> =
      {
        entrada: { type: "entrada", category: "suprimento" },
        saida: { type: "saida", category: "sangria" },
        venda: { type: "entrada", category: "venda" },
        compra: { type: "saida", category: "compra" },
      };
    const movement = map[movementKind];
    const paymentMethod: PaymentMethod = "dinheiro";
    const cashReceived = movement.type === "entrada" ? parseCurrency(cashReceivedInput) : undefined;
    if (cashReceived !== undefined && cashReceived < amount) return toast.error("Valor recebido menor que o valor da movimentação.");
    setSubmitting(true);
    const result = addCashMovement({
      type: movement.type,
      category: movement.category,
      paymentMethod,
      amount,
      description: movementDescription,
      employeeName: movementEmployee,
      notes: movementNotes,
      cashReceivedAmount: cashReceived,
      changeDueAmount: cashReceived !== undefined ? Math.max(0, cashReceived - amount) : undefined,
    });
    setSubmitting(false);
    if (!result.ok) return toast.error(result.message || "Não foi possível registrar a movimentação.");
    localStorage.setItem("shieldos_last_cash_employee", movementEmployee.trim());
    setMovementOpen(false);
    setMovementAmountInput("");
    setMovementDescription("");
    setMovementNotes("");
    setCashReceivedInput("");
    toast.success("Movimentação registrada.");
  };

  const closeCash = async () => {
    const counted = parseCurrency(countedInput);
    setSubmitting(true);
    const result = closeCashRegister({ employeeName: closingEmployee, countedAmount: counted, notes: closingNotes });
    setSubmitting(false);
    if (!result.ok) return toast.error(result.message || "Não foi possível fechar o caixa.");
    localStorage.setItem("shieldos_last_cash_employee", closingEmployee.trim());
    setClosingOpen(false);
    setCountedInput("");
    setClosingNotes("");
    toast.success("Caixa fechado com sucesso.");
    await exportPdf(true);
  };

  const confirmEstorno = () => {
    if (!targetEntry) return;
    const result = reverseCashEntry(targetEntry.id, estornoReason, movementEmployee || closingEmployee || openingEmployee || "Usuário");
    if (!result.ok) return toast.error(result.message || "Não foi possível estornar.");
    setEstornoOpen(false);
    setEstornoReason("");
    setTargetEntry(null);
    toast.success("Movimentação estornada.");
  };

  const exportPdf = async (automatic = false) => {
    if (!selectedSession) return toast.error("Nenhuma movimentação encontrada para a data/período selecionado.");
    const logo = await loadLogoDataUrl();
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    const mx = 12;
    let y = 14;
    if (logo) {
      try {
        doc.addImage(logo, logo.startsWith("data:image/png") ? "PNG" : "JPEG", mx, 8, 14, 14);
      } catch {
        // ignore
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Relatório de Caixa", w / 2, 13, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Empresa: ${companyInfo.name || "ShieldOS"}`, mx, 24);
    doc.text(`Período: ${periodLabel}`, mx, 29);
    doc.text(`Status: ${selectedSession.status === "aberto" ? "Aberto" : "Fechado"}`, mx, 34);
    doc.text(`Responsável abertura: ${selectedSession.openedBy || "-"}`, mx, 39);
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR", { hour12: false })}`, w - mx, 24, { align: "right" });
    y = 50;
    doc.setFillColor(232, 238, 246);
    doc.rect(mx, y, w - mx * 2, 8, "F");
    const col = { data: mx + 1, tipo: mx + 34, desc: mx + 50, forma: mx + 114, user: mx + 136, valor: w - mx - 24, saldo: w - mx - 1 };
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Data/Hora", col.data, y + 5);
    doc.text("Tipo", col.tipo, y + 5);
    doc.text("Descrição", col.desc, y + 5);
    doc.text("Forma", col.forma, y + 5);
    doc.text("Usuário", col.user, y + 5);
    doc.text("Valor", col.valor, y + 5, { align: "right" });
    doc.text("Saldo após", col.saldo, y + 5, { align: "right" });
    y += 8;
    const rows = displayRows.filter((entry) => entry.status !== "cancelada");
    rows.forEach((entry, idx) => {
      const rowH = 7.5;
      if (y + rowH > h - 22) {
        doc.addPage();
        y = 14;
      }
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 254);
        doc.rect(mx, y, w - mx * 2, rowH, "F");
      }
      const estornado = entry.status === "estornada";
      const color = estornado ? [145, 150, 160] : [25, 35, 50];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(brDateTime(entry.createdAtIso), col.data, y + 5);
      doc.text(entry.type === "entrada" ? "Entrada" : "Saída", col.tipo, y + 5);
      doc.text(entry.description, col.desc, y + 5, { maxWidth: 60 });
      if (estornado) doc.text("ESTORNADO", col.desc + 46, y + 5);
      doc.text(entry.paymentMethod ? paymentLabels[entry.paymentMethod] : "-", col.forma, y + 5, { maxWidth: 20 });
      doc.text(entry.employeeName || entry.performedBy || "-", col.user, y + 5, { maxWidth: 22 });
      const signedValue = `${entry.type === "entrada" ? "+" : "-"}${formatCurrency(entry.amount)}`;
      doc.text(signedValue, col.valor, y + 5, { align: "right" });
      if (estornado) {
        const width = doc.getTextWidth(signedValue);
        doc.line(col.valor - width, y + 4.2, col.valor, y + 4.2);
      }
      doc.text(formatCurrency(entry.runningAfter), col.saldo, y + 5, { align: "right" });
      y += rowH;
    });
    y += 6;
    if (y > h - 38) {
      doc.addPage();
      y = 16;
    }
    doc.setFillColor(244, 247, 252);
    doc.roundedRect(mx, y, w - mx * 2, 26, 2, 2, "F");
    doc.setTextColor(70, 80, 95);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Resumo financeiro", mx + 3, y + 7);
    doc.setFont("helvetica", "normal");
    doc.text(`Total de entradas: ${formatCurrency(summary.in)}`, mx + 3, y + 13);
    doc.text(`Total de saídas: ${formatCurrency(summary.out)}`, mx + 3, y + 18);
    doc.text(`Saldo inicial: ${formatCurrency(summary.opening)}`, mx + 70, y + 13);
    doc.text(`Saldo final: ${formatCurrency(summary.final)}`, mx + 70, y + 18);
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFontSize(8);
      doc.setTextColor(122, 132, 148);
      doc.text("Documento gerado automaticamente pelo sistema", mx, h - 6);
      doc.text(`Página ${page} de ${pages}`, w - mx, h - 6, { align: "right" });
    }
    doc.save(`caixa-${range.start.toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`);
    if (!automatic) toast.success("PDF do caixa exportado.");
  };

  return (
    <div className="premium-page space-y-5">
      <div className="premium-block border border-border/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${currentOpenRegister ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {currentOpenRegister ? "Caixa aberto — registrando movimentações do dia." : "Caixa fechado — movimentações em dinheiro não serão registradas."}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentOpenRegister ? (
              <Button variant="outline" onClick={() => setClosingOpen(true)}>Fechar caixa</Button>
            ) : null}
            <Button variant="outline" onClick={() => void exportPdf(false)}>Gerar PDF</Button>
            {!currentOpenRegister ? (
              <Button size="sm" onClick={() => setOpeningOpen(true)}>
                Abrir caixa
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-2">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                Responsável: <strong className="text-foreground">{currentOpenRegister?.openedBy || "-"}</strong> • Abertura: {brDateTime(currentOpenRegister?.openedAtIso)}
              </p>
              <p>Saldo inicial em dinheiro: <strong className="text-foreground">{formatCurrency(currentOpenRegister?.openingAmount || 0)}</strong></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => { setMovementKind("entrada"); setMovementOpen(true); }} disabled={!currentOpenRegister}>Registrar entrada</Button>
              <Button variant="outline" onClick={() => { setMovementKind("saida"); setMovementOpen(true); }} disabled={!currentOpenRegister}>Registrar saída</Button>
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo atual em dinheiro</p>
            <p className="text-3xl font-bold text-foreground">{formatCurrency(summary.final)}</p>
          </div>
        </div>
      </div>

      <div className="premium-block p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-2xl font-semibold text-foreground">Movimentações do Caixa</h3>
            <p className="text-xs text-muted-foreground">Entradas e saídas em dinheiro para conferência.</p>
          </div>
          {summary.estornos > 0 ? <Badge variant="outline">{summary.estornos} estorno(s) no período</Badge> : null}
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={preset} onChange={(event) => setPreset(event.target.value as PeriodPreset)}>
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="last7">Últimos 7 dias</option>
            <option value="custom">Período personalizado</option>
          </select>
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Movimentações do caixa por data. Período: <strong className="text-foreground">{periodLabel}</strong>
          </div>
        </div>
        {preset === "custom" ? (
          <div className="mb-3 flex flex-wrap gap-2">
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} />
            <input className="h-10 rounded-md border border-input bg-background px-3 text-sm" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} />
          </div>
        ) : null}
        <p className="mb-3 text-xs text-muted-foreground">Use este extrato para conferir o dinheiro físico e identificar possíveis diferenças.</p>

        <div className="premium-table-shell overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">Data/Hora</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Tipo</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Descrição</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Forma de pagamento</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Usuário responsável</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Valor</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Saldo após</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!selectedSession || displayRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-sm text-muted-foreground" colSpan={8}>
                    <p className="font-medium text-foreground">Sem movimentações em dinheiro no período.</p>
                  </td>
                </tr>
              ) : (
                displayRows.map((entry, index) => {
                  const estornado = entry.status === "estornada";
                  const cancelada = entry.status === "cancelada";
                  const muted = estornado || cancelada;
                  const previous = index > 0 ? displayRows[index - 1] : null;
                  const showDayHeader = dayKey(previous?.createdAtIso) !== dayKey(entry.createdAtIso);
                  return (
                    <>
                      {showDayHeader ? (
                        <tr className="bg-muted/20">
                          <td className="px-3 py-2 text-xs font-medium text-muted-foreground" colSpan={8}>
                            {dayGroupLabel(entry.createdAtIso)}
                          </td>
                        </tr>
                      ) : null}
                      <tr key={entry.id} className={`group border-b border-border/40 ${muted ? "text-muted-foreground" : "text-foreground"}`}>
                        <td className="px-3 py-2">{brDateTime(entry.createdAtIso)}</td>
                        <td className="px-3 py-2">
                          <span className={entry.type === "entrada" ? "text-emerald-600" : "text-destructive"}>
                            {entry.type === "entrada" ? "Entrada" : "Saída"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <p className={muted ? "line-through" : ""}>{entry.description}</p>
                          <p className="text-xs text-muted-foreground">{entry.employeeName || entry.performedBy || "-"}</p>
                          {estornado ? <Badge variant="outline" className="mt-1">ESTORNADO</Badge> : null}
                          {cancelada ? <Badge variant="outline" className="mt-1">CANCELADA</Badge> : null}
                        </td>
                        <td className="px-3 py-2">{entry.paymentMethod ? paymentLabels[entry.paymentMethod] : "-"}</td>
                        <td className="px-3 py-2">{entry.employeeName || entry.performedBy || "-"}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${entry.type === "entrada" ? "text-emerald-600" : "text-destructive"} ${muted ? "line-through opacity-70" : ""}`}>
                          {entry.type === "entrada" ? "+" : "-"}{formatCurrency(entry.amount)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-foreground">{formatCurrency(entry.runningAfter)}</td>
                        <td className="px-3 py-2 text-right">
                          {entry.status === "ativa" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 transition-opacity group-hover:opacity-100"
                              title="Estornar movimentação"
                              onClick={() => { setTargetEntry(entry); setEstornoOpen(true); }}
                            >
                              Estornar
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {estornado ? "Já estornada" : "Sem ações"}
                            </span>
                          )}
                        </td>
                      </tr>
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="glass-card rounded-xl p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total de entradas</p>
          <p className="mt-1 text-xl font-semibold text-emerald-600">{formatCurrency(summary.in)}</p>
        </div>
        <div className="glass-card rounded-xl p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total de saídas</p>
          <p className="mt-1 text-xl font-semibold text-destructive">{formatCurrency(summary.out)}</p>
        </div>
        <div className="glass-card rounded-xl p-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo em caixa</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{formatCurrency(summary.final)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Valor esperado em dinheiro.</p>
        </div>
      </div>

      <Dialog open={openingOpen} onOpenChange={setOpeningOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Abertura de caixa</DialogTitle>
            <DialogDescription>Ao abrir o caixa, informe o valor inicial em dinheiro para controle das movimentações do dia.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Nome do funcionário responsável *</label>
              <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={openingEmployee} onChange={(event) => setOpeningEmployee(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Valor inicial em dinheiro *</label>
              <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="R$ 0,00" value={openingAmountInput} onChange={(event) => setOpeningAmountInput(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Observações</label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} value={openingNotes} onChange={(event) => setOpeningNotes(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpeningOpen(false)}>Cancelar</Button>
            <Button onClick={() => void openCash()} disabled={submitting}>{submitting ? "Abrindo..." : "Abrir caixa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar entrada / saída</DialogTitle>
            <DialogDescription>No caixa operacional, somente dinheiro em espécie é permitido.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Tipo de movimentação *</label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={movementKind} onChange={(event) => setMovementKind(event.target.value as MovementKind)}>
                <option value="entrada">Entrada</option>
                <option value="saida">Saida</option>
                <option value="venda">Venda</option>
                <option value="compra">Compra</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Forma de pagamento *</label>
              <input className="h-10 w-full rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground" value="Dinheiro" readOnly />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Valor *</label>
              <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="R$ 0,00" value={movementAmountInput} onChange={(event) => setMovementAmountInput(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Funcionário responsável *</label>
              <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={movementEmployee} onChange={(event) => setMovementEmployee(event.target.value)} />
            </div>
            {(movementKind === "entrada" || movementKind === "venda") ? (
              <div className="md:col-span-2 rounded-md border border-border bg-muted/20 p-3">
                <label className="mb-1 block text-sm font-medium text-foreground">Valor recebido (dinheiro)</label>
                <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="R$ 0,00" value={cashReceivedInput} onChange={(event) => setCashReceivedInput(event.target.value)} />
                <p className="mt-2 text-sm text-muted-foreground">Troco: <strong className="text-foreground">{formatCurrency(changeDue)}</strong> • O troco não altera o saldo do caixa.</p>
              </div>
            ) : null}
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">Descrição *</label>
              <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={movementDescription} onChange={(event) => setMovementDescription(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-foreground">Observações</label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} value={movementNotes} onChange={(event) => setMovementNotes(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementOpen(false)}>Cancelar</Button>
            <Button onClick={() => void registerMovement()} disabled={submitting}>{submitting ? "Salvando..." : "Salvar movimentação"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={closingOpen} onOpenChange={setClosingOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Fechamento de caixa</DialogTitle>
            <DialogDescription>Confirme o valor contado em dinheiro para encerrar o caixa.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
            <p>Responsável da abertura: <strong>{selectedSession?.openedBy || "-"}</strong></p>
            <p>Valor de abertura: <strong>{formatCurrency(summary.opening)}</strong></p>
            <p>Entradas em dinheiro: <strong className="text-emerald-600">{formatCurrency(summary.in)}</strong></p>
            <p>Saidas em dinheiro: <strong className="text-destructive">{formatCurrency(summary.out)}</strong></p>
            <p>Saldo esperado em dinheiro: <strong>{formatCurrency(closePreview.expected)}</strong></p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Funcionário responsável pelo fechamento *</label>
              <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={closingEmployee} onChange={(event) => setClosingEmployee(event.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Valor contado em dinheiro *</label>
              <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" placeholder="R$ 0,00" value={countedInput} onChange={(event) => setCountedInput(event.target.value)} />
              <p className={`mt-1 text-xs ${closePreview.diff === 0 ? "text-muted-foreground" : "text-amber-700"}`}>Diferença de caixa (sobra/falta): {formatCurrency(closePreview.diff)}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Justificativa / observacoes</label>
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClosingOpen(false)}>Cancelar</Button>
            <Button onClick={() => void closeCash()} disabled={submitting}>{submitting ? "Fechando..." : "Fechar caixa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={estornoOpen} onOpenChange={setEstornoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Estornar movimentação</DialogTitle>
            <DialogDescription>O estorno marca a movimentação original como estornada, sem criar linha duplicada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Movimentação: <strong className="text-foreground">{targetEntry?.description || "-"}</strong></p>
            <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" rows={3} placeholder="Motivo do estorno (obrigatório)" value={estornoReason} onChange={(event) => setEstornoReason(event.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstornoOpen(false)}>Cancelar</Button>
            <Button onClick={confirmEstorno}>Confirmar estorno</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}





