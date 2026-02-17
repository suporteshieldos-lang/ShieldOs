import { Bell, Search, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import logo from "@/assets/logo.jpeg";


const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/clientes": "Clientes",
  "/ordens": "Ordens de Serviço",
  "/ordens/nova": "Nova Ordem de Serviço",
  "/checklists": "Checklists Técnicos",
  "/estoque": "Estoque & Peças",
  "/garantias": "Garantias",
  "/relatorios": "Relatórios",
  "/comunicacao": "Comunicação",
  "/configuracoes": "Configurações",
};

export default function AppHeader() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "ShieldOS";

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
  <img
    src={logo}
    alt="ShieldOS"
    className="h-8 w-auto object-contain"
  />
  <h1 className="text-xl font-semibold text-foreground">{title}</h1>
</div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-medium text-foreground md:block">Técnico</span>
        </div>
      </div>
    </header>
  );
}
