import { Bell, LogOut, Menu, User } from "lucide-react";
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
  const isServiceOrdersPage = location.pathname.startsWith("/ordens");
  const isCustomersPage = location.pathname.startsWith("/clientes");
  const hideGlobalSearch = isServiceOrdersPage || isCustomersPage;
  const showHeaderTitle = !isCustomersPage;
  const headerClass = isCustomersPage
    ? "sticky top-0 z-30 flex min-h-[78px] items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-3 sm:px-6"
    : "sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E5E7EB] bg-white px-4 sm:px-6";

  return (
    <header className={headerClass}>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] text-slate-700 lg:hidden"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {showHeaderTitle ? <h1 className="truncate text-2xl font-semibold text-[#0F172A]">{title}</h1> : null}
        {isCustomersPage ? (
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-[#0F172A]">Clientes</h1>
            <p className="truncate text-sm text-[#64748B]">Gerencie clientes e histórico de ordens de serviço</p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {!hideGlobalSearch ? (
          <div className="relative hidden xl:block">
            <input
              type="text"
              placeholder="Buscar..."
              className="h-10 w-72 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] px-4 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-[#60A5FA] focus:outline-none focus:ring-2 focus:ring-[#60A5FA]/30"
              aria-label="Buscar"
            />
          </div>
        ) : null}

        <button
          type="button"
          className="relative rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-2.5 text-slate-700 transition-all duration-200 hover:bg-slate-100"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#6EC1D6]" />
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] px-2.5 py-1.5 shadow-sm sm:px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-white">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden max-w-[180px] truncate text-sm font-medium text-[#0F172A] md:block">
            {session?.user?.email || "Técnico"}
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-md p-1 text-slate-700 transition-all duration-200 hover:bg-slate-200"
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
