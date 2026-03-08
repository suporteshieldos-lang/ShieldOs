import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Plus, FileText, Camera, Pencil, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight, Smartphone, Laptop, Monitor, Tv, Tablet, Wrench, Clock3, CheckCircle2, AlertTriangle, Wallet, Eye, MessageCircle, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const statusConfig: Record<OrderStatus, { label: string; color: string; stripe: string }> = {
  received: { label: "Recebido", color: "bg-blue-50 text-blue-600", stripe: "bg-blue-500" },
  diagnosing: { label: "Diagnóstico", color: "bg-purple-50 text-purple-600", stripe: "bg-purple-500" },
  repairing: { label: "Em reparo", color: "bg-orange-50 text-orange-600", stripe: "bg-orange-500" },
  waiting_parts: { label: "Aguardando peça", color: "bg-yellow-50 text-yellow-700", stripe: "bg-yellow-500" },
  completed: { label: "Pronto", color: "bg-teal-50 text-teal-700", stripe: "bg-teal-500" },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-800", stripe: "bg-green-700" },
  cancelled: { label: "Cancelado", color: "bg-red-50 text-red-600", stripe: "bg-red-500" },
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

const paymentMethodOptions: PaymentMethod[] = ["pix", "dinheiro", "debito", "credito", "cartao", "outro"];
const paymentMethodLabel: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  debito: "Débito",
  credito: "Crédito",
  cartao: "Cartão",
  outro: "Outro",
};

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

function DeviceIcon({ type }: { type: RepairOrder["deviceType"] }) {
  if (type === "phone") return <Smartphone className="h-3.5 w-3.5 text-slate-400" />;
  if (type === "notebook") return <Laptop className="h-3.5 w-3.5 text-slate-400" />;
  if (type === "tablet") return <Tablet className="h-3.5 w-3.5 text-slate-400" />;
  if (type === "printer") return <Monitor className="h-3.5 w-3.5 text-slate-400" />;
  return <Tv className="h-3.5 w-3.5 text-slate-400" />;
}

function parseBrDate(value: string): Date | null {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysSince(dateValue: string): number {
  const parsed = parseBrDate(dateValue);
  if (!parsed) return 0;
  const now = new Date();
  parsed.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)));
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "T";
}

function normalizeSearch(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

export default function RepairOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialOsQuery = new URLSearchParams(location.search).get("os") || "";
  const { orders, customers, updateOrder, deleteOrder, responsibilityTerm, companyInfo } = useAppStore();
  const [search, setSearch] = useState(initialOsQuery);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [showOnlyUnpaid, setShowOnlyUnpaid] = useState(new URLSearchParams(location.search).get("alert") === "unpaid");
  const [staleOnly, setStaleOnly] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState("all");
  const [openedFromQuery, setOpenedFromQuery] = useState(false);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [generatingPdfId, setGeneratingPdfId] = useState("");
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [internalNotes, setInternalNotes] = useState<Record<string, string>>({});
  const [techChecklist, setTechChecklist] = useState<Record<string, { battery: boolean; motherboard: boolean; display: boolean; charging: boolean }>>({});
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [editTab, setEditTab] = useState<"dados" | "pecas" | "fotos" | "checklist">("dados");
  const [selectedEditCustomerId, setSelectedEditCustomerId] = useState<string>(DEFAULT_CUSTOMER.id);
  const [previewGallery, setPreviewGallery] = useState<{
    title: string;
    items: Array<{ src: string; label: string }>;
    index: number;
  } | null>(null);

  const filtered = orders.filter((order) => {
    const text = search.trim().toLowerCase();
    const normalized = normalizeSearch(text);
    const numericOnly = text.replace(/\D/g, "");
    const orderIdNormalized = normalizeSearch(order.id);
    const orderIdNumeric = order.id.replace(/\D/g, "");
    const matchSearch =
      order.customerName.toLowerCase().includes(text) ||
      order.id.toLowerCase().includes(text) ||
      order.model.toLowerCase().includes(text) ||
      order.customerPhone.toLowerCase().includes(text) ||
      normalizeSearch(order.customerName).includes(normalized) ||
      normalizeSearch(order.model).includes(normalized) ||
      orderIdNormalized.includes(normalized) ||
      (numericOnly.length > 0 && orderIdNumeric.includes(numericOnly));
    const matchUnpaid = !showOnlyUnpaid || order.paymentStatus !== "pago";
    const matchStale = !staleOnly || daysSince(order.date) >= 3;
    const matchTechnician = selectedTechnician === "all" || (order.technician || "").trim() === selectedTechnician;
    return matchSearch && matchUnpaid && matchStale && matchTechnician;
  });
  const visibleStatuses = statusOptions;
  const groupedOrders = useMemo(() => {
    const groups: Record<OrderStatus, RepairOrder[]> = {
      received: [],
      diagnosing: [],
      repairing: [],
      waiting_parts: [],
      completed: [],
      delivered: [],
      cancelled: [],
    };
    filtered.forEach((order) => {
      groups[order.status].push(order);
    });
    return groups;
  }, [filtered]);
  const boardTechnicians = useMemo(
    () => Array.from(new Set(orders.map((order) => (order.technician || "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [orders]
  );

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
  const detailOrder = useMemo(
    () => (detailOrderId ? orders.find((item) => item.id === detailOrderId) ?? null : null),
    [detailOrderId, orders]
  );

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

  useEffect(() => {
    const osQuery = new URLSearchParams(location.search).get("os");
    if (!osQuery || openedFromQuery) return;

    const order = orders.find((item) => item.id.toLowerCase() === osQuery.toLowerCase());
    if (!order) return;

    setSearch(order.id);
    openEditModal(order);
    setOpenedFromQuery(true);
  }, [location.search, openedFromQuery, orders]);

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
    if (editingOrder.status !== "completed" && draft.status === "completed") {
      toast.success("Cliente notificado: sua OS está pronta para retirada.");
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
  const handleDropToStatus = (targetStatus: OrderStatus) => {
    if (!draggingOrderId) return;
    const draggedOrder = orders.find((order) => order.id === draggingOrderId);
    if (!draggedOrder || draggedOrder.status === targetStatus) {
      setDraggingOrderId(null);
      return;
    }
    const result = updateOrder(draggingOrderId, { status: targetStatus });
    if (!result.ok) {
      toast.error(result.message || "Não foi possível mover a OS.");
      setDraggingOrderId(null);
      return;
    }
    if (targetStatus === "completed") {
      toast.success("Cliente notificado: sua OS está pronta para retirada.");
    }
    toast.success(`OS ${draggingOrderId} movida para ${statusConfig[targetStatus].label}.`);
    setDraggingOrderId(null);
  };

  return (
    <div className="premium-page w-full">
      <section className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_4px_10px_rgba(15,23,42,0.06)] md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, aparelho ou OS"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-[10px] border border-[#E5E7EB] bg-white px-4 pl-10 text-sm text-[#111827] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
            />
        </div>
        <div className="relative flex items-center gap-2">
          <Button variant="outline" className="border-[#E5E7EB] bg-white" onClick={() => setAdvancedOpen(true)}>
            Filtros avançados
          </Button>
          <Button className="gap-2 rounded-[10px] bg-[#2563EB] px-5 py-2.5 font-medium text-white hover:bg-[#1D4ED8]" onClick={() => navigate("/ordens/nova")}>
            <Plus className="h-4 w-4" />
            Nova Ordem
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4 lg:grid-cols-3 md:grid-cols-2">
          {visibleStatuses.map((status) => (
            <div
              key={status}
              className="rounded-xl border border-[#E5E7EB] bg-white p-3 shadow-[0_4px_10px_rgba(15,23,42,0.06)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropToStatus(status)}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[status].color}`}>
                  {statusConfig[status].label}
                </span>
                <span className="text-xs text-slate-500">{groupedOrders[status].length}</span>
              </div>

              <div className="max-h-[62vh] space-y-2.5 overflow-y-auto pr-1">
                {groupedOrders[status].map((order) => {
                  const stoppedDays = daysSince(order.date);
                  return (
                    <article
                      key={order.id}
                      draggable
                      onClick={() => setDetailOrderId(order.id)}
                      onDragStart={() => setDraggingOrderId(order.id)}
                      onDragEnd={() => setDraggingOrderId(null)}
                      className={`relative cursor-grab overflow-hidden rounded-xl border bg-white p-4 pl-5 shadow-[0_4px_10px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-[1px] hover:shadow-[0_10px_20px_rgba(15,23,42,0.12)] ${stoppedDays > 5 ? "border-red-300" : "border-[#E5E7EB]"} ${draggingOrderId === order.id ? "ring-2 ring-blue-500" : ""}`}
                    >
                      <span className={`absolute left-0 top-0 h-full w-1 ${statusConfig[order.status].stripe}`} />
                      <p className="text-base font-semibold text-slate-900">{order.customerName}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <DeviceIcon type={order.deviceType} />
                        {order.model} ({order.brand})
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs text-slate-700">{order.reportedProblem || "Sem problema informado."}</p>
                      <p className="mt-2 text-[11px] text-slate-500">#{order.id} • {order.date}</p>
                      {stoppedDays >= 3 ? (
                        <p className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stoppedDays > 5 ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          <AlertTriangle className="h-3 w-3" />
                          {stoppedDays} dias sem atualização
                        </p>
                      ) : null}
                    </article>
                  );
                })}
                {groupedOrders[status].length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#E6EAF0] px-3 py-5 text-center text-xs text-slate-400">
                    Sem ordens neste status
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </section>

      <Dialog open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filtros avançados</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={showOnlyUnpaid} onChange={(e) => setShowOnlyUnpaid(e.target.checked)} />
              Pagamento pendente
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={staleOnly} onChange={(e) => setStaleOnly(e.target.checked)} />
              Sem atualização (3+ dias)
            </label>
            <select
              value={selectedTechnician}
              onChange={(e) => setSelectedTechnician(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm"
            >
              <option value="all">Todos técnicos</option>
              {boardTechnicians.map((tech) => (
                <option key={tech} value={tech}>{tech}</option>
              ))}
            </select>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailOrder)} onOpenChange={(open) => (!open ? setDetailOrderId(null) : null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da OS {detailOrder?.id}</DialogTitle>
          </DialogHeader>
          {detailOrder ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-3">
                <p className="font-semibold text-slate-900">{detailOrder.customerName}</p>
                <p className="text-slate-500">{detailOrder.model} ({detailOrder.brand})</p>
                <p className="mt-1 text-slate-700"><span className="font-semibold">Problema:</span> {detailOrder.reportedProblem || "Sem descrição."}</p>
              </div>

              <div className="rounded-lg border border-[#E5E7EB] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["Recebido", "Diagnóstico", "Orçamento enviado", "Aprovado pelo cliente", "Em reparo", "Finalizado", "Entregue"].map((step) => (
                    <div key={step} className="rounded-md border border-[#E2E8F0] bg-white px-2 py-1.5 text-xs text-slate-700">{step}</div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-[#E5E7EB] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Photos upload</p>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => openPhotosModal(detailOrder)}>Gerenciar fotos</Button>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer communication</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => window.open(`https://wa.me/${(detailOrder.customerPhone || "").replace(/\D/g, "")}`, "_blank")}
                  >
                    WhatsApp
                  </Button>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Technical checklist</p>
                  {[
                    ["battery", "Test battery"],
                    ["motherboard", "Test motherboard"],
                    ["display", "Test display"],
                    ["charging", "Test charging"],
                  ].map(([key, label]) => (
                    <label key={key} className="mb-1 flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={Boolean(techChecklist[detailOrder.id]?.[key as "battery" | "motherboard" | "display" | "charging"])}
                        onChange={(e) =>
                          setTechChecklist((prev) => ({
                            ...prev,
                            [detailOrder.id]: {
                              battery: prev[detailOrder.id]?.battery || false,
                              motherboard: prev[detailOrder.id]?.motherboard || false,
                              display: prev[detailOrder.id]?.display || false,
                              charging: prev[detailOrder.id]?.charging || false,
                              [key]: e.target.checked,
                            },
                          }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="rounded-lg border border-[#E5E7EB] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Internal notes</p>
                  <textarea
                    value={internalNotes[detailOrder.id] || ""}
                    onChange={(e) => setInternalNotes((prev) => ({ ...prev, [detailOrder.id]: e.target.value }))}
                    className="min-h-[90px] w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs"
                    placeholder="Adicione observações internas..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDetailOrderId(null)}>Fechar</Button>
                <Button className="bg-[#0F2A44] text-white hover:bg-[#173A5E]" onClick={() => openEditModal(detailOrder)}>
                  Abrir edição
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
              <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.10)] md:p-6">
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
              <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.10)] md:p-6">
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
              <section className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.10)] md:p-6">
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




