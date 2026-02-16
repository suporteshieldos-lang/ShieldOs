import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";

const titles: Record<string, string> = {
  "/checklists": "Checklists Técnicos",
  "/garantias": "Garantias",
  "/relatorios": "Relatórios",
  "/comunicacao": "Comunicação",
  "/configuracoes": "Configurações",
};

export default function Placeholder() {
  const location = useLocation();
  const title = titles[location.pathname] || "Módulo";

  return (
    <div className="flex h-full items-center justify-center animate-fade-in">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Construction className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Este módulo será implementado em breve.
        </p>
      </div>
    </div>
  );
}
