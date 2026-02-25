import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wrench,
  Package,
  Shield,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Wallet,
  FileText,
} from "lucide-react";
import { useAuth } from "@/auth/AuthProvider";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/clientes", icon: Users, label: "Clientes" },
  { path: "/orcamentos", icon: FileText, label: "Orçamentos" },
  { path: "/ordens", icon: Wrench, label: "Ordens de Serviço" },
  { path: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { path: "/caixa", icon: Wallet, label: "Caixa" },
  { path: "/estoque", icon: Package, label: "Estoque" },
  { path: "/garantias", icon: Shield, label: "Garantias" },
  { path: "/relatorios", icon: BarChart3, label: "Relatórios" },
  { path: "/comunicacao", icon: MessageSquare, label: "Comunicação" },
  { path: "/configuracoes", icon: Settings, label: "Configurações" },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isMaster } = useAuth();
  const finalNavItems = isMaster ? [...navItems, { path: "/master", icon: Settings, label: "Painel Master" }] : navItems;

  return (
    <aside
      className={`gradient-sidebar flex flex-col border-r border-sidebar-border shadow-[0_0_24px_rgba(15,23,42,0.12)] transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border/70 px-4">
        <img src="/logo.svg" alt="ShieldOS" className="h-9 w-9 rounded-lg border border-sidebar-border/60 bg-white/5 p-1" />
        {!collapsed && <span className="text-[27px] font-semibold tracking-tight text-sidebar-accent-foreground">ShieldOS</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {finalNavItems.map((item) => {
          const isActive = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "bg-sidebar-accent text-white shadow-sm ring-1 ring-white/10"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#7ECAD3]" />}
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border/70 p-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
