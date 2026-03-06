import { Bell, LogOut, Search, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/clientes": "Clientes",
  "/clientes/novo": "Novo Cliente",
  "/orcamentos": "Or\u00e7amentos",
  "/ordens": "Ordens de Servi\u00e7o",
  "/ordens/nova": "Nova Ordem de Servi\u00e7o",
  "/estoque": "Estoque e Pe\u00e7as",
  "/estoque/nova": "Nova Pe\u00e7a",
  "/financeiro": "Financeiro",
  "/caixa": "Caixa",
  "/garantias": "Garantias",
  "/relatorios": "Relat\u00f3rios",
  "/comunicacao": "Comunica\u00e7\u00e3o",
  "/configuracoes": "Configura\u00e7\u00f5es",
  "/master": "Painel Master",
};

export default function AppHeader() {
  const location = useLocation();
  const { session, signOut } = useAuth();
  const title = pageTitles[location.pathname] || "ShieldOS";

  return (
    <header className="flex h-[74px] items-center justify-between border-b border-[#DCE6F2]/80 bg-white/85 px-5 backdrop-blur-md lg:px-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">{title}</h1>
        <p className="text-xs font-medium text-[#64748B]">Painel operacional ShieldOS</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8EA6]" />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-10 w-72 rounded-2xl border border-[#DCE5EF] bg-white pl-9 pr-4 text-sm text-[#0F172A] placeholder:text-[#7B8EA6] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all focus:border-[#9AB2CB] focus:outline-none focus:ring-4 focus:ring-[#1F3A5F]/10"
          />
        </div>

        <button className="relative rounded-2xl border border-[#E3EBF5] bg-white p-2.5 text-[#64748B] shadow-sm transition-colors hover:text-[#0F172A]">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#2F5D8A]" />
        </button>

        <div className="flex items-center gap-2 rounded-2xl border border-[#E5ECF4] bg-white px-3 py-1.5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1F3A5F] to-[#2B6B8D] text-white">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden max-w-[180px] truncate text-sm font-medium text-[#0F172A] md:block">
            {session?.user?.email || "T\u00e9cnico"}
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
