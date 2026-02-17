import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, FileText, User, Smartphone, ClipboardCheck, Wrench, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore, getChecklistItems, RepairOrder } from "@/store/appStore";
import { generateRepairOrderPDF } from "@/lib/pdfGenerator";
import { toast } from "sonner";

const steps = [
  { icon: User, label: "Cliente" },
  { icon: Smartphone, label: "Dispositivo" },
  { icon: ClipboardCheck, label: "Checklist" },
  { icon: Wrench, label: "Problema" },
  { icon: FileText, label: "Revisão" },
];

const deviceTypes = [
  { value: "phone", label: "Smartphone", icon: "📱" },
  { value: "notebook", label: "Notebook", icon: "💻" },
  { value: "tablet", label: "Tablet", icon: "📟" },
];

export default function NewRepairOrder() {
  const navigate = useNavigate();
  const { addOrder, nextOrderNumber, responsibilityTerm, companyInfo } = useAppStore();
  const [step, setStep] = useState(0);
  const entryPhotoRef = useRef<HTMLInputElement>(null);
  const exitPhotoRef = useRef<HTMLInputElement>(null);
  const [entryPhotos, setEntryPhotos] = useState<string[]>([]);
  const [exitPhotos, setExitPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerCpf: "",
    deviceType: "phone" as "phone" | "notebook" | "tablet",
    brand: "",
    model: "",
    serialImei: "",
    devicePassword: "",
    deviceColor: "",
    accessories: "",
    conditionNotes: "",
    reportedProblem: "",
    technician: "",
    cost: "",
    estimatedDelivery: "",
    termAccepted: false,
  });
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  const updateForm = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const checklistItems = getChecklistItems(form.deviceType);

  const canNext = () => {
    switch (step) {
      case 0: return form.customerName && form.customerPhone;
      case 1: return form.brand && form.model;
      case 2: return true;
      case 3: return form.reportedProblem;
      case 4: return form.termAccepted;
      default: return true;
    }
  };

  const handlePhotoUpload = (type: "entry" | "exit", files: FileList | null) => {
    if (!files) return;
    const setter = type === "entry" ? setEntryPhotos : setExitPhotos;
    const current = type === "entry" ? entryPhotos : exitPhotos;
    const remaining = 5 - current.length;
    if (remaining <= 0) { toast.error("Máximo de 5 fotos atingido."); return; }
    const toProcess = Array.from(files).slice(0, remaining);
    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setter((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (type: "entry" | "exit", index: number) => {
    const setter = type === "entry" ? setEntryPhotos : setExitPhotos;
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const orderId = `OS-${nextOrderNumber}`;
    const today = new Date().toLocaleDateString("pt-BR");
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
      devicePassword: form.devicePassword,
      deviceColor: form.deviceColor,
      accessories: form.accessories,
      conditionNotes: form.conditionNotes,
      checklist,
      reportedProblem: form.reportedProblem,
      technicianDiagnosis: "",
      repairActions: "",
      partsUsed: "",
      cost: form.cost,
      estimatedDelivery: form.estimatedDelivery,
      technician: form.technician,
      status: "received",
      date: today,
      termAccepted: form.termAccepted,
      entryPhotos,
      exitPhotos,
    };
    addOrder(order);
    await generateRepairOrderPDF(order, responsibilityTerm, companyInfo);
    toast.success(`Ordem ${orderId} criada com sucesso! PDF gerado.`);
    navigate("/ordens");
  };

  const inputClass = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20";
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ordens")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold text-foreground">Nova Ordem de Serviço</h2>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={i} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  i < step ? "bg-success text-success-foreground" :
                  i === step ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-0.5 flex-1 rounded ${i < step ? "bg-success" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="glass-card rounded-xl p-6"
        >
          {/* Step 0: Cliente */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Dados do Cliente</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nome completo *</label>
                  <input className={inputClass} placeholder="Ex: João da Silva" value={form.customerName} onChange={(e) => updateForm("customerName", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>CPF</label>
                  <input className={inputClass} placeholder="000.000.000-00" value={form.customerCpf} onChange={(e) => updateForm("customerCpf", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Telefone *</label>
                  <input className={inputClass} placeholder="(11) 99999-9999" value={form.customerPhone} onChange={(e) => updateForm("customerPhone", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>E-mail</label>
                  <input className={inputClass} placeholder="email@exemplo.com" value={form.customerEmail} onChange={(e) => updateForm("customerEmail", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Dispositivo */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Dados do Dispositivo</h3>
              <div>
                <label className={labelClass}>Tipo de dispositivo *</label>
                <div className="grid grid-cols-3 gap-3">
                  {deviceTypes.map((dt) => (
                    <button
                      key={dt.value}
                      onClick={() => updateForm("deviceType", dt.value)}
                      className={`rounded-lg border-2 p-3 text-center transition-colors ${
                        form.deviceType === dt.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <span className="text-2xl">{dt.icon}</span>
                      <p className="mt-1 text-sm font-medium text-foreground">{dt.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Marca *</label>
                  <input className={inputClass} placeholder="Ex: Apple, Samsung" value={form.brand} onChange={(e) => updateForm("brand", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Modelo *</label>
                  <input className={inputClass} placeholder="Ex: iPhone 15 Pro" value={form.model} onChange={(e) => updateForm("model", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>IMEI / Nº de Série</label>
                  <input className={inputClass} placeholder="Número de identificação" value={form.serialImei} onChange={(e) => updateForm("serialImei", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Cor</label>
                  <input className={inputClass} placeholder="Ex: Preto, Prateado" value={form.deviceColor} onChange={(e) => updateForm("deviceColor", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>🔑 Senha do dispositivo</label>
                  <input className={inputClass} placeholder="Senha / PIN / Padrão" value={form.devicePassword} onChange={(e) => updateForm("devicePassword", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Acessórios</label>
                  <input className={inputClass} placeholder="Capinha, carregador, etc." value={form.accessories} onChange={(e) => updateForm("accessories", e.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Observações sobre o estado do aparelho</label>
                <textarea
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 min-h-[80px]"
                  placeholder="Descreva riscos, amassados, marcas visíveis..."
                  value={form.conditionNotes}
                  onChange={(e) => updateForm("conditionNotes", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Checklist + Fotos */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Checklist de Entrada</h3>
                  <span className="text-xs text-muted-foreground">
                    {Object.values(checklist).filter(Boolean).length}/{checklistItems.length} itens OK
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">Marque os itens que estão funcionando corretamente.</p>
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
                        className="h-4 w-4 rounded border-input text-primary accent-primary"
                      />
                      <span className="text-sm text-foreground">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Registro Fotográfico */}
              <div className="space-y-4 border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Registro Fotográfico</h3>
                </div>

                {/* Entry Photos */}
                <div className="space-y-2">
                  <label className={labelClass}>Fotos de Entrada do Aparelho (até 5)</label>
                  <input ref={entryPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload("entry", e.target.files)} />
                  <div className="grid grid-cols-2 gap-3">
                    {entryPhotos.map((photo, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                        <img src={photo} alt={`Entrada ${i + 1}`} className="w-full h-32 object-cover" />
                        <button onClick={() => removePhoto("entry", i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {entryPhotos.length < 5 && (
                      <button onClick={() => entryPhotoRef.current?.click()} className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary">
                        <Camera className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Exit Photos */}
                <div className="space-y-2">
                  <label className={labelClass}>Fotos de Saída do Aparelho (até 5)</label>
                  <input ref={exitPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handlePhotoUpload("exit", e.target.files)} />
                  <div className="grid grid-cols-2 gap-3">
                    {exitPhotos.map((photo, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                        <img src={photo} alt={`Saída ${i + 1}`} className="w-full h-32 object-cover" />
                        <button onClick={() => removePhoto("exit", i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {exitPhotos.length < 5 && (
                      <button onClick={() => exitPhotoRef.current?.click()} className="flex items-center justify-center h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors text-muted-foreground hover:text-primary">
                        <Camera className="h-6 w-6" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Problema */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Problema Relatado & Detalhes</h3>
              <div>
                <label className={labelClass}>Problema relatado pelo cliente *</label>
                <textarea
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 min-h-[100px]"
                  placeholder="Descreva o problema que o cliente reportou..."
                  value={form.reportedProblem}
                  onChange={(e) => updateForm("reportedProblem", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Técnico responsável</label>
                  <input className={inputClass} placeholder="Nome do técnico" value={form.technician} onChange={(e) => updateForm("technician", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Previsão de entrega</label>
                  <input className={inputClass} type="date" value={form.estimatedDelivery} onChange={(e) => updateForm("estimatedDelivery", e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Valor estimado</label>
                  <input className={inputClass} placeholder="R$ 0,00" value={form.cost} onChange={(e) => updateForm("cost", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Revisão */}
          {step === 4 && (
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-foreground">Revisão & Termo de Responsabilidade</h3>

              {/* Summary */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium text-foreground">{form.customerName}</p>
                  <p className="text-xs text-muted-foreground">{form.customerPhone}</p>
                  {form.customerCpf && <p className="text-xs text-muted-foreground">CPF: {form.customerCpf}</p>}
                </div>
                <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Dispositivo</p>
                  <p className="text-sm font-medium text-foreground">{form.brand} {form.model}</p>
                  <p className="text-xs text-muted-foreground">{form.deviceType === "phone" ? "Smartphone" : form.deviceType === "notebook" ? "Notebook" : "Tablet"} • {form.deviceColor || "N/A"}</p>
                  {form.devicePassword && <p className="text-xs text-muted-foreground">🔑 Senha: {form.devicePassword}</p>}
                  {form.serialImei && <p className="text-xs text-muted-foreground">IMEI/SN: {form.serialImei}</p>}
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Problema</p>
                <p className="text-sm text-foreground">{form.reportedProblem}</p>
                {form.technician && <p className="text-xs text-muted-foreground">Técnico: {form.technician}</p>}
                {form.cost && <p className="text-xs text-muted-foreground">Valor: {form.cost}</p>}
              </div>

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Checklist ({Object.values(checklist).filter(Boolean).length}/{checklistItems.length} OK)</p>
                <div className="flex flex-wrap gap-1.5">
                  {checklistItems.map((item) => (
                    <span
                      key={item}
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        checklist[item] ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {checklist[item] ? "✓" : "✗"} {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Responsibility Term */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Termo de Responsabilidade</p>
                <div className="max-h-40 overflow-y-auto rounded bg-muted/30 p-3 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {responsibilityTerm}
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.termAccepted}
                    onChange={(e) => updateForm("termAccepted", e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  <span className="text-sm font-medium text-foreground">
                    Cliente leu e aceitou o termo de responsabilidade
                  </span>
                </label>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : navigate("/ordens")} className="gap-2">
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
    </div>
  );
}
