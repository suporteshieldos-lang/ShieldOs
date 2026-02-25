import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  User,
  Smartphone,
  Laptop,
  Tablet,
  Printer,
  ClipboardCheck,
  Wrench,
  Camera,
  X,
  DollarSign,
  Hash,
  Type,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAppStore,
  getChecklistItems,
  RepairOrder,
  formatCurrency,
  parseCurrency,
  PaymentMethod,
  PaymentStatus,
  DEFAULT_CUSTOMER,
} from "@/store/appStore";
import { generateRepairOrderPDF } from "@/lib/pdfGenerator";
import { createId } from "@/lib/id";
import { toast } from "sonner";

const steps = [
  { icon: User, label: "Cliente" },
  { icon: Smartphone, label: "Dispositivo" },
  { icon: ClipboardCheck, label: "Checklist" },
  { icon: Wrench, label: "Problema" },
  { icon: DollarSign, label: "Financeiro" },
  { icon: FileText, label: "Revisão" },
];

const deviceTypes = [
  { value: "phone", label: "Smartphone", icon: Smartphone },
  { value: "notebook", label: "Notebook", icon: Laptop },
  { value: "tablet", label: "Tablet", icon: Tablet },
  { value: "printer", label: "Impressora", icon: Printer },
] as const;

export default function NewRepairOrder() {
  const navigate = useNavigate();
  const { addOrder, addCustomer, nextOrderNumber, responsibilityTerm, companyInfo, inventory, customers } = useAppStore();

  const [step, setStep] = useState(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState(DEFAULT_CUSTOMER.id);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
  });
  const [entryPhotos, setEntryPhotos] = useState<string[]>([]);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [passwordType, setPasswordType] = useState<"none" | "numeric" | "text" | "pattern">("none");
  const [patternPoints, setPatternPoints] = useState<number[]>([]);
  const [selectedParts, setSelectedParts] = useState<{ inventoryId: string; name: string; qty: number; unitCost: number }[]>([]);
  const entryPhotoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    customerName: DEFAULT_CUSTOMER.name,
    customerPhone: DEFAULT_CUSTOMER.phone,
    customerEmail: DEFAULT_CUSTOMER.email,
    customerCpf: DEFAULT_CUSTOMER.cpf,
    deviceType: "phone" as "phone" | "notebook" | "tablet" | "printer",
    brand: "",
    model: "",
    serialImei: "",
    devicePassword: "",
    deviceColor: "",
    accessories: "",
    conditionNotes: "",
    reportedProblem: "",
    technician: "",
    estimatedDelivery: "",
    termAccepted: false,
    serviceCost: "",
    discount: "",
    paymentMethod: "pix" as PaymentMethod,
    paymentStatus: "pendente" as PaymentStatus,
  });

  const checklistItems = useMemo(() => getChecklistItems(form.deviceType), [form.deviceType]);
  const partsCostTotal = selectedParts.reduce((sum, part) => sum + part.unitCost * part.qty, 0);
  const availableParts = inventory.filter((item) => item.qty > 0);

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) return;
    setForm((prev) => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone || "Não informado",
      customerEmail: customer.email || "",
      customerCpf: customer.cpf || "",
    }));
  };

  const handleQuickCustomerSave = () => {
    if (!quickCustomerForm.name || !quickCustomerForm.phone) {
      toast.error("Preencha nome e telefone do cliente.");
      return;
    }
    const normalizedName = quickCustomerForm.name.toLowerCase().trim();
    const normalizedPhone = quickCustomerForm.phone.replace(/\D/g, "");
    const existing = customers.find(
      (customer) =>
        customer.name.toLowerCase().trim() === normalizedName &&
        customer.phone.replace(/\D/g, "") === normalizedPhone
    );
    const id = existing?.id || createId();
    const customerPayload = {
      id,
      name: quickCustomerForm.name,
      cpf: quickCustomerForm.cpf,
      phone: quickCustomerForm.phone,
      email: quickCustomerForm.email,
      createdAt: new Date().toLocaleDateString("pt-BR"),
    };
    addCustomer(customerPayload);
    setSelectedCustomerId(id);
    setForm((prev) => ({
      ...prev,
      customerName: customerPayload.name,
      customerPhone: customerPayload.phone,
      customerEmail: customerPayload.email,
      customerCpf: customerPayload.cpf,
    }));
    setQuickCustomerForm({ name: "", cpf: "", phone: "", email: "" });
    setQuickCustomerOpen(false);
    toast.success("Cliente cadastrado rapidamente.");
  };

  const canNext = () => {
    switch (step) {
      case 0:
        return Boolean(form.customerName && form.customerPhone);
      case 1:
        return Boolean(form.brand && form.model);
      case 2:
        return true;
      case 3:
        return Boolean(form.reportedProblem);
      case 4:
        return true;
      case 5:
        return form.termAccepted;
      default:
        return true;
    }
  };

  const handleEntryPhotoUpload = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - entryPhotos.length;
    if (remaining <= 0) {
      toast.error("Máximo de 5 fotos de entrada atingido.");
      return;
    }
    const toProcess = Array.from(files).slice(0, remaining);
    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setEntryPhotos((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeEntryPhoto = (index: number) => {
    setEntryPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const orderId = `OS-${nextOrderNumber}`;
    const today = new Date().toLocaleDateString("pt-BR");
    const serviceCost = parseCurrency(form.serviceCost);
    const discount = parseCurrency(form.discount);

    addCustomer({
      id: selectedCustomerId === DEFAULT_CUSTOMER.id ? createId() : selectedCustomerId,
      name: form.customerName,
      cpf: form.customerCpf,
      phone: form.customerPhone,
      email: form.customerEmail,
      createdAt: today,
    });

    const finalDevicePassword =
      passwordType === "pattern"
        ? patternPoints.length
          ? `Padrão: ${patternPoints.join("-")}`
          : ""
        : passwordType === "numeric"
          ? form.devicePassword.trim()
            ? `Numérica: ${form.devicePassword.trim()}`
            : ""
          : passwordType === "text"
            ? form.devicePassword.trim()
              ? `Letras: ${form.devicePassword.trim()}`
              : ""
            : form.devicePassword.trim();

    const order: RepairOrder = {
      id: orderId,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      customerEmail: form.customerEmail,
      customerCpf: form.customerCpf,
      deviceType: form.deviceType,
      brand: form.brand,
      model: form.model,
      serialImei: form.serialImei,
      devicePassword: finalDevicePassword,
      deviceColor: form.deviceColor,
      accessories: form.accessories,
      conditionNotes: form.conditionNotes,
      checklist,
      reportedProblem: form.reportedProblem,
      technicianDiagnosis: "",
      repairActions: "",
      serviceCost,
      partsCost: partsCostTotal,
      discount,
      paymentMethod: form.paymentMethod,
      paymentStatus: form.paymentStatus,
      paymentDate: form.paymentStatus === "pago" ? today : "",
      usedParts: selectedParts,
      cost: form.serviceCost || "-",
      partsUsed: selectedParts.map((part) => part.name).join(", "),
      estimatedDelivery: form.estimatedDelivery,
      technician: form.technician,
      status: "received",
      date: today,
      completedDate: "",
      warrantyDays: 90,
      termAccepted: form.termAccepted,
      entryPhotos,
      exitPhotos: [],
    };

    selectedParts.forEach((part) => useAppStore.getState().deductStock(part.inventoryId, part.qty));
    const addResult = addOrder(order);
    if (!addResult.ok) {
      toast.error(addResult.message || "Não foi possível criar a OS.");
      return;
    }
    await generateRepairOrderPDF(order, responsibilityTerm, companyInfo);
    toast.success(`Ordem ${orderId} criada com sucesso!`);
    navigate("/ordens");
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

  const togglePatternPoint = (point: number) => {
    setPatternPoints((prev) => {
      if (prev.includes(point)) return prev;
      return [...prev, point];
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ordens")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold text-foreground">Nova Ordem de Serviço</h2>
      </div>

      <div className="flex items-center justify-between">
        {steps.map((stepItem, index) => (
          <div key={index} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  index < step
                    ? "bg-success text-success-foreground"
                    : index === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {index < step ? <Check className="h-4 w-4" /> : <stepItem.icon className="h-4 w-4" />}
              </div>
              <span className={`hidden text-xs font-medium sm:block ${index === step ? "text-foreground" : "text-muted-foreground"}`}>
                {stepItem.label}
              </span>
            </div>
            {index < steps.length - 1 && <div className={`mx-2 h-0.5 flex-1 rounded ${index < step ? "bg-success" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="glass-card rounded-xl p-6"
        >
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Cliente (primeiro passo)</h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className={labelClass}>Cliente cadastrado</label>
                  <select
                    className={inputClass}
                    value={selectedCustomerId}
                    onChange={(e) => selectCustomer(e.target.value)}
                  >
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button variant="outline" onClick={() => navigate("/clientes/novo")}>
                  Novo cliente
                </Button>
                <Button variant="outline" onClick={() => setQuickCustomerOpen(true)}>
                  Cadastro rapido
                </Button>
                <Button variant="outline" onClick={() => selectCustomer(DEFAULT_CUSTOMER.id)}>
                  Não identificado
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nome completo *</label>
                  <input className={inputClass} value={form.customerName} onChange={(e) => updateForm("customerName", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>CPF</label>
                  <input className={inputClass} value={form.customerCpf} onChange={(e) => updateForm("customerCpf", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Telefone *</label>
                  <input className={inputClass} value={form.customerPhone} onChange={(e) => updateForm("customerPhone", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>E-mail</label>
                  <input className={inputClass} value={form.customerEmail} onChange={(e) => updateForm("customerEmail", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Dados do Dispositivo</h3>
              <div>
                <label className={labelClass}>Tipo de dispositivo *</label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {deviceTypes.map((deviceType) => (
                    <button
                      key={deviceType.value}
                      onClick={() => updateForm("deviceType", deviceType.value)}
                      className={`rounded-lg border-2 p-3 text-center transition-colors ${
                        form.deviceType === deviceType.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-foreground">
                        <deviceType.icon className="h-4 w-4" />
                      </span>
                      <p className="mt-1 text-sm font-medium text-foreground">{deviceType.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Marca *</label>
                  <input className={inputClass} value={form.brand} onChange={(e) => updateForm("brand", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Modelo *</label>
                  <input className={inputClass} value={form.model} onChange={(e) => updateForm("model", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>IMEI / Numero de serie</label>
                  <input className={inputClass} value={form.serialImei} onChange={(e) => updateForm("serialImei", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Cor</label>
                  <input className={inputClass} value={form.deviceColor} onChange={(e) => updateForm("deviceColor", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Tipo de senha do dispositivo</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordType("numeric");
                        setPatternPoints([]);
                        updateForm("devicePassword", "");
                      }}
                      className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs ${passwordType === "numeric" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      <Hash className="h-3.5 w-3.5" />
                      Numérica
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordType("text");
                        setPatternPoints([]);
                        updateForm("devicePassword", "");
                      }}
                      className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs ${passwordType === "text" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      <Type className="h-3.5 w-3.5" />
                      Letras
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordType("pattern");
                        updateForm("devicePassword", "");
                        setPatternPoints([]);
                      }}
                      className={`flex items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs ${passwordType === "pattern" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      <Grid3X3 className="h-3.5 w-3.5" />
                      Padrão
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordType("none");
                        setPatternPoints([]);
                        updateForm("devicePassword", "");
                      }}
                      className={`rounded-lg border px-2 py-2 text-xs ${passwordType === "none" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      Sem senha
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Senha / padrão</label>
                  {(passwordType === "numeric" || passwordType === "text") && (
                    <input
                      className={inputClass}
                      value={form.devicePassword}
                      onChange={(e) => updateForm("devicePassword", e.target.value)}
                      placeholder={passwordType === "numeric" ? "Ex.: 1234" : "Ex.: abcD"}
                    />
                  )}
                  {passwordType === "pattern" && (
                    <div className="space-y-2">
                      <div className="grid w-[132px] grid-cols-3 gap-2 rounded-lg border border-border p-2">
                        {Array.from({ length: 9 }, (_, idx) => idx + 1).map((point) => (
                          <button
                            key={point}
                            type="button"
                            onClick={() => togglePatternPoint(point)}
                            className={`h-8 w-8 rounded-full border text-xs ${
                              patternPoints.includes(point)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {point}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setPatternPoints([])}>
                          Limpar padrão
                        </Button>
                        <span className="text-xs text-muted-foreground self-center">
                          Sequência: {patternPoints.length ? patternPoints.join("-") : "nenhuma"}
                        </span>
                      </div>
                    </div>
                  )}
                  {passwordType === "none" && <input className={inputClass} disabled value="Sem senha informada" />}
                </div>
                <div>
                  <label className={labelClass}>Acessórios</label>
                  <input className={inputClass} value={form.accessories} onChange={(e) => updateForm("accessories", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Observações sobre estado do aparelho</label>
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                  value={form.conditionNotes}
                  onChange={(e) => updateForm("conditionNotes", e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                Senha informada:{" "}
                <span className="font-medium text-foreground">
                  {passwordType === "pattern"
                    ? patternPoints.length
                      ? `Padrão (${patternPoints.join("-")})`
                      : "Padrão não desenhado"
                    : passwordType === "numeric"
                      ? form.devicePassword
                        ? `Numérica (${form.devicePassword})`
                        : "Numérica não informada"
                      : passwordType === "text"
                        ? form.devicePassword
                          ? `Letras (${form.devicePassword})`
                          : "Letras não informada"
                        : "Sem senha"}
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Checklist de Entrada</h3>
                  <span className="text-xs text-muted-foreground">
                    {Object.values(checklist).filter(Boolean).length}/{checklistItems.length} itens OK
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {checklistItems.map((item) => (
                    <label
                      key={item}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        checklist[item] ? "border-success/50 bg-success/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!checklist[item]}
                        onChange={(e) => setChecklist((prev) => ({ ...prev, [item]: e.target.checked }))}
                        className="h-4 w-4 rounded border-input accent-primary"
                      />
                      <span className="text-sm text-foreground">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Registro Fotografico</h3>
                </div>
                <div className="space-y-2">
                  <label className={labelClass}>Fotos de entrada (ate 5)</label>
                  <input
                    ref={entryPhotoRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleEntryPhotoUpload(e.target.files)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    {entryPhotos.map((photo, photoIndex) => (
                      <div key={photoIndex} className="group relative overflow-hidden rounded-lg border border-border">
                        <img src={photo} alt={`Entrada ${photoIndex + 1}`} className="h-32 w-full object-cover" />
                        <button
                          onClick={() => removeEntryPhoto(photoIndex)}
                          className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {entryPhotos.length < 5 && (
                      <button
                        onClick={() => entryPhotoRef.current?.click()}
                        className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <Camera className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Problema Relatado e Detalhes</h3>
              <div>
                <label className={labelClass}>Problema relatado pelo cliente *</label>
                <textarea
                  className="min-h-[100px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                  value={form.reportedProblem}
                  onChange={(e) => updateForm("reportedProblem", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Tecnico responsavel</label>
                  <input className={inputClass} value={form.technician} onChange={(e) => updateForm("technician", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>PRevisão de entrega</label>
                  <input className={inputClass} type="date" value={form.estimatedDelivery} onChange={(e) => updateForm("estimatedDelivery", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Dados Financeiros</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Valor do Serviço</label>
                  <input className={inputClass} placeholder="R$ 0,00" value={form.serviceCost} onChange={(e) => updateForm("serviceCost", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Desconto</label>
                  <input className={inputClass} placeholder="R$ 0,00" value={form.discount} onChange={(e) => updateForm("discount", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Forma de pagamento</label>
                  <select className={inputClass} value={form.paymentMethod} onChange={(e) => updateForm("paymentMethod", e.target.value)}>
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartao</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status do pagamento</label>
                  <select className={inputClass} value={form.paymentStatus} onChange={(e) => updateForm("paymentStatus", e.target.value)}>
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="parcial">Parcial</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <h4 className="text-sm font-semibold text-foreground">Peças Utilizadas</h4>
                {availableParts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Nenhuma peça em estoque. Cadastre em <button className="font-semibold text-primary" onClick={() => navigate("/estoque/nova")}>Nova Peça</button>.
                  </div>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {availableParts.map((item) => {
                      const selected = selectedParts.find((part) => part.inventoryId === item.id);
                      return (
                        <label
                          key={item.id}
                          className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                            selected ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={!!selected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParts((prev) => [...prev, { inventoryId: item.id, name: item.name, qty: 1, unitCost: item.costPrice }]);
                                } else {
                                  setSelectedParts((prev) => prev.filter((part) => part.inventoryId !== item.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-input accent-primary"
                            />
                            <div>
                              <span className="text-sm text-foreground">{item.name}</span>
                              <span className="ml-2 text-xs text-muted-foreground">
                                ({item.qty} em estoque - {formatCurrency(item.costPrice)})
                              </span>
                            </div>
                          </div>
                          {selected && (
                            <input
                              type="number"
                              min="1"
                              max={item.qty}
                              value={selected.qty}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const qty = Math.min(parseInt(e.target.value, 10) || 1, item.qty);
                                setSelectedParts((prev) => prev.map((part) => (part.inventoryId === item.id ? { ...part, qty } : part)));
                              }}
                              className="h-8 w-16 rounded border border-input bg-card px-2 text-center text-sm"
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedParts.length > 0 && (
                  <div className="text-right text-sm font-medium text-foreground">Custo total de peças: {formatCurrency(partsCostTotal)}</div>
                )}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">Revisão e Termo de Responsabilidade</h3>
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Termo de Responsabilidade</p>
                <div className="max-h-40 overflow-y-auto rounded bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {responsibilityTerm}
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.termAccepted}
                    onChange={(e) => updateForm("termAccepted", e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">Cliente leu e aceitou o termo de responsabilidade</span>
                </label>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => (step > 0 ? setStep(step - 1) : navigate("/ordens"))} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? "Cancelar" : "Voltar"}
        </Button>
        {step < steps.length - 1 ? (
          <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-2">
            Próximo
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canNext()} className="gap-2">
            <FileText className="h-4 w-4" />
            Criar OS e Gerar PDF
          </Button>
        )}
      </div>

      <Dialog open={quickCustomerOpen} onOpenChange={setQuickCustomerOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Cadastrar cliente rapido</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              className={inputClass}
              placeholder="Nome *"
              value={quickCustomerForm.name}
              onChange={(e) => setQuickCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="CPF"
              value={quickCustomerForm.cpf}
              onChange={(e) => setQuickCustomerForm((prev) => ({ ...prev, cpf: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="Telefone *"
              value={quickCustomerForm.phone}
              onChange={(e) => setQuickCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
            <input
              className={inputClass}
              placeholder="E-mail"
              value={quickCustomerForm.email}
              onChange={(e) => setQuickCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setQuickCustomerOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickCustomerSave}>Salvar e selecionar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


