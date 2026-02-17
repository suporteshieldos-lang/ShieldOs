import { useState } from "react";
import { Save, FileText, RotateCcw, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, DEFAULT_RESPONSIBILITY_TERM, DEFAULT_COMPANY_INFO, CompanyInfo } from "@/store/appStore";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { responsibilityTerm, setResponsibilityTerm, companyInfo, setCompanyInfo } = useAppStore();
  const [term, setTerm] = useState(responsibilityTerm);
  const [company, setCompany] = useState<CompanyInfo>(companyInfo);
  const [savedTerm, setSavedTerm] = useState(true);
  const [savedCompany, setSavedCompany] = useState(true);

  const inputClass = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20";
  const labelClass = "block text-sm font-medium text-foreground mb-1.5";

  const handleSaveTerm = () => {
    setResponsibilityTerm(term);
    setSavedTerm(true);
    toast.success("Termo de responsabilidade salvo com sucesso!");
  };

  const handleSaveCompany = () => {
    setCompanyInfo(company);
    setSavedCompany(true);
    toast.success("Dados da assistência salvos com sucesso!");
  };

  const updateCompany = (field: keyof CompanyInfo, value: string) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
    setSavedCompany(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Configurações</h2>

      {/* Company Info */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Dados da Assistência Técnica</h3>
            <p className="text-sm text-muted-foreground">
              Estas informações aparecem no cabeçalho do PDF da Ordem de Serviço.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Nome da assistência</label>
            <input className={inputClass} value={company.name} onChange={(e) => updateCompany("name", e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>CNPJ</label>
            <input className={inputClass} placeholder="00.000.000/0000-00" value={company.cnpj} onChange={(e) => updateCompany("cnpj", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Endereço completo</label>
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

      {/* Responsibility Term */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Termo de Responsabilidade</h3>
            <p className="text-sm text-muted-foreground">
              Edite o texto que aparece na OS e no PDF de retirada do equipamento.
            </p>
          </div>
        </div>

        <textarea
          className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 min-h-[320px] leading-relaxed font-mono"
          value={term}
          onChange={(e) => { setTerm(e.target.value); setSavedTerm(false); }}
        />

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => { setTerm(DEFAULT_RESPONSIBILITY_TERM); setSavedTerm(false); }} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar padrão
          </Button>
          <Button onClick={handleSaveTerm} disabled={savedTerm} className="gap-2">
            <Save className="h-4 w-4" />
            {savedTerm ? "Salvo" : "Salvar alterações"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
