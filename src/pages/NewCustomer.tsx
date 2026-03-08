import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/appStore";
import { createId } from "@/lib/id";
import { toast } from "sonner";

export default function NewCustomer() {
  const navigate = useNavigate();
  const { addCustomer } = useAppStore();
  const [form, setForm] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
  });

  const inputClass =
    "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20";
  const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

  const handleSave = () => {
    if (!form.name || !form.phone) {
      toast.error("Preencha nome e telefone.");
      return;
    }
    addCustomer({
      id: createId(),
      name: form.name,
      cpf: form.cpf,
      phone: form.phone,
      email: form.email,
      createdAt: new Date().toLocaleDateString("pt-BR"),
    });
    toast.success("Cliente cadastrado.");
    navigate("/clientes");
  };

  return (
    <div className="premium-page mx-auto max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clientes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold text-foreground">Novo Cliente</h2>
      </div>

      <div className="premium-block p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nome *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>CPF</label>
            <input
              className={inputClass}
              value={form.cpf}
              onChange={(e) => setForm((prev) => ({ ...prev, cpf: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone *</label>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>E-mail</label>
            <input
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button className="gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Salvar cliente
          </Button>
        </div>
      </div>
    </div>
  );
}
