import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/auth/AuthProvider";
import {
  BudgetItem,
  BudgetRecord,
  BudgetStatus,
  formatCurrency,
  parseCurrency,
  useAppStore,
} from "@/store/appStore";
import { createId } from "@/lib/id";

type ValidityFilter = "all" | "valid" | "expired";
type BudgetRowAction =
  | "edit"
  | "duplicate"
  | "pdf"
  | "whatsapp"
  | "reminder24"
  | "reminder72"
  | "send"
  | "wait_approval"
  | "approve"
  | "reject"
  | "delete";

const statusLabel: Record<BudgetStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
  EXPIRADO: "Expirado",
  CONVERTIDO_OS: "Convertido em OS",
  EXCLUIDO: "Excluído",
};

const statusTone: Record<BudgetStatus, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  ENVIADO: "bg-info/10 text-info",
  AGUARDANDO_APROVACAO: "bg-warning/10 text-warning",
  APROVADO: "bg-success/10 text-success",
  REPROVADO: "bg-destructive/10 text-destructive",
  EXPIRADO: "bg-muted text-muted-foreground",
  CONVERTIDO_OS: "bg-primary/10 text-primary",
  EXCLUIDO: "bg-muted text-muted-foreground",
};

const emptyForm = {
  customerId: "",
  title: "",
  equipment: "",
  problemDescription: "",
  notes: "",
  validityDays: 7,
  discount: "",
  items: [] as BudgetItem[],
};

function isExpired(budget: BudgetRecord): boolean {
  return new Date(budget.validUntilIso).getTime() < Date.now();
}

function formatInputMoney(cents: number): string {
  return cents ? (cents / 100).toFixed(2) : "";
}

function buildServiceSummary(budget: BudgetRecord): string {
  if (budget.title?.trim()) return budget.title.trim();
  if (budget.items.length > 0) return budget.items[0].description;
  return "Serviço técnico";
}

function installmentPreview(totalAmountCents: number, installments = 12): string {
  if (totalAmountCents <= 0) return "";
  const perInstallment = Math.round(totalAmountCents / installments);
  return `${installments}x de ${formatCurrency(perInstallment)}`;
}

function reminderStage(budget: BudgetRecord): "none" | "24h" | "72h" {
  if (budget.status !== "AGUARDANDO_APROVACAO") return "none";
  const baseIso =
    (budget.history || [])
      .filter((h) => h.action === "status_changed" && (h.details || "").includes("AGUARDANDO_APROVACAO"))
      .sort((a, b) => b.atIso.localeCompare(a.atIso))[0]?.atIso || budget.createdAtIso;
  const elapsed = Date.now() - new Date(baseIso).getTime();
  if (elapsed >= 72 * 60 * 60 * 1000) return "72h";
  if (elapsed >= 24 * 60 * 60 * 1000) return "24h";
  return "none";
}

function normalizePhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export default function Budgets() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const actor = session?.user?.email || "Sistema";
  const { budgets, customers, inventory, addCustomer, addBudget, updateBudget, duplicateBudget, deleteBudget, setBudgetStatus, convertBudgetToOrder } =
    useAppStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BudgetStatus>("all");
  const [validityFilter, setValidityFilter] = useState<ValidityFilter>("all");
  const [showDeleted, setShowDeleted] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<BudgetRecord | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [createNewCustomer, setCreateNewCustomer] = useState(false);
  const [customerDraft, setCustomerDraft] = useState({ name: "", phone: "", email: "", cpf: "" });

  useEffect(() => {
    budgets.forEach((budget) => {
      if (["RASCUNHO", "ENVIADO", "AGUARDANDO_APROVACAO"].includes(budget.status) && isExpired(budget)) {
        void setBudgetStatus(budget.id, "EXPIRADO", actor, "Expiração automática por validade.");
      }
    });
  }, [budgets, actor, setBudgetStatus]);

  const computedRows = useMemo(
    () =>
      budgets.map((budget) => {
        if (budget.status !== "EXPIRADO" && budget.status !== "EXCLUIDO" && budget.status !== "CONVERTIDO_OS" && isExpired(budget)) {
          return { ...budget, status: "EXPIRADO" as BudgetStatus };
        }
        return budget;
      }),
    [budgets]
  );

  const filtered = useMemo(() => {
    return computedRows
      .filter((budget) => (showDeleted ? true : budget.status !== "EXCLUIDO"))
      .filter((budget) => (statusFilter === "all" ? true : budget.status === statusFilter))
      .filter((budget) => {
        if (validityFilter === "all") return true;
        const expired = budget.status === "EXPIRADO" || isExpired(budget);
        return validityFilter === "expired" ? expired : !expired;
      })
      .filter((budget) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          budget.code.toLowerCase().includes(q) ||
          budget.customerName.toLowerCase().includes(q) ||
          (budget.title || "").toLowerCase().includes(q) ||
          budget.equipment.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAtIso).getTime() - new Date(a.createdAtIso).getTime());
  }, [computedRows, showDeleted, statusFilter, validityFilter, search]);

  const discountAmount = parseCurrency(form.discount || "0");
  const itemsTotal = form.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const totalAmount = Math.max(0, itemsTotal - discountAmount);

  const resetForm = () => {
    setEditingId(null);
    setCreateNewCustomer(false);
    setCustomerDraft({ name: "", phone: "", email: "", cpf: "" });
    setForm(emptyForm);
  };

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (budget: BudgetRecord) => {
    if (["APROVADO", "CONVERTIDO_OS", "EXCLUIDO"].includes(budget.status)) {
      toast.error("Este orçamento não pode ser editado.");
      return;
    }
    setEditingId(budget.id);
    setForm({
      customerId: budget.customerId,
      title: budget.title || "",
      equipment: budget.equipment,
      problemDescription: budget.problemDescription,
      notes: budget.notes || "",
      validityDays: Math.max(1, budget.validityDays || 7),
      discount: formatInputMoney(budget.discountAmount || 0),
      items: budget.items.map((item) => ({ ...item })),
    });
    setCreateOpen(true);
  };

  const addManualItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { id: createId(), type: "manual", description: "", qty: 1, unitPrice: 0 }],
    }));
  };

  const addStockItem = (inventoryId: string) => {
    if (!inventoryId) return;
    const item = inventory.find((entry) => entry.id === inventoryId);
    if (!item) return;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: createId(),
          type: "estoque",
          inventoryItemId: item.id,
          description: item.name,
          qty: 1,
          unitPrice: item.salePrice,
          unitCost: item.costPrice,
        },
      ],
    }));
  };

  const updateItem = (id: string, updates: Partial<BudgetItem>) => {
    setForm((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === id ? { ...item, ...updates } : item)) }));
  };

  const removeItem = (id: string) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  };

  const ensureCustomer = () => {
    if (!createNewCustomer) return form.customerId;
    if (!customerDraft.name.trim()) {
      toast.error("Informe o nome do cliente.");
      return "";
    }
    const id = createId();
    addCustomer({
      id,
      name: customerDraft.name.trim(),
      phone: customerDraft.phone.trim(),
      email: customerDraft.email.trim(),
      cpf: customerDraft.cpf.trim(),
      createdAt: new Date().toLocaleDateString("pt-BR"),
    });
    return id;
  };

  const saveBudget = () => {
    const customerId = ensureCustomer();
    if (!customerId) return;
    if (!form.equipment.trim()) return toast.error("Informe o aparelho.");
    if (!form.problemDescription.trim()) return toast.error("Informe a descrição do problema.");
    if (form.items.length === 0) return toast.error("Adicione ao menos um item (serviço ou peça).");
    if (form.items.some((item) => !item.description.trim() || item.qty <= 0 || item.unitPrice <= 0)) {
      return toast.error("Preencha corretamente os itens do orçamento.");
    }

    const customer = customers.find((entry) => entry.id === customerId);
    const validityDays = Math.max(1, Number(form.validityDays) || 7);
    if (editingId) {
      const result = updateBudget(
        editingId,
        {
          customerId,
          customerName: customer?.name || customerDraft.name || "Cliente",
          title: form.title.trim(),
          equipment: form.equipment.trim(),
          problemDescription: form.problemDescription.trim(),
          items: form.items.map((item) => ({ ...item })),
          notes: form.notes.trim(),
          validityDays,
          validUntilIso: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString(),
          discountAmount,
          totalAmount,
        },
        actor
      );
      if (!result.ok) return toast.error(result.message || "Não foi possível salvar.");
      toast.success("Orçamento atualizado.");
    } else {
      const budget = addBudget(
        {
          customerId,
          customerName: customer?.name || customerDraft.name || "Cliente",
          title: form.title.trim(),
          equipment: form.equipment.trim(),
          problemDescription: form.problemDescription.trim(),
          notes: form.notes.trim(),
          items: form.items.map((item) => ({ ...item })),
          validityDays,
          discountAmount,
          totalAmount,
          convertedOrderId: undefined,
          approvedAtIso: undefined,
          rejectedAtIso: undefined,
          expiredAtIso: undefined,
          excludedAtIso: undefined,
          exclusionReason: undefined,
        },
        actor
      );
      toast.success(`Orçamento ${budget.code} criado.`);
    }
    setCreateOpen(false);
    resetForm();
  };

  const exportBudgetPdf = (budget: BudgetRecord) => {
    const doc = new jsPDF();
    let y = 16;
    doc.setFontSize(14);
    doc.text(`Orçamento ${budget.code}`, 10, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Cliente: ${budget.customerName}`, 10, y);
    y += 5;
    doc.text(`Aparelho: ${budget.equipment}`, 10, y);
    y += 5;
    doc.text(`Status: ${statusLabel[budget.status]}`, 10, y);
    y += 5;
    doc.text(`Data de criação: ${new Date(budget.createdAtIso).toLocaleDateString("pt-BR")}`, 10, y);
    y += 5;
    doc.text(`Validade: ${new Date(budget.validUntilIso).toLocaleDateString("pt-BR")}`, 10, y);
    y += 8;
    doc.text(`Problema: ${budget.problemDescription}`, 10, y);
    y += 8;
    doc.text("Itens:", 10, y);
    y += 5;
    budget.items.forEach((item) => {
      doc.text(`- ${item.description} | ${item.qty}x | ${formatCurrency(item.unitPrice)} | ${formatCurrency(item.qty * item.unitPrice)}`, 10, y);
      y += 5;
    });
    y += 4;
    if (budget.discountAmount) {
      doc.text(`Desconto: ${formatCurrency(budget.discountAmount)}`, 10, y);
      y += 5;
    }
    doc.setFont("helvetica", "bold");
    doc.text(`Total: ${formatCurrency(budget.totalAmount)}`, 10, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(
      budget.legalValidityText || "Salvo estipulação em contrário, este orçamento tem validade de 7 dias a partir da data de emissão.",
      10,
      y
    );
    y += 6;
    doc.text("Taxa de diagnóstico: R$ 30,00 (cobrada caso o orçamento seja reprovado ou expire sem conversão em OS).", 10, y);
    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Selos de confianca:", 10, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text("- Garantia por escrito", 10, y);
    y += 5;
    doc.text("- Prazo estimado de entrega", 10, y);
    doc.save(`${budget.code}.pdf`);
  };

  const sendWhatsApp = (budget: BudgetRecord) => {
    const customer = customers.find((entry) => entry.id === budget.customerId);
    const phone = (customer?.phone || "").replace(/\D/g, "");
    if (!phone) return toast.error("Cliente sem telefone para WhatsApp.");
    const text = `Olá, ${budget.customerName}. Segue o orçamento ${budget.code} no valor de ${formatCurrency(
      budget.totalAmount
    )}. Validade até ${new Date(budget.validUntilIso).toLocaleDateString("pt-BR")}.`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const markStatus = (budget: BudgetRecord, status: Exclude<BudgetStatus, "EXCLUIDO">) => {
    if ((budget.status === "EXPIRADO" || isExpired(budget)) && (status === "APROVADO" || status === "AGUARDANDO_APROVACAO")) {
      toast.error("Orçamento expirado não pode ser aprovado.");
      return;
    }
    const result = setBudgetStatus(budget.id, status, actor);
    if (!result.ok) return toast.error(result.message || "Não foi possível atualizar o status.");
    toast.success(`Status alterado para ${statusLabel[status]}.`);
  };

  const doDuplicate = (budget: BudgetRecord) => {
    const result = duplicateBudget(budget.id, actor);
    if (!result.ok) return toast.error(result.message || "Não foi possível duplicar.");
    toast.success(`Orçamento ${result.budget?.code || ""} duplicado.`);
  };

  const doDelete = () => {
    if (!selected) return;
    if (!window.confirm("Confirma a exclusão lógica deste orçamento?")) return;
    const result = deleteBudget(selected.id, deleteReason, actor);
    if (!result.ok) return toast.error(result.message || "Não foi possível excluir.");
    toast.success("Orçamento excluído logicamente.");
    setDeleteOpen(false);
    setDeleteReason("");
    setSelected(null);
  };

  const doConvert = (budget: BudgetRecord) => {
    const result = convertBudgetToOrder(budget.id, actor);
    if (!result.ok) return toast.error(result.message || "Não foi possível converter.");
    toast.success(`Convertido para ${result.orderId}.`);
    navigate("/ordens");
  };

  const sendReminderWhatsApp = (budget: BudgetRecord, stage: "24h" | "72h") => {
    const customer = customers.find((entry) => entry.id === budget.customerId);
    const phone = (customer?.phone || "").replace(/\D/g, "");
    if (!phone) return toast.error("Cliente sem telefone para WhatsApp.");
    const installment = installmentPreview(budget.totalAmount);
    const prefix = stage === "24h" ? "Lembrete 24h" : "Lembrete 72h";
    const text = [
      `${prefix} - orçamento ${budget.code}`,
      `Olá, ${budget.customerName}. Seu orçamento está aguardando aprovação.`,
      `Valor: ${formatCurrency(budget.totalAmount)}${installment ? ` (${installment})` : ""}`,
      `Validade: ${new Date(budget.validUntilIso).toLocaleDateString("pt-BR")}`,
      "Se desejar, podemos aprovar e iniciar a ordem de serviço agora.",
    ].join("\n");
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, "_blank");
    toast.success(`Lembrete ${stage} pronto para envio.`);
  };

  const doApproveAndConvert = (budget: BudgetRecord) => {
    if (isExpired(budget) || budget.status === "EXPIRADO") {
      toast.error("Orçamento expirado não pode ser aprovado.");
      return;
    }
    if (!window.confirm(`Aprovar ${budget.code} e converter em Ordem de Serviço?`)) return;
    if (budget.status !== "APROVADO") {
      const approval = setBudgetStatus(budget.id, "APROVADO", actor, "Aprovação rápida com conversão imediata.");
      if (!approval.ok) return toast.error(approval.message || "Não foi possível aprovar o orçamento.");
    }
    const result = convertBudgetToOrder(budget.id, actor);
    if (!result.ok) return toast.error(result.message || "Não foi possível converter em OS.");
    toast.success(`Convertido para ${result.orderId}.`);
    navigate("/ordens");
  };

  const runRowAction = (budget: BudgetRecord, action: BudgetRowAction) => {
    switch (action) {
      case "edit":
        openEdit(budget);
        break;
      case "duplicate":
        doDuplicate(budget);
        break;
      case "pdf":
        exportBudgetPdf(budget);
        break;
      case "whatsapp":
        sendWhatsApp(budget);
        break;
      case "reminder24":
        sendReminderWhatsApp(budget, "24h");
        break;
      case "reminder72":
        sendReminderWhatsApp(budget, "72h");
        break;
      case "send":
        markStatus(budget, "ENVIADO");
        break;
      case "wait_approval":
        markStatus(budget, "AGUARDANDO_APROVACAO");
        break;
      case "approve":
        markStatus(budget, "APROVADO");
        break;
      case "reject":
        markStatus(budget, "REPROVADO");
        break;
      case "delete":
        setSelected(budget);
        setDeleteReason("");
        setDeleteOpen(true);
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm sm:w-96"
            placeholder="Buscar por código, cliente ou título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowDeleted((prev) => !prev)}>
            {showDeleted ? "Ocultar excluídos" : "Mostrar excluídos"}
          </Button>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="h-9 rounded-md border border-input bg-card px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | BudgetStatus)}>
          <option value="all">Todos os status</option>
          {Object.keys(statusLabel).map((status) => (
            <option key={status} value={status}>
              {statusLabel[status as BudgetStatus]}
            </option>
          ))}
        </select>
        <select className="h-9 rounded-md border border-input bg-card px-3 text-sm" value={validityFilter} onChange={(e) => setValidityFilter(e.target.value as ValidityFilter)}>
          <option value="all">Válidos e expirados</option>
          <option value="valid">Somente válidos</option>
          <option value="expired">Somente expirados</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">Nenhum orçamento cadastrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Crie um orçamento para iniciar o atendimento ao cliente.</p>
          <Button className="mt-4" onClick={openCreate}>
            Criar primeiro orçamento
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="bg-muted/30 text-left">
                <th className="w-[10%] px-3 py-3">Código</th>
                <th className="w-[12%] px-3 py-3">Cliente</th>
                <th className="w-[17%] px-3 py-3">Aparelho</th>
                <th className="w-[16%] px-3 py-3">Status</th>
                <th className="w-[11%] px-3 py-3 text-right">Valor total</th>
                <th className="w-[10%] px-3 py-3">Validade</th>
                <th className="w-[10%] px-3 py-3">Data de criação</th>
                <th className="w-[8%] px-3 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((budget) => {
                const expired = budget.status === "EXPIRADO" || isExpired(budget);
                const summary = buildServiceSummary(budget);
                const reminder = reminderStage(budget);
                return (
                  <tr key={budget.id} className="border-t border-border/60">
                    <td className="px-4 py-3 font-medium">{budget.code}</td>
                    <td className="px-4 py-3">
                      <p className="truncate">{budget.customerName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{budget.equipment}</p>
                      <p className="line-clamp-1 text-xs text-muted-foreground">{summary}</p>
                      <p className="text-xs text-success">Peca com garantia de 90 dias.</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[budget.status]}`}>{statusLabel[budget.status]}</span>
                      {expired && budget.status !== "EXCLUIDO" && <p className="mt-1 text-[11px] text-destructive">Validade expirada</p>}
                      {budget.status === "AGUARDANDO_APROVACAO" && !expired && (
                        <p className="mt-1 text-[11px] text-warning">
                          {reminder === "72h"
                            ? "Lembrete 72h pendente"
                            : reminder === "24h"
                              ? "Lembrete 24h pendente"
                              : "Proximo passo: cobrar resposta"}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      <p>{formatCurrency(budget.totalAmount)}</p>
                      <p className="text-xs font-normal text-muted-foreground">{installmentPreview(budget.totalAmount)}</p>
                    </td>
                    <td className="px-4 py-3">{new Date(budget.validUntilIso).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3">{new Date(budget.createdAtIso).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-center align-top">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          side="top"
                          sideOffset={8}
                          collisionPadding={12}
                          className="w-48 max-h-72 overflow-y-auto"
                        >
                          <DropdownMenuItem
                            onClick={() => {
                              setSelected(budget);
                              setViewOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          {!["APROVADO", "CONVERTIDO_OS", "EXCLUIDO"].includes(budget.status) ? (
                            <DropdownMenuItem onClick={() => runRowAction(budget, "edit")}>Editar</DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem onClick={() => runRowAction(budget, "duplicate")}>Duplicar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => runRowAction(budget, "pdf")}>Gerar PDF</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => runRowAction(budget, "whatsapp")}>Enviar WhatsApp</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {budget.status === "AGUARDANDO_APROVACAO" && reminder === "24h" ? (
                            <DropdownMenuItem onClick={() => runRowAction(budget, "reminder24")}>Lembrete 24h</DropdownMenuItem>
                          ) : null}
                          {budget.status === "AGUARDANDO_APROVACAO" && reminder === "72h" ? (
                            <DropdownMenuItem onClick={() => runRowAction(budget, "reminder72")}>Lembrete 72h</DropdownMenuItem>
                          ) : null}
                          {budget.status === "RASCUNHO" ? (
                            <DropdownMenuItem onClick={() => runRowAction(budget, "send")}>Marcar como enviado</DropdownMenuItem>
                          ) : null}
                          {["RASCUNHO", "ENVIADO"].includes(budget.status) ? (
                            <DropdownMenuItem onClick={() => runRowAction(budget, "wait_approval")}>Aguardar aprovação</DropdownMenuItem>
                          ) : null}
                          {["RASCUNHO", "ENVIADO"].includes(budget.status) && !expired ? (
                            <DropdownMenuItem onClick={() => runRowAction(budget, "approve")}>Aprovar</DropdownMenuItem>
                          ) : null}
                          {["RASCUNHO", "ENVIADO", "AGUARDANDO_APROVACAO"].includes(budget.status) ? (
                            <DropdownMenuItem onClick={() => runRowAction(budget, "reject")}>Reprovar</DropdownMenuItem>
                          ) : null}
                          {budget.status === "AGUARDANDO_APROVACAO" && !budget.convertedOrderId && !expired ? (
                            <DropdownMenuItem onClick={() => doApproveAndConvert(budget)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Aprovar e virar OS
                            </DropdownMenuItem>
                          ) : null}
                          {budget.status === "APROVADO" && !budget.convertedOrderId && !expired ? (
                            <DropdownMenuItem onClick={() => doConvert(budget)}>Converter em OS</DropdownMenuItem>
                          ) : null}
                          {["RASCUNHO", "ENVIADO", "AGUARDANDO_APROVACAO", "REPROVADO", "EXPIRADO"].includes(budget.status) ? (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => runRowAction(budget, "delete")}>
                              Excluir
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar orçamento" : "Novo orçamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {!createNewCustomer ? (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Cliente *</label>
                  <div className="flex gap-2">
                    <select className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={form.customerId} onChange={(e) => setForm((prev) => ({ ...prev, customerId: e.target.value }))}>
                      <option value="">Selecione o cliente</option>
                      {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                    </select>
                    <Button variant="outline" onClick={() => setCreateNewCustomer(true)}>Cadastrar cliente</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div><label className="mb-1 block text-sm font-medium">Nome do cliente *</label><input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={customerDraft.name} onChange={(e) => setCustomerDraft((prev) => ({ ...prev, name: e.target.value }))} /></div>
                  <div><label className="mb-1 block text-sm font-medium">Telefone</label><input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={customerDraft.phone} onChange={(e) => setCustomerDraft((prev) => ({ ...prev, phone: e.target.value }))} /></div>
                  <div><label className="mb-1 block text-sm font-medium">E-mail</label><input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={customerDraft.email} onChange={(e) => setCustomerDraft((prev) => ({ ...prev, email: e.target.value }))} /></div>
                  <div><label className="mb-1 block text-sm font-medium">CPF</label><input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={customerDraft.cpf} onChange={(e) => setCustomerDraft((prev) => ({ ...prev, cpf: e.target.value }))} /></div>
                  <div className="sm:col-span-2"><Button variant="outline" onClick={() => setCreateNewCustomer(false)}>Voltar para clientes cadastrados</Button></div>
                </>
              )}
              <div><label className="mb-1 block text-sm font-medium">Título</label><input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Ex.: Troca de tela" /></div>
              <div><label className="mb-1 block text-sm font-medium">Aparelho *</label><input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={form.equipment} onChange={(e) => setForm((prev) => ({ ...prev, equipment: e.target.value }))} /></div>
              <div><label className="mb-1 block text-sm font-medium">Dias de validade *</label><input type="number" min={1} className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={form.validityDays} onChange={(e) => setForm((prev) => ({ ...prev, validityDays: Math.max(1, Number(e.target.value) || 7) }))} /></div>
              <div><label className="mb-1 block text-sm font-medium">Desconto (opcional)</label><input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" placeholder="R$ 0,00" value={form.discount} onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value }))} /></div>
              <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium">Descrição do problema *</label><input className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm" value={form.problemDescription} onChange={(e) => setForm((prev) => ({ ...prev, problemDescription: e.target.value }))} /></div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <select className="h-9 rounded-md border border-input bg-card px-3 text-sm" onChange={(e) => addStockItem(e.target.value)} defaultValue="">
                  <option value="">Adicionar peça do estoque (opcional)</option>
                  {inventory.map((item) => <option key={item.id} value={item.id}>{item.name} ({formatCurrency(item.salePrice)})</option>)}
                </select>
                <Button variant="outline" onClick={addManualItem}>Adicionar item manual</Button>
              </div>
              <div className="space-y-2">
                {form.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2">
                    <input className="col-span-6 h-9 rounded-md border border-input bg-card px-2 text-sm" placeholder="Serviço/peça" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} disabled={item.type === "estoque"} />
                    <input type="number" min={1} className="col-span-2 h-9 rounded-md border border-input bg-card px-2 text-sm" value={item.qty} onChange={(e) => updateItem(item.id, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                    <input type="number" min={0} className="col-span-3 h-9 rounded-md border border-input bg-card px-2 text-sm" value={(item.unitPrice / 100).toFixed(2)} onChange={(e) => updateItem(item.id, { unitPrice: Math.max(0, Math.round(Number(e.target.value || 0) * 100)) })} />
                    <Button variant="outline" className="col-span-1 h-9 px-0" onClick={() => removeItem(item.id)}>x</Button>
                  </div>
                ))}
                {form.items.length === 0 && <p className="text-sm text-muted-foreground">Adicione serviços e/ou peças no orçamento.</p>}
              </div>
            </div>
            <div><label className="mb-1 block text-sm font-medium">Observações</label><textarea className="min-h-[72px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-foreground">
              <p>Salvo estipulação em contrário, este orçamento tem validade de <strong>{form.validityDays} dias</strong> a partir da data de emissão.</p>
              <p className="mt-1"><strong>Taxa de diagnóstico:</strong> R$ 30,00 (cobrada caso o orçamento seja reprovado ou expire sem conversão em OS).</p>
            </div>
            <div className="text-right text-sm font-semibold">Valor total: {formatCurrency(totalAmount)}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={saveBudget}>{editingId ? "Salvar alterações" : "Criar orçamento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Detalhes do orçamento</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <p><strong>{selected.code}</strong> • {statusLabel[selected.status]}</p>
              <p>Cliente: {selected.customerName}</p>
              <p>Aparelho: {selected.equipment}</p>
              <p>Problema: {selected.problemDescription}</p>
              <p>Validade: {new Date(selected.validUntilIso).toLocaleDateString("pt-BR")}</p>
              <p>Valor total: {formatCurrency(selected.totalAmount)}</p>
              {selected.discountAmount ? <p>Desconto: {formatCurrency(selected.discountAmount)}</p> : null}
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 font-medium">Itens</p>
                {selected.items.map((item) => <p key={item.id}>- {item.description} ({item.qty}x) {formatCurrency(item.unitPrice)}</p>)}
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="mb-2 font-medium">Histórico</p>
                {(selected.history || []).length === 0 && <p className="text-muted-foreground">Sem alterações registradas.</p>}
                {(selected.history || []).map((h, idx) => <p key={`${h.atIso}-${idx}`} className="text-xs">{new Date(h.atIso).toLocaleString("pt-BR")} • {h.by} • {h.action} {h.details ? `• ${h.details}` : ""}</p>)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Excluir orçamento</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Este orçamento será excluído e não poderá ser convertido em Ordem de Serviço.</p>
          <textarea className="min-h-[100px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm" placeholder="Motivo da exclusão (mínimo 10 caracteres)" value={deleteReason} onChange={(e) => setDeleteReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteReason.trim().length < 10} onClick={doDelete}>Confirmar exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

