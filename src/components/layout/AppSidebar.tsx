import { NavLink, useLocation } from "react-router-dom";
import { Settings } from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { type NavItem, isNavItemActive, navItems } from "./navigation";

type AppSidebarProps = {
  mobile?: boolean;
  className?: string;
  onNavigate?: () => void;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export default function AppSidebar({ mobile = false, className, onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const { isMaster } = useAuth();
  const finalNavItems = isMaster ? [...navItems, { path: "/master", icon: Settings, label: "Painel Master" }] : navItems;

  const groupedNav: NavGroup[] = [
    { title: "Gestao", items: finalNavItems.filter((item) => ["/", "/clientes", "/ordens", "/orcamentos"].includes(item.path)) },
    { title: "Financeiro", items: finalNavItems.filter((item) => ["/financeiro", "/caixa"].includes(item.path)) },
    { title: "Operacao", items: finalNavItems.filter((item) => ["/estoque", "/garantias"].includes(item.path)) },
    { title: "Analise", items: finalNavItems.filter((item) => ["/relatorios"].includes(item.path)) },
    { title: "Sistema", items: finalNavItems.filter((item) => ["/comunicacao", "/configuracoes", "/master"].includes(item.path)) },
  ].filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "z-40 flex h-screen w-[248px] flex-col bg-[#0F172A]",
        mobile ? "h-full border-r-0 shadow-none" : "fixed left-0 top-0 border-r border-[#1E293B] shadow-[0_20px_60px_rgba(2,6,23,0.25)]",
        className
      )}
      aria-label="Navegacao principal"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.2),transparent_46%)]" />

      <div className="relative flex h-[74px] items-center gap-3 border-b border-[#1E293B] px-4">
        <img src="/logo.svg" alt="ShieldOS" className="h-10 w-10 rounded-xl border border-white/15 bg-white/10 p-1.5" />
        <span className="text-[30px] font-semibold tracking-tight text-white">ShieldOS</span>
      </div>

      <nav className="relative flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {groupedNav.map((group) => (
          <section key={group.title}>
            <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">{group.title}</p>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const isActive = isNavItemActive(location.pathname, item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onNavigate}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-white text-[#0F172A] shadow-[0_8px_20px_rgba(15,23,42,0.25)]"
                        : "text-white hover:bg-[#1E293B] hover:text-white"
                    }`}
                  >
                    {isActive ? <span className="absolute -left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#2563EB]" /> : null}
                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "opacity-100 text-[#2563EB]" : "opacity-80"}`} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="relative border-t border-[#1E293B] p-3">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-medium text-white">Navegacao principal</div>
      </div>
    </aside>
  );
}
