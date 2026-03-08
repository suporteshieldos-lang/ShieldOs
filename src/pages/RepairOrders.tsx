import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, Wrench, FileText, Camera, Pencil, Trash2, MoreVertical, Image as ImageIcon, ChevronLeft, ChevronRight, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  useAppStore,
  formatCurrency,
  getOrderTotal,
  parseCurrency,
  getChecklistItems,
  RepairOrder,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  DEFAULT_CUSTOMER,
} from "@/store/appStore";
import { generateRepairOrderPDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  received: { label: "Recebido", color: "bg-slate-100 text-slate-700" },
  diagnosing: { label: "Diagnosticando", color: "bg-blue-100 text-blue-700" },
  repairing: { label: "Em Reparo", color: "bg-orange-100 text-orange-700" },
  waiting_parts: { label: "Aguardando Peça", color: "bg-violet-100 text-violet-700" },
  completed: { label: "Concluído", color: "bg-green-100 text-green-700" },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelada", color: "bg-rose-100 text-rose-700" },
};

const statusOptions: OrderStatus[] = [
  "received",
  "diagnosing",
  "repairing",
  "waiting_parts",
  "completed",
  "delivered",
  "cancelled",
];

const paymentLabels: Record<string, { label: string; color: string }> = {
  pago: { label: "Pago", color: "text-green-700" },
  pendente: { label: "Pendente", color: "text-orange-600" },
  parcial: { label: "Parcial", color: "text-warning" },
};
const paymentMethodOptions: PaymentMethod[] = ["pix", "dinheiro", "debito", "credito", "cartao", "outro"];
const paymentMethodLabel: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  cartao: "Cartão",
  outro: "Outro",
};

const statusFilters: Array<"all" | OrderStatus> = [
  "all",
  "received",
  "diagnosing",
  "repairing",
  "waiting_parts",
  "completed",
  "delivered",
  "cancelled",
];

type EditDraft = {
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerCpf: string;
  deviceType: "phone" | "notebook" | "tablet" | "printer";
  brand: string;
  model: string;
  serialImei: string;
  devicePassword: string;
  deviceColor: string;
  accessories: string;
  conditionNotes: string;
  checklist: Record<string, boolean>;
  reportedProblem: string;
  technician: string;
  estimatedDelivery: string;
  serviceCost: string;
  discount: string;
  paymentStatus: PaymentStatus;
  usedParts: Array<{
    name: string;
    qty: string;
    unitCost: string;
  }>;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });
}

function createDraft(order: RepairOrder): EditDraft {
  return {
    status: order.status,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    customerCpf: order.customerCpf,
    deviceType: order.deviceType,
    brand: order.brand,
    model: order.model,
    serialImei: order.serialImei,
    devicePassword: order.devicePassword,
    deviceColor: order.deviceColor,
    accessories: order.accessories,
    conditionNotes: order.conditionNotes,
    checklist: { ...order.checklist },
    reportedProblem: order.reportedProblem,
    technician: order.technician,
    estimatedDelivery: order.estimatedDelivery,
    serviceCost: order.serviceCost > 0 ? formatCurrency(order.serviceCost) : "",
    discount: formatCurrency(order.discount),
    paymentStatus: order.paymentStatus,
    usedParts: order.usedParts.map((part) => ({
      name: part.name,
      qty: String(part.qty),
      unitCost: formatCurrency(part.unitCost),
    })),
  };
}

function askPaymentMethod(defaultValue: PaymentMethod = "pix"): PaymentMethod | null {
  const typed = window
    .prompt("Informe o meio de pagamento (pix, dinheiro, debito, credito, cartao, outro):", defaultValue)
    ?.trim()
    .toLowerCase();
  if (!typed) return null;
  if (!paymentMethodOptions.includes(typed as PaymentMethod)) return null;
  return typed as PaymentMethod;
}

export default function RepairOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orders, customers, updateOrder, deleteOrder, responsibilityTerm, companyInfo } = useAppStore();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(new URLSearchParams(location.search).get("alert") === "unpaid");
  const [generatingPdfId, setGeneratingPdfId] = useState("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [editTab, setEditTab] = useState<"dados" | "pecas" | "fotos" | "checklist">("dados");
  const [selectedEditCustomerId, setSelectedEditCustomerId] = useState<string>(DEFAULT_CUSTOMER.id);
  const [previewGallery, setPreviewGallery] = useState<{
    title: string;
    items: Array<{ src: string; label: string }>;
    index: number;
  } | null>(null);
  const [expandedProblems, setExpandedProblems] = useState<Record<string, boolean>>({});

  const filtered = orders.filter((order) => {
    const text = search.toLowerCase();
    const matchSearch =
      order.customerName.toLowerCase().includes(text) ||
      order.id.toLowerCase().includes(text) ||
      order.model.toLowerCase().includes(text);
    const matchFilter = filter === "all" || order.status === filter;
    const matchUnpaid = !showOnlyUnpaid || order.paymentStatus !== "pago";
    return matchSearch && matchFilter && matchUnpaid;
  });

  const editingOrder = useMemo(
    () => (editingOrderId ? orders.find((item) => item.id === editingOrderId) ?? null : null),
    [editingOrderId, orders]
  );
  const technicianOptions = useMemo(() => {
    const fromOrders = orders.map((order) => order.technician.trim()).filter(Boolean);
    const merged = [...fromOrders, draft?.technician?.trim() || ""].filter(Boolean);
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b));
  }, [orders, draft?.technician]);

  const customerOptions = useMemo(
    () => customers.filter((customer) => customer.id !== DEFAULT_CUSTOMER.id),
    [customers]
  );

  const checklistItems = draft ? getChecklistItems(draft.deviceType) : [];

  const openEditModal = (order: RepairOrder) => {
    setEditingOrderId(order.id);
    setDraft(createDraft(order));
    setEditTab("dados");
    const matchedCustomer = customers.find(
      (customer) =>
        customer.name.trim().toLowerCase() === order.customerName.trim().toLowerCase() &&
        customer.phone.replace(/\D/g, "") === order.customerPhone.replace(/\D/g, "")
    );
    setSelectedEditCustomerId(matchedCustomer?.id || DEFAULT_CUSTOMER.id);
  };

  const openPhotosModal = (order: RepairOrder) => {
    openEditModal(order);
    setEditTab("fotos");
  };

  const closeEditModal = () => {
    setEditingOrderId(null);
    setDraft(null);
    setEditTab("dados");
    setSelectedEditCustomerId(DEFAULT_CUSTOMER.id);
  };

  const handleSelectEditCustomer = (customerId: string) => {
    if (!draft) return;
    setSelectedEditCustomerId(customerId);
    if (customerId === DEFAULT_CUSTOMER.id) {
      setDraft({
        ...draft,
        customerName: DEFAULT_CUSTOMER.name,
        customerPhone: DEFAULT_CUSTOMER.phone,
        customerEmail: DEFAULT_CUSTOMER.email,
        customerCpf: DEFAULT_CUSTOMER.cpf,
      });
      return;
    }
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) return;
    setDraft({
      ...draft,
      customerName: customer.name,
      customerPhone: customer.phone || "Não informado",
      customerEmail: customer.email || "",
      customerCpf: customer.cpf || "",
    });
  };

  const handleSaveEdit = () => {
    if (!editingOrder || !draft) return;
    const normalizedParts = draft.usedParts
      .map((part) => {
        const qty = Math.max(0, parseInt(part.qty, 10) || 0);
        const unitCost = Math.max(0, parseCurrency(part.unitCost));
        return {
          name: part.name.trim(),
          qty,
          unitCost,
        };
      })
      .filter((part) => part.name && part.qty > 0);
    const partsCost = normalizedParts.reduce((sum, part) => sum + part.qty * part.unitCost, 0);

    const payingNow = editingOrder.paymentStatus !== "pago" && draft.paymentStatus === "pago";
    const selectedPaymentMethod = payingNow ? askPaymentMethod(editingOrder.paymentMethod || "pix") : editingOrder.paymentMethod;
    if (payingNow && !selectedPaymentMethod) {
      toast.error("Meio de pagamento inválido.");
      return;
    }

    const completedStatuses: OrderStatus[] = ["completed", "delivered", "cancelled"];
    const nextCompletedDate =
      completedStatuses.includes(draft.status) && !editingOrder.completedDate
        ? new Date().toLocaleDateString("pt-BR")
        : editingOrder.completedDate;

    const result = updateOrder(editingOrder.id, {
      status: draft.status,
      customerName: draft.customerName,
      customerPhone: draft.customerPhone,
      customerEmail: draft.customerEmail,
      customerCpf: draft.customerCpf,
      deviceType: draft.deviceType,
      brand: draft.brand,
      model: draft.model,
      serialImei: draft.serialImei,
      devicePassword: draft.devicePassword,
      deviceColor: draft.deviceColor,
      accessories: draft.accessories,
      conditionNotes: draft.conditionNotes,
      checklist: draft.checklist,
      reportedProblem: draft.reportedProblem,
      technician: draft.technician,
      estimatedDelivery: draft.estimatedDelivery,
      paymentStatus: draft.paymentStatus,
      paymentMethod: selectedPaymentMethod,
      paymentDate: draft.paymentStatus === "pago" ? new Date().toLocaleDateString("pt-BR") : editingOrder.paymentDate,
      serviceCost: parseCurrency(draft.serviceCost),
      discount: parseCurrency(draft.discount),
      usedParts: normalizedParts,
      partsCost,
      partsUsed: normalizedParts.map((part) => `${part.name} (${part.qty}x)`).join(", "),
      cost: draft.serviceCost || "-",
      completedDate: nextCompletedDate,
    });
    if (!result.ok) {
      toast.error(result.message || "Não foi possível atualizar a ordem.");
      return;
    }
    toast.success(`Ordem ${editingOrder.id} atualizada.`);
    closeEditModal();
  };

  const handleTogglePayment = (order: RepairOrder) => {
    if (order.paymentStatus !== "pago") {
      const selectedMethod = askPaymentMethod(order.paymentMethod || "pix");
      if (!selectedMethod) {
        toast.error("Meio de pagamento inválido.");
        return;
      }
      const result = updateOrder(order.id, {
        paymentStatus: "pago",
        paymentMethod: selectedMethod,
        paymentDate: new Date().toLocaleDateString("pt-BR"),
      });
      if (!result.ok) {
        toast.error(result.message || "Não foi possível marcar como pago.");
        return;
      }
      toast.success(`Pagamento da ${order.id} registrado via ${paymentMethodLabel[selectedMethod]}.`);
      return;
    }
    const confirm = window.confirm(`Desmarcar pagamento da ${order.id} e voltar para pendente?`);
    if (!confirm) return;
    const result = updateOrder(order.id, { paymentStatus: "pendente", paymentDate: "" });
    if (!result.ok) {
      toast.error(result.message || "Não foi possível desmarcar o pagamento.");
      return;
    }
    toast.success(`Pagamento da ${order.id} desmarcado e sincronizado no financeiro.`);
  };

  const handleExitPhotos = async (order: RepairOrder, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = Math.max(0, 5 - order.exitPhotos.length);
    if (remaining === 0) {
      toast.error("Limite de 5 fotos de saída atingido.");
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    try {
      const newPhotos = await Promise.all(selected.map(readFileAsDataUrl));
      updateOrder(order.id, { exitPhotos: [...order.exitPhotos, ...newPhotos] });
      toast.success(`Fotos de saída adicionadas a ${order.id}.`);
    } catch {
      toast.error("Não foi possível processar as imagens de saída.");
    }
  };

  const handleRemoveExitPhoto = (order: RepairOrder, index: number) => {
    updateOrder(order.id, { exitPhotos: order.exitPhotos.filter((_, i) => i !== index) });
  };

  const handleEntryPhotos = async (order: RepairOrder, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = Math.max(0, 5 - order.entryPhotos.length);
    if (remaining === 0) {
      toast.error("Limite de 5 fotos de entrada atingido.");
      return;
    }
    const selected = Array.from(files).slice(0, remaining);
    try {
      const newPhotos = await Promise.all(selected.map(readFileAsDataUrl));
      updateOrder(order.id, { entryPhotos: [...order.entryPhotos, ...newPhotos] });
      toast.success(`Fotos de entrada adicionadas a ${order.id}.`);
    } catch {
      toast.error("Não foi possível processar as imagens de entrada.");
    }
  };

  const handleRemoveEntryPhoto = (order: RepairOrder, index: number) => {
    updateOrder(order.id, { entryPhotos: order.entryPhotos.filter((_, i) => i !== index) });
  };

  const handleGeneratePdf = async (order: RepairOrder) => {
    setGeneratingPdfId(order.id);
    try {
      await generateRepairOrderPDF(order, responsibilityTerm, companyInfo);
      toast.success(`PDF da ${order.id} gerado com sucesso.`);
    } catch {
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setGeneratingPdfId("");
    }
  };

  return (
    <div className="premium-page">
      <section className="saas-card">
        <h2 className="saas-title">Ordens de Serviço</h2>
        <p className="saas-subtitle">Fluxo operacional completo: triagem, diagnóstico, execução, entrega e cobrança.</p>
      </section>

      <div className="premium-toolbar flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por OS, cliente ou dispositivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 sm:w-96"
          />
        </div>
        <Button className="gap-2" onClick={() => navigate("/ordens/nova")}>
          <Plus className="h-4 w-4" />
          Nova Ordem
        </Button>
      </div>

      <div className="saas-card-soft flex flex-wrap gap-2">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === status
                ? "border border-[#C9D9EB] bg-[#E9F1FB] text-[#1F3A5F]"
                : "border border-transparent bg-slate-100/70 text-slate-500 hover:bg-slate-200/70"
            }`}
          >
            {status === "all" ? "Todas" : statusConfig[status].label}
          </button>
        ))}
      </div>
      {showOnlyUnpaid && (
        <div className="saas-card-soft flex items-center gap-2 border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-foreground">
          Filtro ativo: OS sem pagamento
          <Button
            type="button"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setShowOnlyUnpaid(false);
              navigate("/ordens", { replace: true });
            }}
          >
            Limpar filtro
          </Button>
        </div>
      )}

      <div className="space-y-5">
        {filtered.map((order, index) => {
          const status = statusConfig[order.status];
          const payment = paymentLabels[order.paymentStatus] || { label: order.paymentStatus, color: "text-muted-foreground" };
          const total = getOrderTotal(order);
          const hasPhotos = order.entryPhotos.length + order.exitPhotos.length > 0;
          const isExpanded = !!expandedProblems[order.id];
          const amountClass = order.paymentStatus === "pago" ? "is-paid" : "is-pending";
          const paymentBadgeClass =
            order.paymentStatus === "pago"
              ? "os-payment-paid"
              : order.paymentStatus === "pendente"
              ? "os-payment-pending"
              : "os-payment-partial";
          const photosSummary = hasPhotos ? `Entrada ${order.entryPhotos.length} | Saída ${order.exitPhotos.length}` : "Sem fotos";

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className={`glass-card os-card os-status-${order.status}`}
            >
              <input
                id={`exit-${order.id}`}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleExitPhotos(order, e.target.files);
                  e.currentTarget.value = "";
                }}
              />

              <div className="os-top">
                <div className="os-identity">
                  <p className="os-customer">{order.customerName}</p>
                  <p className="os-device">
                    {order.model} ({order.brand})
                  </p>
                  <div className="os-id-row">
                    <Wrench className="h-3.5 w-3.5" />
                    <span>{order.id}</span>
                  </div>
                </div>
                <div className="os-status-stack">
                  <Badge className={`os-badge os-badge-status os-status-${order.status}`}>{status.label}</Badge>
                  <span className={`os-badge os-badge-payment ${paymentBadgeClass}`}>{payment.label}</span>
                </div>
              </div>

              <div className="os-body">
                <p className={`os-description ${isExpanded ? "" : "line-clamp-3"}`}>{order.reportedProblem}</p>
                {order.reportedProblem && order.reportedProblem.length > 120 && (
                  <button
                    type="button"
                    className="os-expand-btn"
                    onClick={() => setExpandedProblems((prev) => ({ ...prev, [order.id]: !prev[order.id] }))}
                  >
                    {isExpanded ? "ver menos" : "ver mais"}
                  </button>
                )}

                <div className="os-meta-line">
                  <span>
                    <User className="h-3.5 w-3.5" />
                    Técnico: {order.technician || "-"}
                  </span>
                  <span>
                    <Calendar className="h-3.5 w-3.5" />
                    Criado: {order.date}
                  </span>
                </div>

                <div className="os-context-grid">
                  <div className="os-photos">
                    <label className="os-section-label">Fotos</label>
                    <div className="os-photos-box">
                      <div className="os-photos-left">
                        <Camera className="h-4 w-4" />
                        <span>{photosSummary}</span>
                      </div>
                      <button
                        type="button"
                        className="os-photos-link"
                        disabled={!hasPhotos}
                        onClick={() => {
                          const entryItems = order.entryPhotos.map((src, idx) => ({ src, label: `Entrada ${idx + 1}` }));
                          const exitItems = order.exitPhotos.map((src, idx) => ({ src, label: `Saída ${idx + 1}` }));
                          const items = [...entryItems, ...exitItems];
                          if (items.length > 0) {
                            setPreviewGallery({
                              title: `${order.id} - Fotos`,
                              items,
                              index: 0,
                            });
                          }
                        }}
                      >
                        {hasPhotos ? "ver fotos" : "sem fotos"}
                      </button>
                    </div>
                  </div>

                  <div className="os-total">
                    <span className="os-section-label">Valor total</span>
                    <p className={`os-total-value ${amountClass}`}>{total > 0 ? formatCurrency(total) : "-"}</p>
                  </div>
                </div>
              </div>

              <div className="os-footer">
                <div className="os-footer-actions">
                  <Button
                    type="button"
                    variant="outline"
                    className="os-btn-secondary"
                    onClick={() => handleTogglePayment(order)}
                  >
                    {order.paymentStatus === "pago" ? "Desmarcar pago" : "Marcar como pago"}
                  </Button>
                  <Button className="os-btn-primary" onClick={() => openEditModal(order)}>
                    <Pencil className="h-4 w-4" />
                    Abrir OS
                  </Button>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="os-menu-btn">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => handleGeneratePdf(order)}
                      disabled={generatingPdfId === order.id}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {generatingPdfId === order.id ? "Gerando PDF..." : "Gerar PDF"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => (document.getElementById(`exit-${order.id}`) as HTMLInputElement | null)?.click()}>
                      <Camera className="mr-2 h-4 w-4" />
                      Adicionar foto de saída
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openPhotosModal(order)}>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Gerenciar fotos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        if (!window.confirm(`Deseja excluir a ordem ${order.id}?`)) return;
                        deleteOrder(order.id);
                        toast.success(`Ordem ${order.id} excluída.`);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir OS
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">Nenhuma ordem encontrada.</div>}
      </div>

      <Dialog open={Boolean(editingOrder && draft)} onOpenChange={(open) => (!open ? closeEditModal() : null)}>
        <DialogContent className="max-h-[92vh] w-[96vw] max-w-[1240px] overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Editar Ordem {editingOrder?.id}</DialogTitle>
          </DialogHeader>

          {editingOrder && draft && (
            <div className="max-h-[calc(92vh-160px)] space-y-6 overflow-y-auto px-6 py-5">
              <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background/95 px-6 pb-3 pt-1 backdrop-blur">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTab("dados")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${editTab === "dados" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted/60"}`}
                  >
                    Dados da OS
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTab("pecas")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${editTab === "pecas" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted/60"}`}
                  >
                    Peças
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTab("fotos")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${editTab === "fotos" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted/60"}`}
                  >
                    Fotos
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTab("checklist")}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${editTab === "checklist" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted/60"}`}
                  >
                    Checklist
                  </button>
                </div>
              </div>

              {editTab === "dados" && (
              <section className="rounded-2xl border border-border/70 bg-muted/10 p-5 md:p-6">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dados da OS</p>
                <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Tipo de dispositivo</label>
                  <select
                    value={draft.deviceType}
                    onChange={(e) => setDraft({ ...draft, deviceType: e.target.value as EditDraft["deviceType"] })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  >
                    <option value="phone">SMARTPHONE</option>
                    <option value="tablet">TABLET</option>
                    <option value="notebook">NOTEBOOK</option>
                    <option value="printer">IMPRESSORA</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Cliente</label>
                  <select
                    value={selectedEditCustomerId}
                    onChange={(e) => handleSelectEditCustomer(e.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  >
                    <option value={DEFAULT_CUSTOMER.id}>Não Identificado</option>
                    {customerOptions.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Telefone</label>
                  <input
                    value={draft.customerPhone}
                    onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">E-mail</label>
                  <input
                    value={draft.customerEmail}
                    onChange={(e) => setDraft({ ...draft, customerEmail: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">CPF</label>
                  <input
                    value={draft.customerCpf}
                    onChange={(e) => setDraft({ ...draft, customerCpf: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Técnico</label>
                  <select
                    value={draft.technician}
                    onChange={(e) => setDraft({ ...draft, technician: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  >
                    <option value="">Selecione um técnico</option>
                    {technicianOptions.map((technician) => (
                      <option key={technician} value={technician}>
                        {technician}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Status da ordem</label>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value as OrderStatus })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {statusConfig[option].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Marca</label>
                  <input
                    value={draft.brand}
                    onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Modelo</label>
                  <input
                    value={draft.model}
                    onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">IMEI / Série</label>
                  <input
                    value={draft.serialImei}
                    onChange={(e) => setDraft({ ...draft, serialImei: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Cor</label>
                  <input
                    value={draft.deviceColor}
                    onChange={(e) => setDraft({ ...draft, deviceColor: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Senha do dispositivo</label>
                  <input
                    value={draft.devicePassword}
                    onChange={(e) => setDraft({ ...draft, devicePassword: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Acessórios</label>
                  <input
                    value={draft.accessories}
                    onChange={(e) => setDraft({ ...draft, accessories: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Previsão de entrega</label>
                  <input
                    value={draft.estimatedDelivery}
                    onChange={(e) => setDraft({ ...draft, estimatedDelivery: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Valor do serviço</label>
                  <input
                    value={draft.serviceCost}
                    onChange={(e) => setDraft({ ...draft, serviceCost: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                    placeholder="Ex: R$ 200,00"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Desconto</label>
                  <input
                    value={draft.discount}
                    onChange={(e) => setDraft({ ...draft, discount: e.target.value })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                    placeholder="Ex: R$ 10,00"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Status do pagamento</label>
                  <select
                    value={draft.paymentStatus}
                    onChange={(e) => setDraft({ ...draft, paymentStatus: e.target.value as PaymentStatus })}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="parcial">Parcial</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Estado do aparelho</label>
                  <textarea
                    value={draft.conditionNotes}
                    onChange={(e) => setDraft({ ...draft, conditionNotes: e.target.value })}
                    className="min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Problema relatado</label>
                  <textarea
                    value={draft.reportedProblem}
                    onChange={(e) => setDraft({ ...draft, reportedProblem: e.target.value })}
                    className="min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm"
                  />
                </div>
                </div>
              </section>
              )}

              {editTab === "pecas" && (
              <section className="rounded-2xl border border-border/70 p-5 md:p-6">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Peças</p>
                <div className="mb-3 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        usedParts: [...draft.usedParts, { name: "", qty: "1", unitCost: "R$ 0,00" }],
                      })
                    }
                  >
                    + Adicionar peça
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  {draft.usedParts.map((part, index) => (
                    <div key={`part-${index}`} className="grid gap-2 sm:grid-cols-12">
                      <input
                        className="h-10 rounded-lg border border-input bg-card px-3 text-sm sm:col-span-6"
                        placeholder="Nome da peça"
                        value={part.name}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            usedParts: draft.usedParts.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                          })
                        }
                      />
                      <input
                        className="h-10 rounded-lg border border-input bg-card px-3 text-sm sm:col-span-2"
                        placeholder="Qtd"
                        type="number"
                        min="1"
                        value={part.qty}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            usedParts: draft.usedParts.map((item, i) => (i === index ? { ...item, qty: e.target.value } : item)),
                          })
                        }
                      />
                      <input
                        className="h-10 rounded-lg border border-input bg-card px-3 text-sm sm:col-span-3"
                        placeholder="Custo unitário"
                        value={part.unitCost}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            usedParts: draft.usedParts.map((item, i) =>
                              i === index ? { ...item, unitCost: e.target.value } : item
                            ),
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 border-destructive/30 text-destructive hover:bg-destructive/10 sm:col-span-1"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            usedParts: draft.usedParts.filter((_, i) => i !== index),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {draft.usedParts.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma peça adicionada nesta OS.</p>
                  )}
                </div>

                <div className="mt-3 text-right text-sm font-semibold text-foreground">
                  Custo total de peças:{" "}
                  {formatCurrency(
                    draft.usedParts.reduce((sum, part) => {
                      const qty = Math.max(0, parseInt(part.qty, 10) || 0);
                      const unitCost = Math.max(0, parseCurrency(part.unitCost));
                      return sum + qty * unitCost;
                    }, 0)
                  )}
                </div>
              </section>
              )}

              {editTab === "fotos" && (
              <section className="rounded-2xl border border-border/70 p-5 md:p-6">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Fotos</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Fotos de entrada</p>
                      <label
                        htmlFor={`entry-modal-${editingOrder.id}`}
                        className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-input px-2 text-xs text-foreground hover:bg-muted/50"
                      >
                        <Camera className="mr-1 h-3.5 w-3.5" />
                        Adicionar
                      </label>
                    </div>
                    <input
                      id={`entry-modal-${editingOrder.id}`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleEntryPhotos(editingOrder, e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {editingOrder.entryPhotos.map((photo, index) => (
                        <button
                          key={`entry-photo-${index}`}
                          type="button"
                          className="group relative overflow-hidden rounded-lg border border-border"
                          onClick={() => handleRemoveEntryPhoto(editingOrder, index)}
                          title="Remover foto de entrada"
                        >
                          <img src={photo} alt={`Entrada ${index + 1}`} className="h-20 w-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            Remover
                          </span>
                        </button>
                      ))}
                      {editingOrder.entryPhotos.length === 0 && (
                        <div className="col-span-3 rounded-lg border border-dashed border-border px-2 py-5 text-center text-xs text-muted-foreground">
                          Nenhuma foto de entrada.
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">Fotos de saída</p>
                      <label
                        htmlFor={`exit-modal-${editingOrder.id}`}
                        className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-input px-2 text-xs text-foreground hover:bg-muted/50"
                      >
                        <Camera className="mr-1 h-3.5 w-3.5" />
                        Adicionar
                      </label>
                    </div>
                    <input
                      id={`exit-modal-${editingOrder.id}`}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleExitPhotos(editingOrder, e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {editingOrder.exitPhotos.map((photo, index) => (
                        <button
                          key={`exit-photo-${index}`}
                          type="button"
                          className="group relative overflow-hidden rounded-lg border border-border"
                          onClick={() => handleRemoveExitPhoto(editingOrder, index)}
                          title="Remover foto de saída"
                        >
                          <img src={photo} alt={`Saída ${index + 1}`} className="h-20 w-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                            Remover
                          </span>
                        </button>
                      ))}
                      {editingOrder.exitPhotos.length === 0 && (
                        <div className="col-span-3 rounded-lg border border-dashed border-border px-2 py-5 text-center text-xs text-muted-foreground">
                          Nenhuma foto de saída.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
              )}

              {editTab === "checklist" && (
              <section className="rounded-2xl border border-border/70 p-5 md:p-6">
                <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Checklist</p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {checklistItems.map((item) => (
                    <label key={item} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!draft.checklist[item]}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            checklist: { ...draft.checklist, [item]: e.target.checked },
                          })
                        }
                        className="h-4 w-4 accent-primary"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </section>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={closeEditModal}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar alterações</Button>
          </div>

          {editingOrder?.history && editingOrder.history.length > 0 && (
            <div className="mx-6 mb-6 rounded-lg border border-border p-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Histórico de alterações</p>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {editingOrder.history.slice(0, 20).map((entry, index) => (
                  <div key={`${entry.at}-${index}`} className="rounded border border-border/60 p-2 text-xs">
                    <p className="font-medium text-foreground">
                      {entry.at} - {entry.action}
                    </p>
                    <p className="text-muted-foreground">Campos: {entry.changedFields.join(", ") || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewGallery)} onOpenChange={(open) => (!open ? setPreviewGallery(null) : null)}>
        <DialogContent className="max-w-3xl overflow-hidden p-0">
          {previewGallery && (
            <div className="bg-black">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-sm font-medium text-white">
                <span>{previewGallery.title}</span>
                <span className="text-xs text-white/80">
                  {previewGallery.index + 1}/{previewGallery.items.length}
                </span>
              </div>
              <div className="relative">
                <img
                  src={previewGallery.items[previewGallery.index].src}
                  alt={previewGallery.items[previewGallery.index].label}
                  className="max-h-[74vh] w-full object-contain"
                />
                {previewGallery.items.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
                      onClick={() =>
                        setPreviewGallery((prev) =>
                          prev
                            ? {
                                ...prev,
                                index: (prev.index - 1 + prev.items.length) % prev.items.length,
                              }
                            : prev
                        )
                      }
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
                      onClick={() =>
                        setPreviewGallery((prev) =>
                          prev
                            ? {
                                ...prev,
                                index: (prev.index + 1) % prev.items.length,
                              }
                            : prev
                        )
                      }
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>
              <div className="border-t border-white/10 px-4 py-1.5 text-xs text-white/80">
                {previewGallery.items[previewGallery.index].label}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


