import { Bell, LogOut, Menu, Search, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { getPageTitle } from "./navigation";

type AppHeaderProps = {
  onMenuClick?: () => void;
};

export default function AppHeader({ onMenuClick }: AppHeaderProps) {
  const location = useLocation();
  const { session, signOut } = useAuth();
  const title = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-[#DCE6F2]/80 bg-white/85 px-4 backdrop-blur-md sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl border border-[#E3EBF5] bg-white text-[#64748B] lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-[#0F172A] sm:text-[28px]">{title}</h1>
          <p className="hidden text-xs font-medium text-[#64748B] sm:block">Painel operacional ShieldOS</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden xl:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7B8EA6]" />
          <input
            type="text"
            placeholder="Buscar..."
            className="h-10 w-72 rounded-2xl border border-[#DCE5EF] bg-white pl-9 pr-4 text-sm text-[#0F172A] placeholder:text-[#7B8EA6] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-all focus:border-[#9AB2CB] focus:outline-none focus:ring-4 focus:ring-[#1F3A5F]/10"
            aria-label="Buscar"
          />
        </div>

        <button
          type="button"
          className="relative rounded-2xl border border-[#E3EBF5] bg-white p-2.5 text-[#64748B] shadow-sm transition-colors hover:text-[#0F172A]"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#2F5D8A]" />
        </button>

        <div className="flex items-center gap-2 rounded-2xl border border-[#E5ECF4] bg-white px-2.5 py-1.5 shadow-sm sm:px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1F3A5F] to-[#2B6B8D] text-white">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden max-w-[180px] truncate text-sm font-medium text-[#0F172A] md:block">
            {session?.user?.email || "Técnico"}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-lg p-1 text-[#64748B] transition-colors hover:bg-[#F4F7FB] hover:text-[#0F172A]"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
