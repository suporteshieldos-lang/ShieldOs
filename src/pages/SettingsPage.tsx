import { useState } from "react";
import { Save, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore, DEFAULT_RESPONSIBILITY_TERM } from "@/store/appStore";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { responsibilityTerm, setResponsibilityTerm } = useAppStore();
  const [term, setTerm] = useState(responsibilityTerm);
  const [saved, setSaved] = useState(true);

  const handleSave = () => {
    setResponsibilityTerm(term);
    setSaved(true);
    toast.success("Termo de responsabilidade salvo com sucesso!");
  };

  const handleReset = () => {
    setTerm(DEFAULT_RESPONSIBILITY_TERM);
    setSaved(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold text-foreground">Configurações</h2>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
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
          onChange={(e) => { setTerm(e.target.value); setSaved(false); }}
        />

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar padrão
          </Button>
          <Button onClick={handleSave} disabled={saved} className="gap-2">
            <Save className="h-4 w-4" />
            {saved ? "Salvo" : "Salvar alterações"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
