import { Bell, Search, User, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/clientes": "Clientes",
  "/clientes/novo": "Novo Cliente",
  "/orcamentos": "Orçamentos",
  "/ordens": "Ordens de Serviço",
  "/ordens/nova": "Nova Ordem de Serviço",
  "/estoque": "Estoque e Peças",
  "/estoque/nova": "Nova Peça",
  "/financeiro": "Financeiro",
  "/caixa": "Caixa",
  "/garantias": "Garantias",
  "/relatorios": "Relatórios",
  "/comunicacao": "Comunicação",
  "/configuracoes": "Configurações",
  "/master": "Painel Master",
};

export default function AppHeader() {
  const location = useLocation();
  const { session, signOut } = useAuth();
  const title = pageTitles[location.pathname] || "ShieldOS";

  return (
    <header className="flex h-16 items-center justify-between border-b border-[#E7EEF6] bg-[#F7FAFC] px-6">
      <h1 className="text-[30px] font-bold tracking-tight text-[#0F172A]">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8EA6]" />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-9 w-64 rounded-xl border border-[#DCE5EF] bg-[#F8FBFF] pl-9 pr-4 text-sm text-[#0F172A] placeholder:text-[#7B8EA6] transition-colors focus:border-[#9AB2CB] focus:outline-none"
          />
        </div>

        <button className="relative rounded-xl p-2 text-[#64748B] transition-colors hover:bg-white hover:text-[#0F172A]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#2F5D8A]" />
        </button>

        <div className="flex items-center gap-2 rounded-xl border border-[#E5ECF4] bg-white px-3 py-1.5 shadow-sm">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1F3A5F] text-white">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden max-w-[180px] truncate text-sm font-medium text-[#0F172A] md:block">
            {session?.user?.email || "Técnico"}
          </span>
          <button
            onClick={() => void signOut()}
            className="rounded-lg p-1 text-[#64748B] transition-colors hover:bg-[#F4F7FB] hover:text-[#0F172A]"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
