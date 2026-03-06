import { NavLink, useLocation } from "react-router-dom";
import {
  BarChart3,
  DollarSign,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Shield,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/clientes", icon: Users, label: "Clientes" },
  { path: "/orcamentos", icon: FileText, label: "Or\u00e7amentos" },
  { path: "/ordens", icon: Wrench, label: "Ordens de Servi\u00e7o" },
  { path: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { path: "/caixa", icon: Wallet, label: "Caixa" },
  { path: "/estoque", icon: Package, label: "Estoque" },
  { path: "/garantias", icon: Shield, label: "Garantias" },
  { path: "/relatorios", icon: BarChart3, label: "Relat\u00f3rios" },
  { path: "/comunicacao", icon: MessageSquare, label: "Comunica\u00e7\u00e3o" },
  { path: "/configuracoes", icon: Settings, label: "Configura\u00e7\u00f5es" },
];

export default function AppSidebar() {
  const location = useLocation();
  const { isMaster } = useAuth();
  const finalNavItems = isMaster ? [...navItems, { path: "/master", icon: Settings, label: "Painel Master" }] : navItems;

  return (
    <aside className="gradient-sidebar fixed left-0 top-0 z-40 flex h-screen w-[248px] flex-col border-r border-sidebar-border/60 shadow-[0_20px_60px_rgba(2,6,23,0.25)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(124,211,255,0.22),transparent_46%)]" />

      <div className="relative flex h-[74px] items-center gap-3 border-b border-sidebar-border/40 px-4">
        <img src="/logo.svg" alt="ShieldOS" className="h-10 w-10 rounded-xl border border-white/15 bg-white/10 p-1.5" />
        <span className="text-[30px] font-semibold tracking-tight text-sidebar-accent-foreground">ShieldOS</span>
      </div>

      <nav className="relative flex flex-1 flex-col gap-1.5 px-3 py-3">
        {finalNavItems.map((item) => {
          const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2 text-[13px] font-medium transition-all ${
                isActive
                  ? "bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
                  : "text-sidebar-foreground hover:bg-white/8 hover:text-sidebar-accent-foreground"
              }`}
            >
              {isActive && <span className="absolute -left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-[#7ECAD3]" />}
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="relative border-t border-sidebar-border/40 p-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-medium text-sidebar-foreground">
          Navegação principal
        </div>
      </div>
    </aside>
  );
}
