import { useState } from "react";
import { Building, FileText, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  CompanyInfo,
  DEFAULT_RESPONSIBILITY_TERM,
  FinancialSettings,
  PaymentMethod,
  useAppStore,
} from "@/store/appStore";

export default function SettingsPage() {
  const {
    responsibilityTerm,
    setResponsibilityTerm,
    companyInfo,
    setCompanyInfo,
    financialSettings,
    setFinancialSettings,
    paymentMethods,
    setPaymentMethods,
  } = useAppStore();

  const [term, setTerm] = useState(responsibilityTerm);
  const [company, setCompany] = useState<CompanyInfo>(companyInfo);
  const [financeCfg, setFinanceCfg] = useState<FinancialSettings>(financialSettings);
  const [methods, setMethods] = useState<Record<PaymentMethod, boolean>>({
    dinheiro: paymentMethods.includes("dinheiro"),
    pix: paymentMethods.includes("pix"),
    cartao: paymentMethods.includes("cartao"),
    outro: paymentMethods.includes("outro"),
  });
  const [savedTerm, setSavedTerm] = useState(true);
  const [savedCompany, setSavedCompany] = useState(true);
  const [savedFinance, setSavedFinance] = useState(true);

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

  const handleSaveTerm = () => {
    setResponsibilityTerm(term);
    setSavedTerm(true);
    toast.success("Termo de responsabilidade salvo com sucesso.");
  };

  const handleSaveCompany = () => {
    setCompanyInfo(company);
    setSavedCompany(true);
    toast.success("Dados da assistencia salvos com sucesso.");
  };

  const handleSaveFinance = () => {
    const selectedMethods = (Object.entries(methods) as Array<[PaymentMethod, boolean]>)
      .filter(([, enabled]) => enabled)
      .map(([method]) => method);

    if (!selectedMethods.length) {
      toast.error("Selecione ao menos uma forma de pagamento.");
      return;
    }

    setFinancialSettings(financeCfg);
    setPaymentMethods(selectedMethods);
    setSavedFinance(true);
    toast.success("Regras financeiras salvas com sucesso.");
  };

  const updateCompany = (field: keyof CompanyInfo, value: string) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
    setSavedCompany(false);
  };

  return (
    <div className="premium-page mx-auto max-w-4xl animate-fade-in">
      <section className="saas-card">
        <h2 className="saas-title">Configurações</h2>
        <p className="saas-subtitle">Parametrize dados da empresa, regras financeiras e termo legal da operação.</p>
      </section>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="saas-card space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <h3 className="saas-title">Dados da Assistencia Tecnica</h3>
            <p className="saas-subtitle">Estas informacoes aparecem no cabecalho do PDF da OS.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nome da assistencia</label>
            <input className={inputClass} value={company.name} onChange={(e) => updateCompany("name", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>CNPJ</label>
            <input className={inputClass} placeholder="00.000.000/0000-00" value={company.cnpj} onChange={(e) => updateCompany("cnpj", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Endereco completo</label>
            <input className={inputClass} value={company.address} onChange={(e) => updateCompany("address", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Telefone / WhatsApp</label>
            <input className={inputClass} value={company.phone} onChange={(e) => updateCompany("phone", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>E-mail</label>
            <input className={inputClass} value={company.email} onChange={(e) => updateCompany("email", e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveCompany} disabled={savedCompany} className="gap-2">
            <Save className="h-4 w-4" />
            {savedCompany ? "Salvo" : "Salvar dados"}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="saas-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="saas-title">Regras do Financeiro e Caixa</h3>
            <p className="saas-subtitle">Essas opcoes alteram o comportamento real dos lancamentos.</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={financeCfg.allowNegativeCash}
              onChange={(e) => {
                setFinanceCfg((prev) => ({ ...prev, allowNegativeCash: e.target.checked }));
                setSavedFinance(false);
              }}
            />
            Permitir caixa negativo
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={financeCfg.requireObservationForAdjustments}
              onChange={(e) => {
                setFinanceCfg((prev) => ({ ...prev, requireObservationForAdjustments: e.target.checked }));
                setSavedFinance(false);
              }}
            />
            Exigir observacao em ajustes
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={financeCfg.enableCustomerInFinancial}
              onChange={(e) => {
                setFinanceCfg((prev) => ({ ...prev, enableCustomerInFinancial: e.target.checked }));
                setSavedFinance(false);
              }}
            />
            Habilitar uso de cliente no financeiro
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Formas de pagamento ativas</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(methods) as PaymentMethod[]).map((method) => (
              <label key={method} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={methods[method]}
                  onChange={(e) => {
                    setMethods((prev) => ({ ...prev, [method]: e.target.checked }));
                    setSavedFinance(false);
                  }}
                />
                {method === "dinheiro" ? "Dinheiro" : method === "pix" ? "Pix" : method === "cartao" ? "Cartao" : "Outro"}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveFinance} disabled={savedFinance} className="gap-2">
            <Save className="h-4 w-4" />
            {savedFinance ? "Salvo" : "Salvar regras"}
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="saas-card space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="saas-title">Termo de Responsabilidade</h3>
            <p className="saas-subtitle">Texto exibido na OS e no PDF de retirada.</p>
          </div>
        </div>

        <textarea
          className="min-h-[320px] w-full rounded-lg border border-input bg-card px-4 py-3 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setSavedTerm(false);
          }}
        />

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setTerm(DEFAULT_RESPONSIBILITY_TERM);
              setSavedTerm(false);
            }}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restaurar padrao
          </Button>
          <Button onClick={handleSaveTerm} disabled={savedTerm} className="gap-2">
            <Save className="h-4 w-4" />
            {savedTerm ? "Salvo" : "Salvar alteracoes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
