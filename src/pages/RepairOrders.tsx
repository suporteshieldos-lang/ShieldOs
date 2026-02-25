import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, Wrench, FileText, Camera, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  useAppStore,
  formatCurrency,
  getOrderTotal,
  parseCurrency,
  getChecklistItems,
  RepairOrder,
  OrderStatus,
  PaymentStatus,
  DEFAULT_CUSTOMER,
} from "@/store/appStore";
import { generateRepairOrderPDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  received: { label: "Recebido", color: "bg-secondary text-secondary-foreground" },
  diagnosing: { label: "Diagnosticando", color: "bg-info/10 text-info" },
  repairing: { label: "Em Reparo", color: "bg-accent/10 text-accent" },
  waiting_parts: { label: "Aguardando Peça", color: "bg-warning/10 text-warning" },
  completed: { label: "Concluido", color: "bg-success/10 text-success" },
  delivered: { label: "Entregue", color: "bg-muted text-muted-foreground" },
  cancelled: { label: "Cancelada", color: "bg-destructive/10 text-destructive" },
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
  pago: { label: "Pago", color: "text-success" },
  pendente: { label: "Pendente", color: "text-destructive" },
  parcial: { label: "Parcial", color: "text-warning" },
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
  const [customTechnicians, setCustomTechnicians] = useState<string[]>([]);
  const [newTechnicianName, setNewTechnicianName] = useState("");

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
    const merged = [...fromOrders, ...customTechnicians, draft?.technician?.trim() || ""].filter(Boolean);
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b));
  }, [orders, customTechnicians, draft?.technician]);

  const customerOptions = useMemo(
    () => customers.filter((customer) => customer.id !== DEFAULT_CUSTOMER.id),
    [customers]
  );

  const checklistItems = draft ? getChecklistItems(draft.deviceType) : [];

  const handleStatusChange = (order: RepairOrder, nextStatus: OrderStatus) => {
    const today = new Date().toLocaleDateString("pt-BR");
    const updates: Partial<RepairOrder> = { status: nextStatus };
    if ((nextStatus === "completed" || nextStatus === "delivered" || nextStatus === "cancelled") && !order.completedDate) {
      updates.completedDate = today;
    }
    updateOrder(order.id, updates);
    toast.success(`Status da ${order.id} atualizado para ${statusConfig[nextStatus].label}.`);
  };

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
    setNewTechnicianName("");
  };

  const closeEditModal = () => {
    setEditingOrderId(null);
    setDraft(null);
    setEditTab("dados");
    setSelectedEditCustomerId(DEFAULT_CUSTOMER.id);
    setNewTechnicianName("");
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

  const handleAddTechnician = () => {
    if (!draft) return;
    const normalized = newTechnicianName.trim();
    if (!normalized) {
      toast.error("Informe o nome do técnico.");
      return;
    }
    setCustomTechnicians((prev) => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setDraft({ ...draft, technician: normalized });
    setNewTechnicianName("");
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

    const result = updateOrder(editingOrder.id, {
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
      serviceCost: parseCurrency(draft.serviceCost),
      discount: parseCurrency(draft.discount),
      usedParts: normalizedParts,
      partsCost,
      partsUsed: normalizedParts.map((part) => `${part.name} (${part.qty}x)`).join(", "),
      cost: draft.serviceCost || "-",
    });
    if (!result.ok) {
      toast.error(result.message || "Não foi possível atualizar a ordem.");
      return;
    }
    toast.success(`Ordem ${editingOrder.id} atualizada.`);
    closeEditModal();
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === status ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {status === "all" ? "Todas" : statusConfig[status].label}
          </button>
        ))}
      </div>
      {showOnlyUnpaid && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-foreground">
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

      <div className="space-y-3">
        {filtered.map((order, index) => {
          const status = statusConfig[order.status];
          const payment = paymentLabels[order.paymentStatus] || { label: order.paymentStatus, color: "text-muted-foreground" };
          const total = getOrderTotal(order);

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass-card rounded-xl p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Wrench className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">{order.id}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>{status.label}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {order.customerName} - {order.model} ({order.brand})
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{order.reportedProblem}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/40 p-3 text-right">
                      <p className="font-semibold text-foreground">{total > 0 ? formatCurrency(total) : "-"}</p>
                      <p className={`text-xs font-medium ${payment.color}`}>{payment.label}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 text-right text-xs text-muted-foreground">
                      <p>Tec: {order.technician || "-"}</p>
                      <p>Criado: {order.date}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-border pt-4 lg:grid-cols-5">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Status da ordem</label>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                      className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {statusConfig[option].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Fotos de saída</label>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`exit-${order.id}`}
                        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-input px-3 text-sm text-foreground hover:bg-muted/50"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Adicionar
                      </label>
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
                      <span className="text-xs text-muted-foreground">{order.exitPhotos.length}/5</span>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">PDF</label>
                    <Button
                      variant="outline"
                      onClick={() => handleGeneratePdf(order)}
                      disabled={generatingPdfId === order.id}
                      className="h-10 w-full gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      {generatingPdfId === order.id ? "Gerando..." : "Gerar PDF"}
                    </Button>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Detalhes</label>
                    <Button variant="outline" className="h-10 w-full gap-2" onClick={() => openEditModal(order)}>
                      <Pencil className="h-4 w-4" />
                      Abrir e editar
                    </Button>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Excluir</label>
                    <Button
                      variant="outline"
                      className="h-10 w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (!window.confirm(`Deseja excluir a ordem ${order.id}?`)) return;
                        deleteOrder(order.id);
                        toast.success(`Ordem ${order.id} excluida.`);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir OS
                    </Button>
                  </div>
                </div>

                {order.exitPhotos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {order.exitPhotos.map((photo, photoIndex) => (
                      <button
                        key={`${order.id}-exit-${photoIndex}`}
                        onClick={() => handleRemoveExitPhoto(order, photoIndex)}
                        className="group relative overflow-hidden rounded-lg border border-border"
                        title="Remover foto de saída"
                      >
                        <img src={photo} alt={`Foto de saída ${photoIndex + 1}`} className="h-20 w-full object-cover" />
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Remover
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && <div className="py-12 text-center text-muted-foreground">Nenhuma ordem encontrada.</div>}
      </div>

      <Dialog open={Boolean(editingOrder && draft)} onOpenChange={(open) => (!open ? closeEditModal() : null)}>
        <DialogContent className="max-h-[92vh] w-[95vw] max-w-[1120px] overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Editar Ordem {editingOrder?.id}</DialogTitle>
          </DialogHeader>

          {editingOrder && draft && (
            <div className="max-h-[calc(92vh-160px)] space-y-5 overflow-y-auto px-6 py-5">
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
              <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
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

                <div className="rounded-lg border border-border bg-muted/20 p-3 md:col-span-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => handleSelectEditCustomer(DEFAULT_CUSTOMER.id)}>
                      Marcar como Não Identificado
                    </Button>
                    <p className="text-xs text-muted-foreground">Para cadastrar novo cliente, use o módulo Clientes.</p>
                  </div>
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
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Cadastrar técnico rápido</label>
                  <div className="grid gap-2 md:grid-cols-3">
                    <input
                      value={newTechnicianName}
                      onChange={(e) => setNewTechnicianName(e.target.value)}
                      className="h-10 rounded-lg border border-input bg-card px-3 text-sm sm:col-span-2"
                      placeholder="Nome do técnico"
                    />
                    <Button type="button" variant="outline" className="h-10" onClick={handleAddTechnician}>
                      Adicionar técnico
                    </Button>
                  </div>
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
              </div>
              )}

              {editTab === "pecas" && (
              <div className="rounded-xl border border-border/70 p-4">
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
              </div>
              )}

              {editTab === "fotos" && (
              <div className="rounded-xl border border-border/70 p-4">
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
              </div>
              )}

              {editTab === "checklist" && (
              <div className="rounded-xl border border-border/70 p-4">
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
              </div>
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
    </div>
  );
}


